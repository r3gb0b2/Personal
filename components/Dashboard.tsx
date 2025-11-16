

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { db, storage } from '../firebase';
// FIX: Changed firebase import path to use the scoped package '@firebase/firestore' to maintain consistency with the fix in `firebase.ts` and resolve potential module loading issues.
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc, Timestamp, query, orderBy, updateDoc, getDoc, where } from '@firebase/firestore';
// FIX: Changed firebase import path to use the scoped package '@firebase/storage' to maintain consistency with the fix in `firebase.ts` and resolve potential module loading issues.
import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import { AUTH_SESSION_KEY } from '../constants';
import { Student, Plan, Payment, Trainer, DaySchedule, WorkoutTemplate, PendingStudent, StudentGroup } from '../types';
import { UserIcon, DollarSignIcon, BriefcaseIcon, LogoutIcon, PlusIcon, ChartBarIcon, ExclamationCircleIcon, SettingsIcon, CalendarIcon, MailIcon, ClipboardListIcon, LinkIcon, UsersIcon, CheckCircleIcon, UploadCloudIcon, ClockIcon, XIcon } from './icons';
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
    setFormData(prev => ({...prev, [name]: value}));
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        await onSave(formData, logoFile);
        alert("Perfil salvo com sucesso!");
    } catch (err) {
        // Error is alerted to user in the onSave function
    } finally {
        setIsSaving(false);
    }
  };
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordMessage({type: '', text: ''});
      if (passwordData.new !== passwordData.confirm) {
          setPasswordMessage({type: 'error', text: 'As novas senhas não coincidem.'});
          return;
      }
      if (!passwordData.current || !passwordData.new) {
          setPasswordMessage({type: 'error', text: 'Todos os campos de senha são obrigatórios.'});
          return;
      }
      const result = await onUpdatePassword(passwordData.current, passwordData.new);
      if (result.success) {
          setPasswordMessage({type: 'success', text: result.message});
          setPasswordData({ current: '', new: '', confirm: ''});
      } else {
          setPasswordMessage({type: 'error', text: result.message});
      }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-brand-dark">Meu Perfil e Marca</h2>
            <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Voltar</button>
        </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center border">
            {logoPreview ? <img src={logoPreview} alt="Logo preview" className="w-full h-full rounded-full object-cover" /> : <UserIcon className="w-12 h-12 text-gray-400" />}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Logo Pessoal</label>
            <p className="text-xs text-gray-500 mb-2">Aparecerá nos PDFs e no portal do aluno.</p>
            <input type="file" accept="image/*" onChange={handleLogoChange} className="text-sm" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome Completo (Exibição)</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email de Contato</label>
              <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Instagram (apenas usuário)</label>
              <input type="text" name="instagram" value={formData.instagram} onChange={handleInputChange} placeholder="ex: seunome" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">WhatsApp (com código do país)</label>
              <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} placeholder="ex: 5511999998888" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
            </div>
        </div>
        
        <div className="flex justify-end gap-4 pt-4">
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent disabled:bg-gray-400 disabled:cursor-wait">
            {isSaving ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>
      </form>
      
      <hr className="my-6"/>

       <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <h3 className="text-lg font-bold text-brand-dark">Alterar Senha</h3>
         <div>
            <label className="block text-sm font-medium text-gray-700">Senha Atual</label>
            <input type="password" name="current" value={passwordData.current} onChange={handlePasswordChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
            <input type="password" name="new" value={passwordData.new} onChange={handlePasswordChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
        </div>
         <div>
            <label className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
            <input type="password" name="confirm" value={passwordData.confirm} onChange={handlePasswordChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
        </div>
        
        {passwordMessage.text && (
            <p className={`text-sm ${passwordMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {passwordMessage.text}
            </p>
        )}

        <div className="flex justify-end gap-4 pt-4">
             <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-secondary rounded-md hover:bg-gray-700">Alterar Senha</button>
        </div>
      </form>
    </div>
  );
};

const WelcomeDashboardView: React.FC<{
    students: Student[];
    payments: Payment[];
    plans: Plan[];
    onStudentClick: (studentId: string) => void;
}> = ({ students, payments, plans, onStudentClick }) => {
    const kpis = useMemo(() => {
        const now = new Date();
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const activeStudents = students.filter(s => {
            const plan = plans.find(p => p.id === s.planId);
            if (!plan || s.accessBlocked) return false;
            if (plan.type === 'duration') return s.paymentDueDate && new Date(s.paymentDueDate) >= now;
            if (plan.type === 'session') return s.remainingSessions != null && s.remainingSessions > 0;
            return false;
        });

        const revenueThisMonth = payments
            .filter(p => new Date(p.paymentDate) >= firstDayThisMonth)
            .reduce((sum, p) => sum + p.amount, 0);

        const revenueLastMonth = payments
            .filter(p => {
                const pDate = new Date(p.paymentDate);
                return pDate >= firstDayLastMonth && pDate <= lastDayLastMonth;
            })
            .reduce((sum, p) => sum + p.amount, 0);

        const revenueChange = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : revenueThisMonth > 0 ? 100 : 0;
        
        return {
            totalStudents: students.length,
            activeStudents: activeStudents.length,
            inactiveStudents: students.length - activeStudents.length,
            revenueThisMonth,
            revenueChange
        };
    }, [students, payments, plans]);

    const upcomingAlerts = useMemo(() => {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const alerts: {student: Student, message: string}[] = [];

        students.forEach(s => {
            const plan = plans.find(p => p.id === s.planId);
            if (!plan || s.accessBlocked) return;
            if (plan.type === 'duration' && s.paymentDueDate) {
                const dueDate = new Date(s.paymentDueDate);
                if (dueDate < now) {
                    alerts.push({student: s, message: 'Plano vencido!'});
                } else if (dueDate <= nextWeek) {
                    alerts.push({student: s, message: `Vence em ${dueDate.toLocaleDateString('pt-BR')}`});
                }
            } else if (plan.type === 'session' && s.remainingSessions != null && s.remainingSessions <= 3) {
                 if (s.remainingSessions <= 0) {
                     alerts.push({student: s, message: 'Aulas esgotadas!'});
                 } else {
                    alerts.push({student: s, message: `Restam ${s.remainingSessions} aulas`});
                 }
            }
        });

        return alerts.slice(0, 5); // Limit to 5 alerts
    }, [students, plans]);
    
    const todaySchedule = useMemo(() => {
        const today = new Date();
        const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()];
        return students
            .filter(s => s.schedule?.some(item => item.day === dayKey && item.startTime))
            .map(s => {
                const todayItem = s.schedule?.find(item => item.day === dayKey)!;
                return {
                    studentId: s.id,
                    name: s.name,
                    time: todayItem.startTime,
                };
            })
            .sort((a, b) => a.time.localeCompare(b.time));
    }, [students]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* KPI Cards */}
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-4"><div className="bg-blue-100 p-3 rounded-full"><UsersIcon className="w-8 h-8 text-blue-500"/></div><div><p className="text-gray-500 text-sm">Total de Alunos</p><p className="text-2xl font-bold text-brand-dark">{kpis.totalStudents}</p></div></div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-4"><div className="bg-green-100 p-3 rounded-full"><CheckCircleIcon className="w-8 h-8 text-green-500"/></div><div><p className="text-gray-500 text-sm">Alunos Ativos</p><p className="text-2xl font-bold text-brand-dark">{kpis.activeStudents}</p></div></div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-4"><div className="bg-red-100 p-3 rounded-full"><ExclamationCircleIcon className="w-8 h-8 text-red-500"/></div><div><p className="text-gray-500 text-sm">Alunos Inativos</p><p className="text-2xl font-bold text-brand-dark">{kpis.inactiveStudents}</p></div></div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-4"><div className="bg-purple-100 p-3 rounded-full"><DollarSignIcon className="w-8 h-8 text-purple-500"/></div><div><p className="text-gray-500 text-sm">Receita do Mês</p><p className="text-2xl font-bold text-brand-dark">R$ {kpis.revenueThisMonth.toFixed(2)}</p><span className={`text-xs font-bold ${kpis.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>{kpis.revenueChange.toFixed(0)}% vs. mês anterior</span></div></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Agenda do Dia */}
                <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-1">
                     <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><CalendarIcon className="w-6 h-6 text-brand-dark"/> Agenda de Hoje</h3>
                     {todaySchedule.length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {todaySchedule.map(item => (
                                <button key={item.studentId} onClick={() => onStudentClick(item.studentId)} className="w-full text-left flex items-center gap-3 p-3 bg-gray-50 rounded-md hover:bg-gray-100">
                                    <div className="bg-brand-primary text-white font-bold text-sm rounded-md h-8 w-12 flex items-center justify-center">{item.time}</div>
                                    <p className="font-semibold">{item.name}</p>
                                </button>
                            ))}
                        </div>
                     ) : <p className="text-center text-gray-500 pt-8">Nenhum aluno agendado para hoje.</p>}
                </div>
                 {/* Alertas Rápidos */}
                <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
                     <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ExclamationCircleIcon className="w-6 h-6 text-yellow-500"/> Alertas Rápidos</h3>
                     {upcomingAlerts.length > 0 ? (
                         <div className="space-y-2">
                            {upcomingAlerts.map(({student, message}) => (
                                <button key={student.id} onClick={() => onStudentClick(student.id)} className="w-full text-left flex justify-between items-center p-3 bg-yellow-50 rounded-md hover:bg-yellow-100">
                                    <p className="font-semibold">{student.name}</p>
                                    <p className="text-sm font-medium text-yellow-800">{message}</p>
                                </button>
                            ))}
                         </div>
                     ) : <p className="text-center text-gray-500 pt-8">Nenhum aviso importante no momento.</p>}
                </div>
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ onLogout, trainer }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
  const [currentTrainer, setCurrentTrainer] = useState<Trainer>(trainer);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeView, setActiveView] = useState<ActiveView>('welcome');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isBulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);
  const [isGroupModalOpen, setGroupModalOpen] = useState(false);
  const [isCopyLinkModalOpen, setCopyLinkModalOpen] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'asc' });
  const [groupFilter, setGroupFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const toISO = (ts: any) => ts && ts.toDate ? ts.toDate().toISOString() : null;
      
      const studentsSnapshot = await getDocs(query(collection(db, 'students'), where("trainerId", "==", currentTrainer.id)));
      // FIX: Fetch all plans and filter on the client to include legacy plans without a trainerId.
      const allPlansSnapshot = await getDocs(collection(db, 'plans'));
      const paymentsSnapshot = await getDocs(query(collection(db, 'payments'), where("trainerId", "==", currentTrainer.id), orderBy('paymentDate', 'desc')));
      const templatesSnapshot = await getDocs(query(collection(db, 'workoutTemplates'), where("trainerId", "==", currentTrainer.id)));
      const pendingStudentsQuery = query(collection(db, 'pendingStudents'), where("trainerId", "==", currentTrainer.id), where("status", "==", "pending"));
      const pendingStudentsSnapshot = await getDocs(pendingStudentsQuery);
      const groupsQuery = query(collection(db, 'studentGroups'), where("trainerId", "==", currentTrainer.id));
      const groupsSnapshot = await getDocs(groupsQuery);

      const studentsList = studentsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          ...data,
          id: docSnapshot.id,
          startDate: toISO(data.startDate) || new Date().toISOString(),
          paymentDueDate: toISO(data.paymentDueDate),
          birthDate: toISO(data.birthDate),
          sessions: (data.sessions || []).filter(Boolean).map((s: any) => ({ ...s, date: toISO(s.date) })),
        } as Student;
      });

      // FIX: Filter plans to show trainer-specific plans and global/legacy plans.
      const plansList = allPlansSnapshot.docs
        .map(docSnapshot => ({ ...docSnapshot.data(), id: docSnapshot.id } as Plan))
        .filter(plan => !plan.trainerId || plan.trainerId === currentTrainer.id);
      
      const templatesList = templatesSnapshot.docs.map(docSnapshot => ({ ...docSnapshot.data(), id: docSnapshot.id } as WorkoutTemplate));

      const paymentsList = paymentsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
            ...data,
            id: docSnapshot.id,
            paymentDate: toISO(data.paymentDate),
        } as Payment;
      });
      
      const pendingStudentsList = pendingStudentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
              ...data,
              id: doc.id,
              submittedAt: toISO(data.submittedAt),
              birthDate: toISO(data.birthDate),
          } as PendingStudent;
      });
      
      let groupsList = groupsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as StudentGroup));

      setStudents(studentsList);
      setPlans(plansList);
      setPayments(paymentsList);
      setWorkoutTemplates(templatesList);
      setPendingStudents(pendingStudentsList);
      setStudentGroups(groupsList);

    } catch (err) {
      console.error("Firebase Connection Error Details:", err);
      setError("CONNECTION_ERROR");
    } finally {
      setLoading(false);
    }
  }, [currentTrainer.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApproveStudent = async (pendingStudent: PendingStudent) => {
      const emailExists = students.some(
          student => student.email.toLowerCase() === pendingStudent.email.toLowerCase()
      );
      if (emailExists) {
          alert(`Erro: O e-mail "${pendingStudent.email}" já está cadastrado.`);
          return;
      }
      try {
          const newStudentData: Omit<Student, 'id'> = {
              name: pendingStudent.name,
              email: pendingStudent.email,
              phone: pendingStudent.phone,
              birthDate: pendingStudent.birthDate,
              startDate: new Date().toISOString(),
              planId: null, paymentDueDate: null, sessions: [],
              remainingSessions: null, profilePictureUrl: pendingStudent.profilePictureUrl || null,
              schedule: null, remindersSent: {}, accessBlocked: false,
              groupIds: [], trainerId: pendingStudent.trainerId,
          };
          await addDoc(collection(db, 'students'), {
              ...newStudentData,
              startDate: Timestamp.fromDate(new Date(newStudentData.startDate)),
              birthDate: newStudentData.birthDate ? Timestamp.fromDate(new Date(newStudentData.birthDate)) : null
          });
          await deleteDoc(doc(db, 'pendingStudents', pendingStudent.id));
          fetchData();
          alert(`${pendingStudent.name} foi aprovado(a).`);
      } catch (error) {
          console.error("Error approving student:", error);
          alert("Ocorreu um erro ao aprovar o aluno.");
      }
  };


  const handleRejectStudent = async (pendingStudentId: string) => {
    if (window.confirm("Tem certeza que deseja rejeitar esta solicitação?")) {
        try {
            await deleteDoc(doc(db, 'pendingStudents', pendingStudentId));
            fetchData();
            alert("Solicitação rejeitada.");
        } catch(error) {
            console.error("Error rejecting student:", error);
            alert("Ocorreu um erro ao rejeitar.");
        }
    }
  };

  const handleSaveProfile = async (
    profileData: Omit<Trainer, 'id' | 'username' | 'password'>,
    logoFile?: File | null
  ) => {
    try {
        const trainerRef = doc(db, 'trainers', currentTrainer.id);
        let updatedProfileData = { ...profileData };

        if (logoFile) {
            const logoRef = ref(storage, `trainer_logos/${currentTrainer.id}/${logoFile.name}`);
            const snapshot = await uploadBytes(logoRef, logoFile);
            const downloadURL = await getDownloadURL(snapshot.ref);
            updatedProfileData.logoUrl = downloadURL;
        }

        await updateDoc(trainerRef, updatedProfileData);

        const updatedTrainer = { ...currentTrainer, ...updatedProfileData };
        setCurrentTrainer(updatedTrainer);
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updatedTrainer));

    } catch (error) {
        console.error("Failed to save profile:", error);
        alert("Ocorreu um erro ao salvar o perfil.");
        throw error;
    }
  };
  
  const handleUpdateTrainerPassword = async (currentPassword: string, newPassword: string): Promise<{success: boolean, message: string}> => {
      try {
          const trainerRef = doc(db, 'trainers', currentTrainer.id);
          const trainerSnap = await getDoc(trainerRef);
          
          if (!trainerSnap.exists()) {
              return { success: false, message: "Usuário não encontrado." };
          }
          
          const trainerData = trainerSnap.data();
          if (trainerData.password !== currentPassword) {
              return { success: false, message: "A senha atual está incorreta."};
          }

          await updateDoc(trainerRef, { password: newPassword });
          return { success: true, message: "Senha alterada com sucesso!"};

      } catch (error) {
          console.error("Error updating password:", error);
          return { success: false, message: "Ocorreu um erro ao alterar a senha." };
      }
  }
  
  const handleUpdateStudent = async (updatedStudent: Student) => {
    const studentRef = doc(db, 'students', updatedStudent.id);
    const dataToUpdate = {
        ...updatedStudent,
        trainerId: currentTrainer.id,
        startDate: Timestamp.fromDate(new Date(updatedStudent.startDate)),
        paymentDueDate: updatedStudent.paymentDueDate ? Timestamp.fromDate(new Date(updatedStudent.paymentDueDate)) : null,
        birthDate: updatedStudent.birthDate ? Timestamp.fromDate(new Date(updatedStudent.birthDate)) : null,
        sessions: updatedStudent.sessions.map(s => ({ ...s, date: Timestamp.fromDate(new Date(s.date))}))
    };
    const { id, ...rest } = dataToUpdate;
    await setDoc(studentRef, rest, { merge: true });
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    setSelectedStudent(updatedStudent);
  };

  const handleAddStudent = async (newStudentData: Omit<Student, 'id'>) => {
    const studentWithTimestamps = {
        ...newStudentData,
        trainerId: currentTrainer.id,
        startDate: Timestamp.fromDate(new Date(newStudentData.startDate)),
        paymentDueDate: newStudentData.paymentDueDate ? Timestamp.fromDate(new Date(newStudentData.paymentDueDate)) : null,
        birthDate: newStudentData.birthDate ? Timestamp.fromDate(new Date(newStudentData.birthDate)) : null,
    };
    const docRef = await addDoc(collection(db, 'students'), studentWithTimestamps);
    const newStudentWithId = { ...newStudentData, id: docRef.id, trainerId: currentTrainer.id };
    setStudents(prev => [...prev, newStudentWithId]);
    fetchData(); 
    setSelectedStudent(newStudentWithId);
    setActiveView('studentDetails');
  };
  
  const handleDeleteStudent = async (studentId: string) => {
      await deleteDoc(doc(db, 'students', studentId));
      setStudents(prev => prev.filter(s => s.id !== studentId));
      setSelectedStudent(null);
      setActiveView('studentList');
  }

  const handleAddPlan = async (planData: Omit<Plan, 'id'>) => {
    const planToAdd = { ...planData, trainerId: currentTrainer.id };
    const docRef = await addDoc(collection(db, 'plans'), planToAdd);
    setPlans(prev => [...prev, { ...planToAdd, id: docRef.id }]);
  };

  const handleUpdatePlan = async (updatedPlan: Plan) => {
      const planRef = doc(db, 'plans', updatedPlan.id);
      const dataToUpdate = { 
          ...updatedPlan,
          trainerId: currentTrainer.id 
      };
      const { id, ...rest } = dataToUpdate;
      await setDoc(planRef, rest);
      const finalUpdatedPlan = { ...updatedPlan, trainerId: currentTrainer.id };
      setPlans(prev => prev.map(p => p.id === updatedPlan.id ? finalUpdatedPlan : p));
  }

  const handleDeletePlan = async (planId: string) => {
      if(window.confirm("Tem certeza que deseja excluir este plano?")) {
          await deleteDoc(doc(db, 'plans', planId));
          setPlans(prev => prev.filter(p => p.id !== planId));
      }
  }

  const handleAddPayment = async (paymentData: Omit<Payment, 'id'>) => {
      const paymentWithTimestamp = {
          ...paymentData,
          trainerId: currentTrainer.id,
          paymentDate: Timestamp.fromDate(new Date(paymentData.paymentDate)),
      };
      const docRef = await addDoc(collection(db, 'payments'), paymentWithTimestamp);
      const newPayment = { ...paymentData, id: docRef.id, trainerId: currentTrainer.id };
      setPayments(prev => [newPayment, ...prev]);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este lançamento?")) {
      try {
        await deleteDoc(doc(db, 'payments', paymentId));
        setPayments(prev => prev.filter(p => p.id !== paymentId));
      } catch (err) {
        console.error("Error deleting payment:", err);
        alert("Não foi possível excluir o lançamento.");
      }
    }
  };
  
  const handleSelectStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
        setSelectedStudent(student);
        setActiveView('studentDetails');
    }
  };

  const getPlan = useCallback((planId: string | null) => plans.find(p => p.id === planId), [plans]);

  const getStudentStatus = useCallback((student: Student) => {
      if (student.accessBlocked) return { text: 'Bloqueado', color: 'red', situation: 'Acesso bloqueado' };
      const plan = getPlan(student.planId);
      if (!plan) return { text: 'Sem Plano', color: 'gray', situation: 'N/A' };

      if (plan.type === 'duration') {
          const dueDate = student.paymentDueDate ? new Date(student.paymentDueDate) : null;
          if (!dueDate) return { text: 'Ativo', color: 'green', situation: 'Sem vencimento' };

          const now = new Date();
          now.setHours(0,0,0,0);
          const situationText = `Vence em ${dueDate.toLocaleDateString('pt-BR')}`;

          if (dueDate < now) return { text: 'Vencido', color: 'red', situation: situationText };
          
          const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (dueDate <= nextWeek) return { text: 'Vence breve', color: 'yellow', situation: situationText };

          return { text: 'Ativo', color: 'green', situation: situationText };
      }

      if (plan.type === 'session') {
          const remaining = student.remainingSessions;
          if (remaining == null || isNaN(remaining)) {
              return { text: 'Ativo', color: 'green', situation: 'Sessões N/A' };
          }
          if (remaining < 0) {
              const plural = Math.abs(remaining) > 1;
              return { text: 'Devendo', color: 'red', situation: `${Math.abs(remaining)} aula${plural ? 's' : ''} a deduzir` };
          }
          if (remaining === 0) {
              return { text: 'Sem Aulas', color: 'red', situation: 'Nenhuma aula' };
          }
          if (remaining <= 3) {
              const plural = remaining > 1;
              return { text: 'Acabando', color: 'yellow', situation: `${remaining} aula${plural ? 's' : ''}` };
          }
          return { text: 'Ativo', color: 'green', situation: `${remaining} aulas` };
      }
      
      return { text: 'N/A', color: 'gray', situation: 'N/A' };
  }, [getPlan]);

  const sortedStudents = useMemo(() => {
    let sortableStudents = [...students];

    if (groupFilter !== 'all') {
        sortableStudents = sortableStudents.filter(s => s.groupIds?.includes(groupFilter));
    }

    if (sortConfig.key) {
      sortableStudents.sort((a, b) => {
        let aValue: string;
        let bValue: string;

        switch (sortConfig.key) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'plan':
            aValue = getPlan(a.planId)?.name || 'zzz';
            bValue = getPlan(b.planId)?.name || 'zzz';
            break;
          case 'status':
            aValue = getStudentStatus(a).text;
            bValue = getStudentStatus(b).text;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableStudents;
  }, [students, sortConfig, getPlan, getStudentStatus, groupFilter]);

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const SortableHeader: React.FC<{ sortKey: SortKey, label: string }> = ({ sortKey, label }) => (
    <th className="p-4 font-semibold">
        <button onClick={() => handleSort(sortKey)} className="flex items-center gap-1 hover:text-brand-primary transition-colors">
            {label}
            {sortConfig.key === sortKey && (
                <span className="text-xs">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
            )}
        </button>
    </th>
  );
  
  const Sidebar: React.FC<{
    activeView: ActiveView,
    setActiveView: (view: ActiveView) => void,
    onLogout: () => void,
    pendingStudentsCount: number,
    studentCount: number
}> = ({ activeView, setActiveView, onLogout, pendingStudentsCount, studentCount }) => {
    const NavItem: React.FC<{
        view: ActiveView,
        label: string,
        Icon: React.FC<{className?: string}>,
        alertCount?: number,
        totalCount?: number
    }> = ({view, label, Icon, alertCount, totalCount}) => {
        const handleNavClick = (view: ActiveView) => {
            setActiveView(view);
            setIsSidebarOpen(false); // Close sidebar on navigation in mobile
        };
        return (
            <button
                onClick={() => handleNavClick(view)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeView === view ? 'bg-brand-accent text-white' : 'text-gray-300 hover:bg-brand-secondary hover:text-white'
                }`}
            >
                <Icon className="w-6 h-6"/>
                <span className="font-semibold">{label}</span>
                {totalCount !== undefined && (
                    <span className="ml-2 text-xs font-semibold bg-gray-600 text-white rounded-full px-2 py-0.5">{totalCount}</span>
                )}
                {alertCount && alertCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{alertCount}</span>
                )}
            </button>
        );
    };

    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />
            <aside
                className={`fixed inset-y-0 left-0 w-64 bg-brand-dark text-white flex flex-col p-4 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:flex-shrink-0 ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex justify-between items-center mb-6 lg:hidden">
                    <span className="text-lg font-bold">Menu</span>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-gray-300 hover:text-white">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <nav className="flex-grow space-y-2">
                    <NavItem view="welcome" label="Dashboard" Icon={ChartBarIcon} />
                    <NavItem view="studentList" label="Alunos" Icon={UserIcon} totalCount={studentCount} alertCount={pendingStudentsCount} />
                    <NavItem view="schedule" label="Agenda" Icon={CalendarIcon} />
                    <button
                        onClick={() => {
                            setGroupModalOpen(true);
                            setIsSidebarOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors text-gray-300 hover:bg-brand-secondary hover:text-white"
                    >
                        <UsersIcon className="w-6 h-6"/>
                        <span className="font-semibold">Grupos</span>
                    </button>
                    <NavItem view="planManagement" label="Planos" Icon={BriefcaseIcon} />
                    <NavItem view="workoutTemplates" label="Modelos de Treino" Icon={ClipboardListIcon} />
                    <NavItem view="financialReport" label="Financeiro" Icon={DollarSignIcon} />
                </nav>
                <div className="mt-auto space-y-2">
                    <NavItem view="profile" label="Meu Perfil" Icon={SettingsIcon} />
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg text-gray-300 hover:bg-brand-secondary hover:text-white transition-colors"
                    >
                        <LogoutIcon className="w-6 h-6"/>
                        <span className="font-semibold">Sair</span>
                    </button>
                </div>
            </aside>
        </>
    );
};


  const renderStudentList = () => (
    <>
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-4 gap-4">
                <h2 className="text-2xl font-bold text-brand-dark">Meus Alunos</h2>
                 <div className="flex flex-wrap items-center gap-4">
                     <button onClick={() => setCopyLinkModalOpen(true)} className="flex items-center gap-2 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors shadow">
                        <LinkIcon className="w-5 h-5" /> Link de Cadastro
                    </button>
                    <button onClick={() => setActiveView('addStudent')} className="flex items-center gap-2 bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-accent transition-colors shadow">
                        <PlusIcon className="w-5 h-5" /> Adicionar Aluno
                    </button>
                    <div>
                        <label htmlFor="group-filter" className="text-sm font-medium text-gray-700 mr-2">Filtrar por Grupo:</label>
                        <select id="group-filter" value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="border-gray-300 rounded-md shadow-sm text-sm">
                            <option value="all">Todos os Grupos</option>
                            {studentGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {pendingStudents.length > 0 && (
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-300 rounded-lg shadow-sm">
                <h3 className="font-bold text-lg text-yellow-900">{pendingStudents.length} Nova(s) Solicitação(ões) de Cadastro</h3>
                <div className="space-y-2">
                    {pendingStudents.map(ps => (
                        <div key={ps.id} className="flex items-center justify-between p-3 bg-white rounded-md border">
                            <div className="flex items-center gap-3">
                                {ps.profilePictureUrl ? (<img src={ps.profilePictureUrl} alt={ps.name} className="w-10 h-10 rounded-full object-cover"/>) : (<div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><UserIcon className="w-6 h-6 text-gray-500"/></div>)}
                                <div><p className="font-semibold">{ps.name}</p><p className="text-sm text-gray-500">{ps.email}</p></div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleApproveStudent(ps)} className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Aprovar</button>
                                <button onClick={() => handleRejectStudent(ps.id)} className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Rejeitar</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            )}

              {loading ? <Loader /> : error ? (
                  <div className="m-4 bg-red-50 border border-red-200 p-6 rounded-lg shadow-sm">
                      <div className="flex items-start"><div className="flex-shrink-0"><ExclamationCircleIcon className="h-8 w-8 text-red-500" /></div><div className="ml-4 flex-1"><h3 className="text-lg font-bold text-red-800">Erro de Acesso ao Banco de Dados</h3>{error === "CONNECTION_ERROR" ? (<div className="mt-2 text-sm text-red-700 space-y-4"><p>A aplicação não conseguiu se conectar ou ler os dados do seu banco de dados Firebase.</p><p><strong>Causa Mais Comum:</strong> O Firestore requer um "índice" para consultas complexas. A mensagem de erro no console do navegador (<strong className="font-mono">F12</strong>) geralmente contém um link para criar este índice automaticamente.</p></div>) : (<div className="mt-2 text-sm text-red-700"><p>{error}</p></div>)}</div></div>
                  </div>
              ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-brand-light"><tr><SortableHeader sortKey="name" label="Nome" /><SortableHeader sortKey="plan" label="Plano" /><th className="p-4 font-semibold">Grupos</th><th className="p-4 font-semibold">Situação</th><SortableHeader sortKey="status" label="Status" /></tr></thead>
                        <tbody>
                            {sortedStudents.length > 0 ? sortedStudents.map(student => {
                                const status = getStudentStatus(student);
                                const colorClasses: { [key: string]: string } = { red: 'text-red-800 bg-red-100', yellow: 'text-yellow-800 bg-yellow-100', green: 'text-green-800 bg-green-100', gray: 'text-gray-800 bg-gray-100' }
                                const groups = student.groupIds?.map(gid => studentGroups.find(g => g.id === gid)?.name).filter(Boolean) || [];
                                return (
                                    <tr key={student.id} onClick={() => handleSelectStudent(student.id)} className="border-t hover:bg-gray-50 cursor-pointer">
                                        <td className="p-4 font-medium"><div className="flex items-center gap-3">{student.profilePictureUrl ? (<img src={student.profilePictureUrl} alt={student.name} className="w-10 h-10 rounded-full object-cover"/>) : (<div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><UserIcon className="w-6 h-6 text-gray-500"/></div>)}<span>{student.name}</span></div></td>
                                        <td className="p-4 text-gray-600">{getPlan(student.planId)?.name || 'N/A'}</td>
                                        <td className="p-4 text-gray-600 text-sm">{groups.length > 0 ? groups.map(g => <span key={g} className="inline-block bg-gray-200 rounded-full px-2 py-1 text-xs mr-1 mb-1">{g}</span>) : 'N/A'}</td>
                                        <td className="p-4 text-gray-600">{status.situation}</td>
                                        <td className="p-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[status.color]}`}>{status.text}</span></td>
                                    </tr>
                                )
                            }) : (<tr><td colSpan={5} className="text-center p-8 text-gray-500">Nenhum aluno encontrado.</td></tr>)}
                        </tbody>
                    </table>
                </div>
              )}
        </div>
    </>
  );
  
  const renderActiveView = () => {
    const onBackToWelcome = () => setActiveView('welcome');
    const onBackToStudentList = () => setActiveView('studentList');

    switch(activeView) {
      case 'studentList':
          return renderStudentList();
      case 'studentDetails':
        return selectedStudent && <StudentDetailsView student={selectedStudent} plans={plans} trainer={currentTrainer} workoutTemplates={workoutTemplates} groups={studentGroups} onBack={onBackToStudentList} onUpdate={handleUpdateStudent} onDelete={handleDeleteStudent} onAddPayment={handleAddPayment} allStudents={students} />;
      case 'planManagement':
        return <PlanManagementView plans={plans} onAddPlan={handleAddPlan} onUpdatePlan={handleUpdatePlan} onDeletePlan={handleDeletePlan} onBack={onBackToWelcome} />;
      case 'workoutTemplates':
        return <WorkoutTemplateView onBack={onBackToWelcome} templates={workoutTemplates} trainerId={currentTrainer.id} onUpdate={fetchData} students={students} groups={studentGroups} />;
      case 'addStudent':
        return <AddStudentView plans={plans} onBack={onBackToStudentList} onAdd={handleAddStudent} allStudents={students} trainer={currentTrainer} />;
      case 'financialReport':
        return <FinancialReportView onBack={onBackToWelcome} payments={payments} students={students} onDeletePayment={handleDeletePayment} plans={plans} />;
      case 'profile':
        return <TrainerProfileView onBack={onBackToWelcome} trainer={currentTrainer} onSave={handleSaveProfile} onUpdatePassword={handleUpdateTrainerPassword} />;
      case 'schedule':
        return <ScheduleView students={students} plans={plans} onStudentClick={handleSelectStudent} />;
      case 'welcome':
      default:
        return <WelcomeDashboardView students={students} payments={payments} plans={plans} onStudentClick={handleSelectStudent} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-md z-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-1 text-brand-dark lg:hidden"
                    aria-label="Abrir menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                {currentTrainer.logoUrl ? 
                    <img src={currentTrainer.logoUrl} alt="Logo" className="h-10 w-auto" /> :
                    <h1 className="text-xl font-bold text-brand-dark">Dashboard</h1>
                }
            </div>
            <div className="text-right">
                <p className="font-semibold text-brand-dark">{currentTrainer.fullName || currentTrainer.username}</p>
                <p className="text-xs text-gray-500">Personal Trainer</p>
            </div>
          </div>
      </header>
      <div className="flex flex-1">
        <Sidebar 
            activeView={activeView} 
            setActiveView={setActiveView} 
            onLogout={onLogout} 
            pendingStudentsCount={pendingStudents.length}
            studentCount={students.length}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-brand-light overflow-y-auto">
            {renderActiveView()}
        </main>
      </div>

       <Modal 
            title="Link de Cadastro para Alunos" 
            isOpen={isCopyLinkModalOpen} 
            onClose={() => setCopyLinkModalOpen(false)}
        >
            <div className="space-y-4">
                <p>Compartilhe este link com seus novos alunos para que eles possam se cadastrar. As solicitações aparecerão no seu painel para aprovação.</p>
                <input 
                    type="text" 
                    readOnly 
                    value={`${window.location.origin}?trainer=${currentTrainer.id}`}
                    className="w-full bg-gray-100 border border-gray-300 rounded-md p-2"
                />
                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}?trainer=${currentTrainer.id}`);
                        alert('Link copiado!');
                    }}
                    className="w-full bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-accent transition-colors"
                >
                    Copiar Link
                </button>
            </div>
        </Modal>

      {isBulkEmailModalOpen && (
          <BulkEmailModal 
            isOpen={isBulkEmailModalOpen} 
            onClose={() => setBulkEmailModalOpen(false)} 
            students={students}
            trainer={currentTrainer}
          />
      )}
      {isGroupModalOpen && (
        <GroupManagementModal 
            isOpen={isGroupModalOpen} 
            onClose={() => setGroupModalOpen(false)} 
            groups={studentGroups}
            trainerId={currentTrainer.id}
            onUpdate={fetchData}
        />
      )}
    </div>
  );
};

export default Dashboard;
