

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase';
// FIX: Changed firebase import path to use the scoped package '@firebase/firestore' to maintain consistency with the fix in `firebase.ts` and resolve potential module loading issues.
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc, Timestamp, query, orderBy, updateDoc, getDoc, where } from '@firebase/firestore';
// FIX: Changed firebase import path to use the scoped package '@firebase/storage' to maintain consistency with the fix in `firebase.ts` and resolve potential module loading issues.
import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import { AUTH_SESSION_KEY } from '../constants';
import { Student, Plan, Payment, Trainer, DaySchedule, WorkoutTemplate, PendingStudent, StudentGroup } from '../types';
import { UserIcon, DollarSignIcon, BriefcaseIcon, LogoutIcon, PlusIcon, ChartBarIcon, ExclamationCircleIcon, SettingsIcon, CalendarIcon, MailIcon, ClipboardListIcon, LinkIcon, UsersIcon, CheckCircleIcon, UploadCloudIcon, ClockIcon, XIcon, GiftIcon } from './icons';
import StudentDetailsView from './StudentDetailsModal';
import PlanManagementView from './PlanManagementModal';
import AddStudentView from './AddStudentModal';
import FinancialReportView from './modals/FinancialReportModal';
import Modal from './modals/Modal';
import ScheduleView from './ScheduleView';
import BulkEmailModal from './modals/BulkEmailModal';
import WorkoutTemplateView from './modals/WorkoutTemplateModal';
import GroupManagementModal from './modals/GroupManagementModal';

interface DashboardProps {
  onLogout: () => void;
  trainer: Trainer;
}

type SortKey = 'name' | 'plan' | 'status';
type SortDirection = 'asc' | 'desc';

type ActiveView = 'welcome' | 'studentList' | 'schedule' | 'studentDetails' | 'planManagement' | 'addStudent' | 'financialReport' | 'profile' | 'workoutTemplates';


const Loader: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-primary"></div>
    </div>
);

