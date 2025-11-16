import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Student, Plan, Payment, Workout, StudentFile, ProgressPhoto, Trainer, PhysicalAssessment } from '../../types';
import { UserIcon, LogoutIcon, CheckCircleIcon, ExclamationCircleIcon, InstagramIcon, WhatsAppIcon, FileTextIcon, ImageIcon, UploadCloudIcon, CameraIcon, DumbbellIcon, HomeIcon, ChartBarIcon, DollarSignIcon, XIcon } from '../icons';
import { db, storage } from '../../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from '@firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import StudentWorkoutView from './WorkoutPortal';
import { STUDENT_PORTAL_VIEW_KEY } from '../../constants';

// FIX: Declare Chart on the global window object to resolve TypeScript errors where Chart.js is used from a script tag.
declare global {
  interface Window {
    Chart: any;
  }
}

interface StudentPortalProps {
    studentData: {
        student: Student;
        payments: Payment[];
        trainer: Trainer | null;
    };
    plans: Plan[];
    onLogout: () => void;
}

type PortalView = 'dashboard' | 'workouts' | 'assessments' | 'progress' | 'financial' | 'files';

const StudentPortal: React.FC<StudentPortalProps> = ({ studentData, plans, onLogout }) => {
    const { student, payments, trainer } = studentData;
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [studentFiles, setStudentFiles] = useState<StudentFile[]>([]);
    const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
    const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [view, setView] = useState<PortalView>(() => {
        const savedView = sessionStorage.getItem(STUDENT_PORTAL_VIEW_KEY);
        const validViews: PortalView[] = ['dashboard', 'workouts', 'assessments', 'progress', 'financial', 'files'];
        if (savedView && validViews.includes(savedView as PortalView)) {
            return savedView as PortalView;
        }
        return 'dashboard';
    });
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        sessionStorage.setItem(STUDENT_PORTAL_VIEW_KEY, view);
    }, [view]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const toISO = (ts: any) => ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString();
        try {
            const queries = [
                getDocs(query(collection(db, 'workouts'), where("studentId", "==", student.id), orderBy("createdAt", "desc"))),
                getDocs(query(collection(db, 'studentFiles'), where("studentId", "==", student.id), orderBy("uploadedAt", "desc"))),
                getDocs(query(collection(db, 'progressPhotos'), where("studentId", "==", student.id), orderBy("uploadedAt", "desc"))),
                getDocs(query(collection(db, 'physicalAssessments'), where("studentId", "==", student.id), orderBy("date", "desc"))),
            ];
            const [workoutsSnap, filesSnap, photosSnap, assessmentsSnap] = await Promise.all(queries);
            
            setWorkouts(workoutsSnap.docs.map(d => ({ ...d.data(), id: d.id, createdAt: toISO(d.data().createdAt) } as Workout)));
            setStudentFiles(filesSnap.docs.map(d => ({ ...d.data(), id: d.id, uploadedAt: toISO(d.data().uploadedAt) } as StudentFile)));
            setProgressPhotos(photosSnap.docs.map(d => ({ ...d.data(), id: d.id, uploadedAt: toISO(d.data().uploadedAt) } as ProgressPhoto)));
            setAssessments(assessmentsSnap.docs.map(d => ({...d.data(), id: d.id, date: toISO(d.data().date) } as PhysicalAssessment)));

        } catch (err: any) {
            console.error("Firebase Connection Error Details:", err);
            if (err.code === 'failed-precondition') {
                setError("INDEX_ERROR");
            } else {
                setError("CONNECTION_ERROR");
            }
        } finally {
            setIsLoading(false);
        }
    }, [student.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpdateWorkout = (updatedWorkout: Workout) => {
        setWorkouts(prevWorkouts =>
            prevWorkouts.map(w => w.id === updatedWorkout.id ? updatedWorkout : w)
        );
    };

    const studentPlan = plans.find(p => p.id === student.planId);
    const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
    
    const getStatusInfo = () => {
        if (!studentPlan) return { text: 'Aluno sem plano ativo', Icon: ExclamationCircleIcon, color: 'text-red-600', isActive: false };
        if (studentPlan.type === 'duration') {
            if (!student.paymentDueDate) return { text: 'Status do plano não definido', Icon: ExclamationCircleIcon, color: 'text-yellow-600', isActive: true };
            const isExpired = new Date(student.paymentDueDate) < new Date();
            return { text: `Seu plano vence em ${formatDate(student.paymentDueDate)}`, Icon: isExpired ? ExclamationCircleIcon : CheckCircleIcon, color: isExpired ? 'text-red-600' : 'text-green-600', isActive: !isExpired };
        }
        if (studentPlan.type === 'session') {
            const remaining = student.remainingSessions;
            if (remaining == null || isNaN(remaining)) return { text: "Contagem de aulas não iniciada", Icon: CheckCircleIcon, color: 'text-yellow-600', isActive: true };
            const isDepleted = remaining <= 0;
            let statusText = '';
            if (remaining < 0) statusText = `Você deve ${Math.abs(remaining)} aula${Math.abs(remaining) !== 1 ? 's' : ''}`;
            else if (remaining === 0) statusText = 'Você não tem mais aulas restantes';
            else statusText = `Você tem ${remaining} aula${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`;
            return { text: statusText, Icon: isDepleted ? ExclamationCircleIcon : CheckCircleIcon, color: isDepleted ? 'text-red-600' : 'text-green-600', isActive: !isDepleted };
        }
        return { text: 'Status indisponível', Icon: ExclamationCircleIcon, color: 'text-gray-600', isActive: false };
    };

    const status = getStatusInfo();
    const isPlanActive = status.isActive;

    const NavItem: React.FC<{ view: PortalView, label: string, Icon: React.FC<{className?: string}> }> = ({ view: viewName, label, Icon }) => {
        const handleNavClick = () => {
            setView(viewName);
            setIsSidebarOpen(false);
        };
        return (
            <button onClick={handleNavClick} className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${view === viewName ? 'bg-brand-accent text-white' : 'text-gray-300 hover:bg-brand-secondary hover:text-white'}`}>
                <Icon className="w-6 h-6"/>
                <span className="font-semibold">{label}</span>
            </button>
        );
    };

    const renderContent = () => {
        if (isLoading) return <div className="text-center p-8">Carregando...</div>;
        
        if (error) {
            return (
                <div className="m-4 bg-red-50 border border-red-200 p-6 rounded-lg shadow-sm">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <ExclamationCircleIcon className="h-8 w-8 text-red-500" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-bold text-red-800">Erro ao Carregar Dados</h3>
                      <div className="mt-2 text-sm text-red-700 space-y-4">
                        <p>A aplicação não conseguiu carregar os dados do aluno. A causa mais provável é uma configuração pendente no banco de dados.</p>
                        {error === 'INDEX_ERROR' ? (
                          <>
                            <p><strong>Causa Provável:</strong> O banco de dados (Firestore) precisa de um "índice" para realizar esta consulta. A mensagem de erro completa no console do navegador contém um link para criar este índice automaticamente.</p>
                            <div className="p-3 bg-red-100 rounded-md border border-red-300">
                                <h4 className="font-bold text-red-900">Como Resolver (para o Personal Trainer):</h4>
                                <ol className="list-decimal list-inside space-y-1 mt-1 text-red-800">
                                    <li>Abra o Console do Desenvolvedor no navegador (geralmente com a tecla <strong>F12</strong>).</li>
                                    <li>Procure por uma mensagem de erro em vermelho no "Console".</li>
                                    <li>Essa mensagem terá um <strong>link longo</strong>. Clique nesse link.</li>
                                    <li>Uma página do Firebase abrirá para criar o índice. Apenas clique em <strong>"Criar"</strong>.</li>
                                    <li>Aguarde alguns minutos para a criação do índice e depois recarregue a página.</li>
                                </ol>
                            </div>
                          </>
                        ) : (
                          <p>Verifique o console do navegador (F12) para ver os detalhes técnicos do erro e garantir que as configurações do Firebase estão corretas.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
            );
        }

        switch(view) {
            case 'workouts': return <StudentWorkoutView workouts={workouts} onBack={() => {}} isPlanActive={isPlanActive} onWorkoutUpdate={handleUpdateWorkout} student={student} trainer={trainer} />;
            case 'assessments': return <AssessmentsContent assessments={assessments} />;
            case 'progress': return <ProgressContent photos={progressPhotos} student={student} onUpdate={fetchData} />;
            case 'financial': return <FinancialContent payments={payments} />;
            case 'files': return <FilesContent files={studentFiles} student={student} onUpdate={fetchData} />;
            case 'dashboard':
            default: return <DashboardContent setView={setView} status={status} workoutsCount={workouts.length} lastPhoto={progressPhotos[0]} trainer={trainer} student={student} />;
        }
    };
    
    return (
      <div className="flex h-screen bg-brand-light font-sans text-brand-dark">
          {/* Overlay for mobile */}
          <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />
          
          <aside className={`fixed inset-y-0 left-0 w-64 bg-brand-dark text-white flex flex-col p-4 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:flex-shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
              <div className="flex items-center justify-center p-4 border-b border-gray-700">
                  {trainer?.logoUrl ? <img src={trainer.logoUrl} alt="Logo" className="h-12 w-auto" /> : <h1 className="text-xl font-bold text-white">Portal do Aluno</h1>}
              </div>
              <nav className="flex-grow space-y-2 mt-6">
                  <NavItem view="dashboard" label="Início" Icon={HomeIcon} />
                  <NavItem view="workouts" label="Meus Treinos" Icon={DumbbellIcon} />
                  <NavItem view="assessments" label="Avaliações" Icon={ChartBarIcon} />
                  <NavItem view="progress" label="Progresso" Icon={ImageIcon} />
                  <NavItem view="financial" label="Financeiro" Icon={DollarSignIcon} />
                  <NavItem view="files" label="Arquivos" Icon={FileTextIcon} />
              </nav>
          </aside>

          <div className="flex-1 flex flex-col overflow-hidden">
              <header className="bg-white shadow-sm z-20">
                  <div className="container mx-auto px-6 py-3 flex justify-between items-center">
                      <button onClick={() => setIsSidebarOpen(true)} className="p-1 text-brand-dark lg:hidden" aria-label="Abrir menu">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                      </button>
                      <div className="lg:hidden"></div> {/* Spacer */}
                      <div className="flex items-center gap-4">
                          <span className="font-semibold">{student.name}</span>
                          {student.profilePictureUrl ? <img src={student.profilePictureUrl} alt="Perfil" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><UserIcon className="w-6 h-6 text-gray-500"/></div>}
                          <button onClick={onLogout} title="Sair" className="p-2 rounded-full text-gray-500 hover:bg-gray-100"><LogoutIcon className="w-6 h-6" /></button>
                      </div>
                  </div>
              </header>
              <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
                  {renderContent()}
              </main>
          </div>
      </div>
    );
};

// --- Sub-components for each view ---

const DashboardContent: React.FC<{setView: (v: PortalView) => void, status: any, workoutsCount: number, lastPhoto: ProgressPhoto | undefined, trainer: Trainer | null, student: Student}> = ({setView, status, workoutsCount, lastPhoto, trainer, student}) => (
    <div className="space-y-8">
        <div>
            {/* FIX: Changed studentData.student.name to student.name as studentData is not in scope, but the student object is passed as a prop. */}
            <h2 className="text-3xl font-bold text-brand-dark">Olá, {student.name}!</h2>
            <p className="text-gray-600">Bem-vindo(a) de volta ao seu painel.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-between"><h3 className="font-bold text-lg text-brand-dark mb-2">Meu Plano</h3><div className="bg-gray-50 p-4 rounded-md"><div className={`flex items-center gap-2 font-semibold ${status.color}`}><status.Icon className="w-5 h-5" /><span>{status.text}</span></div></div></div>
            <button onClick={() => setView('workouts')} className="bg-white p-6 rounded-lg shadow-md text-left hover:shadow-lg transition-shadow"><h3 className="font-bold text-lg text-brand-dark mb-2">Fichas de Treino</h3><p className="text-3xl font-extrabold text-brand-primary">{workoutsCount}</p><p className="text-sm text-gray-500">planilhas disponíveis</p></button>
            {lastPhoto ? <button onClick={() => setView('progress')} className="bg-white p-6 rounded-lg shadow-md text-left hover:shadow-lg transition-shadow"><h3 className="font-bold text-lg text-brand-dark mb-2">Último Progresso</h3><img src={lastPhoto.photoUrl} alt="progresso" className="w-full h-24 object-cover rounded-md mt-2" /><p className="text-xs text-gray-500 mt-1">Enviado em {new Date(lastPhoto.uploadedAt).toLocaleDateString('pt-BR')}</p></button> : <div className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-center text-center"><h3 className="font-bold text-lg text-brand-dark mb-2">Meu Progresso</h3><p className="text-gray-500 text-sm">Nenhuma foto enviada ainda. Envie uma para começar a acompanhar!</p></div>}
        </div>
        {trainer && (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-brand-dark mb-4">Fale com seu Personal</h3>
                <div className="flex flex-wrap items-center gap-4">
                    <p className="font-semibold text-lg">{trainer.fullName || trainer.username}</p>
                    {trainer.whatsapp && <a href={`https://wa.me/${trainer.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full hover:bg-green-200 font-semibold"><WhatsAppIcon className="w-5 h-5"/> WhatsApp</a>}
                    {trainer.instagram && <a href={`https://instagram.com/${trainer.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-800 rounded-full hover:bg-pink-200 font-semibold"><InstagramIcon className="w-5 h-5"/> Instagram</a>}
                </div>
            </div>
        )}
    </div>
);

const AssessmentsContent: React.FC<{assessments: PhysicalAssessment[]}> = ({ assessments }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any | null>(null);
    const chartData = useMemo(() => {
        const sorted = [...assessments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return {
            labels: sorted.map(a => new Date(a.date).toLocaleDateString('pt-BR')),
            weight: sorted.map(a => a.weightKg),
            bodyFat: sorted.map(a => a.bodyFatPercentage),
        };
    }, [assessments]);

    useEffect(() => {
        if (chartRef.current && chartData.labels.length > 0 && typeof window.Chart !== 'undefined') {
            if (chartInstance.current) chartInstance.current.destroy();
            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                chartInstance.current = new window.Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: chartData.labels,
                        datasets: [
                            { label: 'Peso (kg)', data: chartData.weight, borderColor: 'rgb(75, 192, 192)', tension: 0.1, yAxisID: 'y' },
                            { label: '% Gordura Corporal', data: chartData.bodyFat, borderColor: 'rgb(255, 99, 132)', tension: 0.1, yAxisID: 'y1' }
                        ]
                    },
                    options: { responsive: true, scales: { y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Peso (kg)' } }, y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: '% Gordura' } } } }
                });
            }
        }
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [chartData]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            <h2 className="text-2xl font-bold text-brand-dark border-b pb-4">Minhas Avaliações Físicas</h2>
            <div>
                <h3 className="font-bold text-lg mb-2">Evolução Corporal</h3>
                {assessments.length > 1 ? <canvas ref={chartRef}></canvas> : <p className="text-center text-gray-500 p-8 bg-gray-50 rounded-md">Adicione pelo menos duas avaliações para ver o gráfico de progresso.</p>}
            </div>
            <div>
                <h3 className="font-bold text-lg mb-2">Histórico Detalhado</h3>
                <div className="border rounded-lg max-h-96 overflow-y-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-100 sticky top-0"><tr><th className="p-2">Data</th><th className="p-2">Peso</th><th className="p-2">Gordura %</th><th className="p-2">Peito</th><th className="p-2">Cintura</th><th className="p-2">Quadril</th></tr></thead><tbody>
                {assessments.map(a => (<tr key={a.id} className="border-b"><td className="p-2 font-semibold">{new Date(a.date).toLocaleDateString('pt-BR')}</td><td className="p-2">{a.weightKg || '-'} kg</td><td className="p-2">{a.bodyFatPercentage || '-'} %</td><td className="p-2">{a.chest || '-'} cm</td><td className="p-2">{a.waist || '-'} cm</td><td className="p-2">{a.hips || '-'} cm</td></tr>))}
                </tbody></table></div>
            </div>
        </div>
    );
};

const ProgressContent: React.FC<{photos: ProgressPhoto[], student: Student, onUpdate: () => void}> = ({ photos, student, onUpdate }) => {
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoNotes, setPhotoNotes] = useState('');

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingPhoto(true);
        try {
            const storageRef = ref(storage, `progress_photos/${student.id}/${Date.now()}-${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const photoUrl = await getDownloadURL(snapshot.ref);
            await addDoc(collection(db, 'progressPhotos'), { studentId: student.id, trainerId: student.trainerId, photoUrl, studentNotes: photoNotes, uploadedAt: Timestamp.now() });
            setPhotoNotes('');
            onUpdate();
        } catch (error: any) { alert(`Erro ao enviar foto: ${error.message}`); }
        finally { setUploadingPhoto(false); if (e.target) e.target.value = ''; }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            <h2 className="text-2xl font-bold text-brand-dark border-b pb-4">Meu Progresso</h2>
            <div className="p-4 border rounded-md bg-gray-50">
                <textarea value={photoNotes} onChange={e => setPhotoNotes(e.target.value)} placeholder="Adicionar uma nota sobre a foto (opcional)" className="w-full text-sm border-gray-300 rounded-md" rows={2}></textarea>
                <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} className="w-full mt-2 flex items-center justify-center gap-2 p-2 bg-brand-primary text-white rounded-md hover:bg-brand-accent disabled:bg-gray-400"><CameraIcon className="w-5 h-5"/>{uploadingPhoto ? "Enviando..." : "Enviar Foto de Progresso"}</button>
                <input type="file" accept="image/*" ref={photoInputRef} onChange={handlePhotoUpload} className="hidden" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {photos.map(p => (<div key={p.id} className="border rounded-lg overflow-hidden"><img src={p.photoUrl} className="w-full h-48 object-cover" alt="foto de progresso"/><div className="p-3"><p className="text-xs text-gray-500">{new Date(p.uploadedAt).toLocaleString('pt-BR')}</p>{p.studentNotes && <p className="text-sm mt-1 italic">"{p.studentNotes}"</p>}{p.trainerFeedback && <div className="mt-2 bg-green-50 p-2 rounded-md"><p className="text-sm font-semibold text-green-800">Feedback do Personal:</p><p className="text-sm text-green-700">{p.trainerFeedback}</p></div>}</div></div>))}
            </div>
        </div>
    );
};

const FinancialContent: React.FC<{payments: Payment[]}> = ({ payments }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-brand-dark border-b pb-4 mb-4">Meus Pagamentos</h2>
        <div className="max-h-96 overflow-y-auto pr-2">{payments.length > 0 ? <ul className="divide-y">{payments.map(p => <li key={p.id} className="py-3 flex justify-between"><div><p className="font-semibold">{p.planName}</p><p className="text-sm text-gray-500">{new Date(p.paymentDate).toLocaleDateString('pt-BR')}</p></div><span className="font-bold text-lg text-green-600">R$ {p.amount.toFixed(2)}</span></li>)}</ul> : <p className="text-center text-gray-500 p-8">Nenhum pagamento registrado.</p>}</div>
    </div>
);

const FilesContent: React.FC<{files: StudentFile[], student: Student, onUpdate: () => void}> = ({ files, student, onUpdate }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingFile, setUploadingFile] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingFile(true);
        try {
            const storageRef = ref(storage, `student_files/${student.id}/${Date.now()}-${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const fileUrl = await getDownloadURL(snapshot.ref);
            await addDoc(collection(db, 'studentFiles'), { studentId: student.id, trainerId: student.trainerId, fileName: file.name, fileUrl, uploadedAt: Timestamp.now() });
            onUpdate();
        } catch (error: any) { alert(`Erro ao enviar arquivo: ${error.message}`); }
        finally { setUploadingFile(false); if (e.target) e.target.value = ''; }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            <h2 className="text-2xl font-bold text-brand-dark border-b pb-4">Meus Arquivos</h2>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} className="w-full flex items-center justify-center gap-2 p-3 bg-brand-primary text-white rounded-md hover:bg-brand-accent disabled:bg-gray-400 font-semibold"><UploadCloudIcon className="w-5 h-5"/>{uploadingFile ? "Enviando..." : "Enviar Novo Arquivo"}</button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <div className="border rounded-lg max-h-96 overflow-y-auto"><ul className="divide-y">{files.map(f => <li key={f.id}><a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="block p-3 hover:bg-gray-50 text-brand-dark font-medium truncate">{f.fileName}</a></li>)}</ul></div>
        </div>
    );
};


export default StudentPortal;