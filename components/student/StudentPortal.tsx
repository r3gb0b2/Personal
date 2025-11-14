import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Student, Plan, Payment, Workout, StudentFile, ProgressPhoto, Trainer } from '../../types';
import { UserIcon, LogoutIcon, CalendarIcon, DollarSignIcon, BriefcaseIcon, CheckCircleIcon, ExclamationCircleIcon, InstagramIcon, WhatsAppIcon, LinkIcon, FileTextIcon, ImageIcon, UploadCloudIcon, SendIcon, CameraIcon, DumbbellIcon } from '../icons';
import { db, storage } from '../../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import WorkoutPortal from './WorkoutPortal';
import { STUDENT_PORTAL_VIEW_KEY } from '../../constants';

interface StudentPortalProps {
    studentData: {
        student: Student;
        payments: Payment[];
        trainer: Trainer | null;
    };
    plans: Plan[];
    onLogout: () => void;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ studentData, plans, onLogout }) => {
    const { student, payments, trainer } = studentData;
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [studentFiles, setStudentFiles] = useState<StudentFile[]>([]);
    const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'dashboard' | 'workouts'>(() => {
        const savedView = sessionStorage.getItem(STUDENT_PORTAL_VIEW_KEY);
        // Ensure that only valid values are used from sessionStorage
        if (savedView === 'workouts') {
            return 'workouts';
        }
        return 'dashboard';
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoNotes, setPhotoNotes] = useState('');

    useEffect(() => {
        sessionStorage.setItem(STUDENT_PORTAL_VIEW_KEY, view);
    }, [view]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const toISO = (ts: any) => ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString();
        try {
            const workoutsQuery = query(collection(db, 'workouts'), where("studentId", "==", student.id), orderBy("createdAt", "desc"));
            const workoutsSnapshot = await getDocs(workoutsQuery);
            setWorkouts(workoutsSnapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) } as Workout)));

            const filesQuery = query(collection(db, 'studentFiles'), where("studentId", "==", student.id), orderBy("uploadedAt", "desc"));
            const filesSnapshot = await getDocs(filesQuery);
            setStudentFiles(filesSnapshot.docs.map(d => ({ id: d.id, ...d.data(), uploadedAt: toISO(d.data().uploadedAt) } as StudentFile)));

            const photosQuery = query(collection(db, 'progressPhotos'), where("studentId", "==", student.id), orderBy("uploadedAt", "desc"));
            const photosSnapshot = await getDocs(photosQuery);
            setProgressPhotos(photosSnapshot.docs.map(d => ({ id: d.id, ...d.data(), uploadedAt: toISO(d.data().uploadedAt) } as ProgressPhoto)));
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [student.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingFile(true);
        try {
            const storageRef = ref(storage, `student_files/${student.id}/${Date.now()}-${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const fileUrl = await getDownloadURL(snapshot.ref);
            await addDoc(collection(db, 'studentFiles'), {
                studentId: student.id,
                trainerId: student.trainerId,
                fileName: file.name,
                fileUrl,
                uploadedAt: Timestamp.now(),
            });
            fetchData();
        } catch (error: any) {
            console.error("File upload error:", error);
            alert(`Erro ao enviar arquivo. Verifique suas permissões e conexão. Detalhes: ${error.message}`);
        } finally {
            setUploadingFile(false);
            if (e.target) e.target.value = '';
        }
    };
    
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingPhoto(true);
        try {
            const storageRef = ref(storage, `progress_photos/${student.id}/${Date.now()}-${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const photoUrl = await getDownloadURL(snapshot.ref);
            await addDoc(collection(db, 'progressPhotos'), {
                studentId: student.id,
                trainerId: student.trainerId,
                photoUrl,
                studentNotes: photoNotes,
                uploadedAt: Timestamp.now(),
            });
            setPhotoNotes('');
            fetchData();
        } catch (error: any) {
            console.error("Photo upload error:", error);
            alert(`Erro ao enviar foto. Verifique suas permissões e conexão. Detalhes: ${error.message}`);
        } finally {
            setUploadingPhoto(false);
            if (e.target) e.target.value = '';
        }
    };

    const studentPlan = plans.find(p => p.id === student.planId);
    const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
    
    const getStatusInfo = () => {
        if (!studentPlan) return { text: 'Aluno sem plano ativo', Icon: ExclamationCircleIcon, color: 'text-red-600', isActive: false };
        
        if (studentPlan.type === 'duration') {
            if (!student.paymentDueDate) return { text: 'Status do plano não definido', Icon: ExclamationCircleIcon, color: 'text-yellow-600', isActive: true }; // Allow access even without due date
            const isExpired = new Date(student.paymentDueDate) < new Date();
            return { 
                text: `Seu plano vence em ${formatDate(student.paymentDueDate)}`, 
                Icon: isExpired ? ExclamationCircleIcon : CheckCircleIcon, 
                color: isExpired ? 'text-red-600' : 'text-green-600',
                isActive: !isExpired 
            };
        }
        
        if (studentPlan.type === 'session') {
            const remaining = student.remainingSessions;
             // Grant access if sessions are untracked or data is invalid (NaN)
            if (remaining == null || isNaN(remaining)) {
                return { text: "Contagem de aulas não iniciada", Icon: CheckCircleIcon, color: 'text-yellow-600', isActive: true };
            }

            const isDepleted = remaining <= 0;
            let statusText = '';
            if (remaining < 0) {
                const plural = Math.abs(remaining) > 1;
                statusText = `Você deve ${Math.abs(remaining)} aula${plural ? 's' : ''}`;
            } else if (remaining === 0) {
                statusText = 'Você não tem mais aulas restantes';
            } else {
                const plural = remaining > 1;
                statusText = `Você tem ${remaining} aula${plural ? 's' : ''} restante${plural ? 's' : ''}`;
            }

            return { 
                text: statusText, 
                Icon: isDepleted ? ExclamationCircleIcon : CheckCircleIcon, 
                color: isDepleted ? 'text-red-600' : 'text-green-600',
                isActive: !isDepleted
            };
        }

        return { text: 'Status indisponível', Icon: ExclamationCircleIcon, color: 'text-gray-600', isActive: false };
    };

    const status = getStatusInfo();
    const isPlanActive = status.isActive;
    
    if (view === 'workouts') {
        return <WorkoutPortal workouts={workouts} onBack={() => setView('dashboard')} isPlanActive={isPlanActive} />;
    }

    return (
        <>
            <div className="bg-brand-dark">
                <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Portal do Aluno</h1>
                    <button onClick={onLogout} className="flex items-center gap-2 text-white hover:text-red-400 transition-colors">
                        <LogoutIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Sair</span>
                    </button>
                </header>
            </div>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="mb-8 p-6 bg-white rounded-lg shadow-md flex flex-col sm:flex-row items-center gap-6">
                    {student.profilePictureUrl ? (<img src={student.profilePictureUrl} alt={student.name} className="w-24 h-24 rounded-full object-cover border-4 border-brand-accent"/>) : (<div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-brand-accent"><UserIcon className="w-12 h-12 text-gray-500"/></div>)}
                    <div className="text-center sm:text-left">
                        <h2 className="text-3xl font-bold text-brand-dark">{student.name}</h2>
                        <p className="text-gray-600">{student.email}</p>
                    </div>
                </div>

                 <div className="mb-8">
                    {isPlanActive ? (
                        <button 
                            onClick={() => setView('workouts')} 
                            className="w-full flex items-center justify-center gap-3 py-4 px-6 text-lg font-bold text-white bg-brand-primary rounded-lg shadow-lg hover:bg-brand-accent transition-transform transform hover:scale-105"
                        >
                            <DumbbellIcon className="w-8 h-8"/>
                            Acessar Minha Ficha de Treino
                        </button>
                    ) : (
                        <div className="w-full flex flex-col items-center justify-center text-center gap-2 py-4 px-6 bg-gray-400 rounded-lg shadow-inner cursor-not-allowed">
                            <div className="flex items-center gap-3 text-lg font-bold text-white">
                                <DumbbellIcon className="w-8 h-8"/>
                                <span>Acessar Minha Ficha de Treino</span>
                            </div>
                            <p className="text-sm font-medium text-gray-100">
                                Seu acesso está bloqueado. Motivo: <span className="font-bold">{status.text}</span>.
                            </p>
                            <p className="text-xs text-gray-200">Fale com seu personal para regularizar a situação.</p>
                        </div>
                    )}
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Column 1 */}
                    <div className="space-y-8 lg:col-span-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-bold text-brand-dark mb-4 flex items-center gap-2"><BriefcaseIcon className="w-6 h-6"/> Plano Atual</h3>
                                <div className="bg-gray-50 p-4 rounded-md"><p className="font-semibold text-lg">{studentPlan?.name || 'Nenhum plano'}</p><div className={`flex items-center gap-2 mt-2 font-medium ${status.color}`}><status.Icon className="w-5 h-5" /><span>{status.text}</span></div></div>
                            </div>
                             {trainer && (
                                <div className="bg-white p-6 rounded-lg shadow-md">
                                    <h3 className="text-xl font-bold text-brand-dark mb-4">Fale com seu Personal</h3>
                                    <div className="space-y-3">
                                        <p className="font-semibold text-lg">{trainer.fullName || trainer.username}</p>
                                        <div className="flex flex-col gap-2">
                                            {trainer.whatsapp && <a href={`https://wa.me/${trainer.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200"><WhatsAppIcon className="w-5 h-5"/> WhatsApp</a>}
                                            {trainer.instagram && <a href={`https://instagram.com/${trainer.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-pink-100 text-pink-800 rounded-md hover:bg-pink-200"><InstagramIcon className="w-5 h-5"/> Instagram</a>}
                                            {trainer.contactEmail && <a href={`mailto:${trainer.contactEmail}`} className="flex items-center gap-2 p-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"><UserIcon className="w-5 h-5"/> Email</a>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                             <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-bold text-brand-dark mb-4 flex items-center gap-2"><FileTextIcon className="w-6 h-6"/> Meus Arquivos</h3>
                                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} className="w-full flex items-center justify-center gap-2 p-2 mb-4 bg-brand-primary text-white rounded-md hover:bg-brand-accent disabled:bg-gray-400"><UploadCloudIcon className="w-5 h-5"/>{uploadingFile ? "Enviando..." : "Enviar Arquivo"}</button>
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">{studentFiles.map(f => <a key={f.id} href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="block p-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm truncate">{f.fileName}</a>)}</div>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-bold text-brand-dark mb-4 flex items-center gap-2"><DollarSignIcon className="w-6 h-6"/> Pagamentos</h3>
                                <div className="max-h-80 overflow-y-auto pr-2">{payments.length > 0 ? <ul className="divide-y">{payments.map(p => <li key={p.id} className="py-2 flex justify-between"><span>{formatDate(p.paymentDate)} - {p.planName}</span><span className="font-semibold">R$ {p.amount.toFixed(2)}</span></li>)}</ul> : <p className="text-center text-gray-500">Nenhum pagamento.</p>}</div>
                            </div>
                        </div>
                    </div>
                    {/* Column 2 */}
                    <div className="space-y-8">
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-xl font-bold text-brand-dark mb-4 flex items-center gap-2"><ImageIcon className="w-6 h-6"/> Meu Progresso</h3>
                            <div className="p-4 border rounded-md bg-gray-50 mb-4">
                                <textarea value={photoNotes} onChange={e => setPhotoNotes(e.target.value)} placeholder="Adicionar uma nota sobre a foto (opcional)" className="w-full text-sm border-gray-300 rounded-md" rows={2}></textarea>
                                <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} className="w-full mt-2 flex items-center justify-center gap-2 p-2 bg-brand-primary text-white rounded-md hover:bg-brand-accent disabled:bg-gray-400"><CameraIcon className="w-5 h-5"/>{uploadingPhoto ? "Enviando..." : "Enviar Foto"}</button>
                                <input type="file" accept="image/*" ref={photoInputRef} onChange={handlePhotoUpload} className="hidden" />
                            </div>
                            <div className="max-h-[80vh] overflow-y-auto space-y-4 pr-2">
                                {progressPhotos.map(p => (
                                    <div key={p.id} className="border rounded-lg overflow-hidden">
                                        <img src={p.photoUrl} className="w-full" alt="foto de progresso"/>
                                        <div className="p-3">
                                            <p className="text-xs text-gray-500">{new Date(p.uploadedAt).toLocaleString('pt-BR')}</p>
                                            {p.studentNotes && <p className="text-sm mt-1 italic">"{p.studentNotes}"</p>}
                                            {p.trainerFeedback && <div className="mt-2 bg-green-50 p-2 rounded-md"><p className="text-sm font-semibold text-green-800">Feedback do Personal:</p><p className="text-sm text-green-700">{p.trainerFeedback}</p></div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
};

export default StudentPortal;