// TrainerProfileView Component defined locally
const TrainerProfileView: React.FC<{
  onBack: () => void;
  trainer: Trainer;
  onSave: (profileData: Omit<Trainer, 'id' | 'username' | 'password'>, logoFile?: File | null) => Promise<void>;
  onUpdatePassword: (currentPassword: string, newPassword: string) => Promise<{success: boolean, message: string}>;
}> = ({ onBack, trainer, onSave, onUpdatePassword }) => {
  const [formData, setFormData] = useState({
    fullName: trainer.fullName || '',
    contactEmail: trainer.contactEmail || '',
    instagram: trainer.instagram || '',
    whatsapp: trainer.whatsapp || '',
    logoUrl: trainer.logoUrl || ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(trainer.logoUrl || null);

  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: ''});
  const [passwordMessage, setPasswordMessage] = useState({type: '', text: ''});
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData, logoFile);
    setIsSaving(false);
  };
  
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage({type: '', text: ''});
    if (passwordData.new !== passwordData.confirm) {
        setPasswordMessage({type: 'error', text: 'As novas senhas não coincidem.'});
        return;
    }
    const result = await onUpdatePassword(passwordData.current, passwordData.new);
    if (result.success) {
        setPasswordMessage({type: 'success', text: result.message});
        setPasswordData({ current: '', new: '', confirm: ''});
    } else {
        setPasswordMessage({type: 'error', text: result.message});
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-brand-dark">Meu Perfil e Configurações</h2>
            <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Voltar</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <form onSubmit={handleProfileSave} className="space-y-4">
                <h3 className="font-bold text-lg text-brand-dark">Informações Públicas</h3>
                <div className="flex flex-col items-center gap-4">
                     <label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashed hover:border-brand-primary transition-colors">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Logo" className="w-full h-full rounded-full object-cover"/>
                            ) : (
                                <UserIcon className="w-12 h-12 text-gray-400"/>
                            )}
                        </div>
                    </label>
                     <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>
                <div><label className="block text-sm font-medium">Nome Completo</label><input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="mt-1 w-full border-gray-300 rounded-md"/></div>
                <div><label className="block text-sm font-medium">E-mail de Contato</label><input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleInputChange} className="mt-1 w-full border-gray-300 rounded-md"/></div>
                <div><label className="block text-sm font-medium">Instagram (somente usuário)</label><input type="text" name="instagram" value={formData.instagram} onChange={handleInputChange} className="mt-1 w-full border-gray-300 rounded-md"/></div>
                <div><label className="block text-sm font-medium">WhatsApp (com código do país)</label><input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} placeholder="Ex: 5511999998888" className="mt-1 w-full border-gray-300 rounded-md"/></div>
                 <button type="submit" disabled={isSaving} className="w-full bg-brand-primary text-white py-2 rounded-md hover:bg-brand-accent disabled:bg-gray-400">{isSaving ? 'Salvando...' : 'Salvar Informações'}</button>
            </form>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <h3 className="font-bold text-lg text-brand-dark">Alterar Senha</h3>
                 <div><label className="block text-sm font-medium">Senha Atual</label><input type="password" name="current" value={passwordData.current} onChange={e => setPasswordData(p => ({...p, current: e.target.value}))} className="mt-1 w-full border-gray-300 rounded-md" required /></div>
                 <div><label className="block text-sm font-medium">Nova Senha</label><input type="password" name="new" value={passwordData.new} onChange={e => setPasswordData(p => ({...p, new: e.target.value}))} className="mt-1 w-full border-gray-300 rounded-md" required /></div>
                 <div><label className="block text-sm font-medium">Confirmar Nova Senha</label><input type="password" name="confirm" value={passwordData.confirm} onChange={e => setPasswordData(p => ({...p, confirm: e.target.value}))} className="mt-1 w-full border-gray-300 rounded-md" required /></div>
                 {passwordMessage.text && <p className={`text-sm ${passwordMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{passwordMessage.text}</p>}
                 <button type="submit" className="w-full bg-brand-secondary text-white py-2 rounded-md hover:bg-gray-700">Alterar Senha</button>
            </form>
        </div>
        <div className="mt-8 pt-4 border-t">
            <h3 className="font-bold text-lg text-brand-dark mb-2">Link de Cadastro de Alunos</h3>
            <p className="text-sm text-gray-600 mb-2">Compartilhe este link com novos alunos para que eles possam se cadastrar e aguardar sua aprovação.</p>
            <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
                <LinkIcon className="w-5 h-5 text-gray-500"/>
                <input type="text" readOnly value={`${window.location.origin}?trainer=${trainer.id}`} className="w-full bg-transparent outline-none text-sm"/>
                <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}?trainer=${trainer.id}`)} className="px-3 py-1 text-xs font-semibold text-white bg-brand-primary rounded-md hover:bg-brand-accent">Copiar</button>
            </div>
        </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ onLogout, trainer }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('welcome');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'asc' });
  const [isBulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);
  const [isGroupModalOpen, setGroupModalOpen] = useState(false);

  const toISO = (ts: any) => ts && ts.toDate ? ts.toDate().toISOString() : null;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const studentQuery = query(collection(db, 'students'), where("trainerId", "==", trainer.id));
        const planQuery = query(collection(db, 'plans'), where("trainerId", "==", trainer.id));
        const paymentQuery = query(collection(db, 'payments'), where("trainerId", "==", trainer.id));
        const groupQuery = query(collection(db, 'studentGroups'), where("trainerId", "==", trainer.id));
        const templateQuery = query(collection(db, 'workoutTemplates'), where("trainerId", "==", trainer.id));
        const pendingQuery = query(collection(db, 'pendingStudents'), where("trainerId", "==", trainer.id), where("status", "==", "pending"));

        const [
            studentsSnapshot,
            plansSnapshot,
            paymentsSnapshot,
            groupsSnapshot,
            templatesSnapshot,
            pendingSnapshot
        ] = await Promise.all([
            getDocs(studentQuery), getDocs(planQuery), getDocs(paymentQuery), getDocs(groupQuery), getDocs(templateQuery), getDocs(pendingQuery)
        ]);

        setStudents(studentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, startDate: toISO(doc.data().startDate), paymentDueDate: toISO(doc.data().paymentDueDate), sessions: (doc.data().sessions || []).map((s: any) => ({ ...s, date: toISO(s.date) })) } as Student)));
        setPlans(plansSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Plan)));
        setPayments(paymentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, paymentDate: toISO(doc.data().paymentDate) } as Payment)));
        setGroups(groupsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as StudentGroup)));
        setWorkoutTemplates(templatesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as WorkoutTemplate)));
        setPendingStudents(pendingSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, submittedAt: toISO(doc.data().submittedAt), birthDate: toISO(doc.data().birthDate) } as PendingStudent)));

    } catch (e) {
        console.error("Error fetching dashboard data:", e);
    }
    setLoading(false);
  }, [trainer.id]);
  
  useEffect(() => {
      fetchData();
  }, [fetchData]);

  const handleAddStudent = async (studentData: Omit<Student, 'id'>) => {
    const docRef = await addDoc(collection(db, 'students'), { ...studentData, trainerId: trainer.id, startDate: Timestamp.now() });
    setStudents(prev => [...prev, { ...studentData, id: docRef.id, trainerId: trainer.id, startDate: new Date().toISOString() }]);
    setActiveView('studentList');
  };
  
  const handleUpdateStudent = async (student: Student) => {
    const studentRef = doc(db, 'students', student.id);
    const { id, ...dataToUpdate } = student;

    const convertDatesToTimestamps = (data: any) => {
        const newData = { ...data };
        if (data.startDate) newData.startDate = Timestamp.fromDate(new Date(data.startDate));
        if (data.paymentDueDate) newData.paymentDueDate = Timestamp.fromDate(new Date(data.paymentDueDate));
        if (data.birthDate) newData.birthDate = Timestamp.fromDate(new Date(data.birthDate));
        if (data.sessions) {
            newData.sessions = data.sessions.map((s: any) => s.date ? { ...s, date: Timestamp.fromDate(new Date(s.date)) } : s);
        }
        return newData;
    };
    
    await updateDoc(studentRef, convertDatesToTimestamps(dataToUpdate));
    setStudents(prev => prev.map(s => s.id === student.id ? student : s));
    setSelectedStudent(student); // Keep the updated student selected
  };
  
  const handleDeleteStudent = async (studentId: string) => {
    await deleteDoc(doc(db, 'students', studentId));
    setStudents(prev => prev.filter(s => s.id !== studentId));
    setActiveView('studentList');
    setSelectedStudent(null);
  };
  
  const handleAddPlan = async (planData: Omit<Plan, 'id'>) => {
    const docRef = await addDoc(collection(db, 'plans'), { ...planData, trainerId: trainer.id });
    setPlans(prev => [...prev, { ...planData, id: docRef.id, trainerId: trainer.id }]);
  };

  const handleUpdatePlan = async (plan: Plan) => {
    const planRef = doc(db, 'plans', plan.id);
    await updateDoc(planRef, plan);
    setPlans(prev => prev.map(p => p.id === plan.id ? plan : p));
  };
  
  const handleDeletePlan = async (planId: string) => {
    await deleteDoc(doc(db, 'plans', planId));
    setPlans(prev => prev.filter(p => p.id !== planId));
  };
  
  const handleAddPayment = async (paymentData: Omit<Payment, 'id'>) => {
    const paymentWithTimestamp = { ...paymentData, paymentDate: Timestamp.fromDate(new Date(paymentData.paymentDate))};
    const docRef = await addDoc(collection(db, 'payments'), paymentWithTimestamp);
    setPayments(prev => [...prev, { ...paymentData, id: docRef.id }]);
  };
  
  const handleDeletePayment = async (paymentId: string) => {
      if (window.confirm("Tem certeza que deseja excluir este lançamento financeiro?")) {
          await deleteDoc(doc(db, "payments", paymentId));
          fetchData(); // Refetch all data to ensure consistency
      }
  };
  
  const handleSaveProfile = async (profileData: Omit<Trainer, 'id' | 'username' | 'password'>, logoFile?: File | null) => {
    let logoUrl = trainer.logoUrl;
    if (logoFile) {
        const logoRef = ref(storage, `trainer_logos/${trainer.id}/${logoFile.name}`);
        const snapshot = await uploadBytes(logoRef, logoFile);
        logoUrl = await getDownloadURL(snapshot.ref);
    }
    const updatedTrainer = { ...trainer, ...profileData, logoUrl };
    const trainerRef = doc(db, 'trainers', trainer.id);
    const { id, password, ...dataToSave } = updatedTrainer;
    await updateDoc(trainerRef, dataToSave);
    
    // Update session storage
    const sessionUser = JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) || '{}');
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ ...sessionUser, ...dataToSave }));
    
    alert("Perfil atualizado com sucesso!");
    fetchData(); // Refetch to ensure UI is consistent
  };
  
  const handleUpdatePassword = async (current: string, newPass: string) => {
      const trainerRef = doc(db, 'trainers', trainer.id);
      const trainerSnap = await getDoc(trainerRef);
      if (trainerSnap.exists() && trainerSnap.data().password === current) {
          await updateDoc(trainerRef, { password: newPass });
          return { success: true, message: 'Senha alterada com sucesso!' };
      }
      return { success: false, message: 'Senha atual incorreta.' };
  };
  
  const handleApproveStudent = async (pendingStudent: PendingStudent) => {
    const { id, status, submittedAt, ...studentData } = pendingStudent;
    try {
        await addDoc(collection(db, 'students'), {
            ...studentData,
            startDate: Timestamp.now(),
            planId: null,
            paymentDueDate: null,
            sessions: [],
            remainingSessions: null,
        });
        await updateDoc(doc(db, 'pendingStudents', id), { status: 'approved' });
        fetchData();
    } catch (e) {
        console.error("Error approving student:", e);
        alert("Erro ao aprovar aluno.");
    }
  };
  
  const handleRejectStudent = async (studentId: string) => {
    await updateDoc(doc(db, 'pendingStudents', studentId), { status: 'rejected' });
    fetchData();
  };

  const filteredStudents = useMemo(() => {
    return students
      .filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        let compareA, compareB;
        if (sortConfig.key === 'plan') {
            compareA = plans.find(p => p.id === a.planId)?.name || 'zzz';
            compareB = plans.find(p => p.id === b.planId)?.name || 'zzz';
        } else if (sortConfig.key === 'status') {
             const getStatusScore = (s: Student) => {
                const plan = plans.find(p => p.id === s.planId);
                if (!plan) return 3; // No plan
                if (plan.type === 'duration' && s.paymentDueDate && new Date(s.paymentDueDate) < new Date()) return 1; // Due
                if (plan.type === 'session' && (s.remainingSessions != null && s.remainingSessions <= 0)) return 1; // Due
                return 2; // Active
            }
            compareA = getStatusScore(a);
            compareB = getStatusScore(b);
        } else {
            compareA = a[sortConfig.key];
            compareB = b[sortConfig.key];
        }
        
        if (compareA === null || compareA === undefined) compareA = '';
        if (compareB === null || compareB === undefined) compareB = '';

        if (compareA < compareB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (compareA > compareB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [students, searchTerm, sortConfig, plans]);

  const studentsWithPaymentDue = useMemo(() => students.filter(s => {
    const plan = plans.find(p => p.id === s.planId);
    if (plan?.type !== 'duration' || !s.paymentDueDate) return false;
    return new Date(s.paymentDueDate) < new Date();
  }), [students, plans]);

  const studentsWithLowSessions = useMemo(() => students.filter(s => {
    const plan = plans.find(p => p.id === s.planId);
    if (plan?.type !== 'session') return false;
    return s.remainingSessions != null && s.remainingSessions <= 3 && s.remainingSessions >= 0;
  }), [students, plans]);

  const birthdayAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    const tomorrowMonth = tomorrow.getMonth();
    const tomorrowDate = tomorrow.getDate();

    return students
      .filter((student): student is Student & { birthDate: string } => !!student.birthDate)
      .map(student => {
        const birthDate = new Date(student.birthDate);
        const birthMonth = birthDate.getMonth();
        const birthDay = birthDate.getDate();

        if (birthMonth === todayMonth && birthDay === todayDate) {
          return { student, message: 'faz aniversário hoje! 🎉' };
        }
        if (birthMonth === tomorrowMonth && birthDay === tomorrowDate) {
          return { student, message: 'faz aniversário amanhã!' };
        }
        return null;
      })
      .filter((item): item is { student: Student; message: string } => item !== null);
  }, [students]);
  
  const handleStudentClick = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setSelectedStudent(student);
      setActiveView('studentDetails');
    }
  };

  const renderView = () => {
    switch(activeView) {
      case 'studentList':
        // This is a minimal implementation for the student list.
        return (
            <div>
                <input type="text" placeholder="Buscar aluno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                {/* A table or list of filteredStudents would go here */}
            </div>
        );
      case 'studentDetails':
        if (selectedStudent) {
          return <StudentDetailsView student={selectedStudent} plans={plans} trainer={trainer} workoutTemplates={workoutTemplates} groups={groups} onBack={() => { setSelectedStudent(null); setActiveView('welcome'); }} onUpdate={handleUpdateStudent} onDelete={handleDeleteStudent} onAddPayment={handleAddPayment} allStudents={students} />;
        }
        break;
      case 'planManagement':
        return <PlanManagementView plans={plans} onAddPlan={handleAddPlan} onUpdatePlan={handleUpdatePlan} onDeletePlan={handleDeletePlan} onBack={() => setActiveView('welcome')} />;
      case 'addStudent':
        return <AddStudentView plans={plans} onBack={() => setActiveView('welcome')} onAdd={handleAddStudent} allStudents={students} trainer={trainer} />;
      case 'financialReport':
        return <FinancialReportView onBack={() => setActiveView('welcome')} payments={payments} students={students} onDeletePayment={handleDeletePayment} plans={plans} />;
      case 'schedule':
        return <ScheduleView students={students} plans={plans} onStudentClick={handleStudentClick} />;
      case 'workoutTemplates':
        return <WorkoutTemplateView onBack={() => setActiveView('welcome')} templates={workoutTemplates} trainerId={trainer.id} onUpdate={fetchData} students={students} groups={groups} />;
      case 'profile':
        return <TrainerProfileView onBack={() => setActiveView('welcome')} trainer={trainer} onSave={handleSaveProfile} onUpdatePassword={handleUpdatePassword} />;
      case 'welcome':
      default:
        return (
            <div className="space-y-8">
                <div>
                    <h2 className="text-3xl font-bold text-brand-dark">Bem-vindo(a), {trainer.fullName || trainer.username}!</h2>
                    <p className="text-gray-600">Aqui está um resumo do seu dia.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     <div className="bg-white p-4 rounded-lg shadow-md"><h4 className="text-sm font-semibold text-gray-500">Alunos Ativos</h4><p className="text-3xl font-bold text-brand-dark">{students.length}</p></div>
                     <div className="bg-white p-4 rounded-lg shadow-md"><h4 className="text-sm font-semibold text-gray-500">Pagamentos em Dia</h4><p className="text-3xl font-bold text-brand-dark">{students.length - studentsWithPaymentDue.length}</p></div>
                     <div className="bg-white p-4 rounded-lg shadow-md"><h4 className="text-sm font-semibold text-gray-500">Alertas de Pagamento</h4><p className="text-3xl font-bold text-red-500">{studentsWithPaymentDue.length}</p></div>
                     <div className="bg-white p-4 rounded-lg shadow-md"><h4 className="text-sm font-semibold text-gray-500">Aulas para Repor</h4><p className="text-3xl font-bold text-yellow-500">{studentsWithLowSessions.length}</p></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-bold text-lg mb-4 text-brand-dark">Alertas Rápidos</h3>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                           {birthdayAlerts.map(({ student, message }) => (
                            <div key={`bday-${student.id}`} className="flex items-center gap-3 p-3 bg-purple-50 border-l-4 border-purple-400 rounded-r-md cursor-pointer hover:bg-purple-100" onClick={() => handleStudentClick(student.id)}>
                                <GiftIcon className="w-6 h-6 text-purple-600 flex-shrink-0" />
                                <div>
                                <p className="font-semibold text-purple-800">{student.name}</p>
                                <p className="text-sm text-purple-700">{message}</p>
                                </div>
                            </div>
                            ))}
                            {studentsWithPaymentDue.map(student => (
                                <div key={student.id} className="flex items-center gap-3 p-3 bg-red-50 border-l-4 border-red-400 rounded-r-md cursor-pointer hover:bg-red-100" onClick={() => handleStudentClick(student.id)}>
                                    <ExclamationCircleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-red-800">{student.name}</p>
                                        <p className="text-sm text-red-700">Pagamento vencido em {new Date(student.paymentDueDate!).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                            ))}
                            {studentsWithLowSessions.map(student => (
                                <div key={student.id} className="flex items-center gap-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-md cursor-pointer hover:bg-yellow-100" onClick={() => handleStudentClick(student.id)}>
                                    <ExclamationCircleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-yellow-800">{student.name}</p>
                                        <p className="text-sm text-yellow-700">{student.remainingSessions} aula{student.remainingSessions === 1 ? '' : 's'} restante{student.remainingSessions === 1 ? '' : 's'}</p>
                                    </div>
                                </div>
                            ))}
                            {studentsWithPaymentDue.length === 0 && studentsWithLowSessions.length === 0 && birthdayAlerts.length === 0 && (
                                <p className="text-gray-500 text-sm">Nenhum alerta no momento. Tudo em ordem!</p>
                            )}
                        </div>
                    </div>
                     <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="font-bold text-lg mb-4 text-brand-dark">Novos Cadastros Pendentes</h3>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {pendingStudents.length > 0 ? pendingStudents.map(ps => (
                                <div key={ps.id} className="p-3 bg-gray-50 rounded-lg border flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">{ps.name}</p>
                                        <p className="text-xs text-gray-500">{ps.email}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApproveStudent(ps)} className="px-3 py-1 text-xs font-bold text-white bg-green-500 rounded-md hover:bg-green-600">Aprovar</button>
                                        <button onClick={() => handleRejectStudent(ps.id)} className="px-3 py-1 text-xs font-bold text-white bg-red-500 rounded-md hover:bg-red-600">Rejeitar</button>
                                    </div>
                                </div>
                            )) : <p className="text-gray-500 text-sm">Nenhum novo aluno aguardando aprovação.</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
  };

  const NavButton: React.FC<{ view: ActiveView, label: string, Icon: React.FC<{className?: string}>}> = ({ view, label, Icon }) => (
      <button onClick={() => setActiveView(view)} className={`w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg transition-colors ${activeView === view ? 'bg-brand-accent text-white' : 'text-gray-300 hover:bg-brand-secondary hover:text-white'}`}>
          <Icon className="w-6 h-6" />
          <span className="font-semibold">{label}</span>
      </button>
  );

  return (
    <div className="flex h-screen bg-brand-light">
      <aside className="w-64 bg-brand-dark text-white flex flex-col p-4 flex-shrink-0">
        <div className="flex items-center gap-3 p-4 border-b border-gray-700">
            {trainer.logoUrl ? <img src={trainer.logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-brand-secondary flex items-center justify-center"><UserIcon className="w-6 h-6"/></div>}
            <span className="font-bold text-lg">{trainer.username}</span>
        </div>
        <nav className="flex-grow space-y-2 mt-6">
            <NavButton view="welcome" label="Início" Icon={UserIcon} />
            <NavButton view="studentList" label="Alunos" Icon={UserIcon} />
            <NavButton view="schedule" label="Agenda" Icon={CalendarIcon} />
            <NavButton view="planManagement" label="Planos" Icon={BriefcaseIcon} />
            <NavButton view="workoutTemplates" label="Modelos de Treino" Icon={ClipboardListIcon} />
            <NavButton view="financialReport" label="Financeiro" Icon={DollarSignIcon} />
        </nav>
        <div className="space-y-2 pt-4 border-t border-gray-700">
            <button onClick={() => setGroupModalOpen(true)} className="w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg text-gray-300 hover:bg-brand-secondary hover:text-white"><UsersIcon className="w-6 h-6"/>Gerenciar Grupos</button>
            <button onClick={() => setBulkEmailModalOpen(true)} className="w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg text-gray-300 hover:bg-brand-secondary hover:text-white"><MailIcon className="w-6 h-6"/>E-mail em Massa</button>
            <NavButton view="profile" label="Meu Perfil" Icon={SettingsIcon} />
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg text-gray-300 hover:bg-brand-secondary hover:text-white"><LogoutIcon className="w-6 h-6"/>Sair</button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
         <header className="bg-white shadow-sm z-10">
             <div className="container mx-auto px-6 py-3 flex justify-end items-center">
                 <button onClick={() => setActiveView('addStudent')} className="flex items-center gap-2 bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-accent transition-colors shadow">
                     <PlusIcon className="w-5 h-5" /> Adicionar Aluno
                 </button>
             </div>
         </header>
         <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
            {loading ? <Loader /> : renderView()}
         </main>
      </div>
       {isBulkEmailModalOpen && <BulkEmailModal isOpen={isBulkEmailModalOpen} onClose={() => setBulkEmailModalOpen(false)} students={students} trainer={trainer} />}
       {isGroupModalOpen && <GroupManagementModal isOpen={isGroupModalOpen} onClose={() => setGroupModalOpen(false)} groups={groups} trainerId={trainer.id} onUpdate={fetchData} />}
    </div>
  );
};

export default Dashboard;
