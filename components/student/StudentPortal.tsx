import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Student, Plan, Payment, Workout, StudentFile, ProgressPhoto, Trainer } from '../../types';
// Fix: Add CameraIcon to the import list.
import { UserIcon, LogoutIcon, CalendarIcon, DollarSignIcon, BriefcaseIcon, CheckCircleIcon, ExclamationCircleIcon, InstagramIcon, WhatsAppIcon, LinkIcon, FileTextIcon, ImageIcon, UploadCloudIcon, SendIcon, CameraIcon } from '../icons';
import { db, storage } from '../../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoNotes, setPhotoNotes] = useState('');

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
        } catch (error) {
            console.error("File upload error:", error);
        } finally {
            setUploadingFile(false);
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
        } catch (error) {
            console.error("Photo upload error:", error);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const studentPlan = plans.find(p => p.id === student.planId);
    const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
    const getStatusInfo = () => {
        if (!studentPlan) return { text: 'Aluno sem plano ativo', Icon: ExclamationCircleIcon, color: 'text-red-600' };
        if (studentPlan.type === 'duration') {
            if (!student.paymentDueDate) return { text: 'Status do plano não definido', Icon: ExclamationCircleIcon, color: 'text-yellow-600' };
            const isExpired = new Date(student.paymentDueDate) < new Date();
            return { text: `Seu plano vence em ${formatDate(student.paymentDueDate)}`, Icon: isExpired ? ExclamationCircleIcon : CheckCircleIcon, color: isExpired ? 'text-red-600' : 'text-green-600' };
        }
        if (studentPlan.type === 'session') {
            const remaining = student.remainingSessions;
            if (remaining == null) return { text: "Contagem de aulas não iniciada", Icon: ExclamationCircleIcon, color: 'text-yellow-600' };
            if (remaining < 0) { const plural = Math.abs(remaining) > 1; return { text: `Você deve ${Math.abs(remaining)} aula${plural ? 's' : ''}`, Icon: ExclamationCircleIcon, color: 'text-red-600' }; }
            if (remaining === 0) return { text: 'Você não tem mais aulas restantes', Icon: ExclamationCircleIcon, color: 'text-red-600' };
            const plural = remaining > 1; return { text: `Você tem ${remaining} aula${plural ? 's' : ''} restante${plural ? 's' : ''}`, Icon: CheckCircleIcon, color: 'text-green-600' };
        }
        return { text: 'Status indisponível', Icon: ExclamationCircleIcon, color: 'text-gray-600' };
    };

    const status = getStatusInfo();
    const getYoutubeEmbedUrl = (url: string) => {
        const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
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
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-xl font-bold text-brand-dark mb-4 flex items-center gap-2"><BriefcaseIcon className="w-6 h-6" /> Meus Treinos</h3>
                            <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                                {isLoading ? <p>Carregando treinos...</p> : workouts.length > 0 ? workouts.map(w => (
                                    <div key={w.id} className="p-4 border rounded-lg">
                                        <h4 className="font-bold">{w.title}</h4>
                                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{w.description}</p>
                                        {w.youtubeUrl && getYoutubeEmbedUrl(w.youtubeUrl) && (
                                            <div className="mt-3 aspect-video"><iframe className="w-full h-full rounded-md" src={getYoutubeEmbedUrl(w.youtubeUrl) as string} title={w.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div>
                                        )}
                                    </div>
                                )) : <p className="text-center text-gray-500 py-4">Nenhum treino atribuído.</p>}
                            </div>
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