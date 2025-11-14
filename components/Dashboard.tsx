import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc, Timestamp, query, orderBy, updateDoc, getDoc } from 'firebase/firestore';
import { AUTH_SESSION_KEY } from '../constants';
import { Student, Plan, Payment, Trainer, DaySchedule } from '../types';
import { UserIcon, DollarSignIcon, BriefcaseIcon, LogoutIcon, PlusIcon, ChartBarIcon, ExclamationCircleIcon, SettingsIcon, CalendarIcon, MailIcon } from './icons';
import StudentDetailsModal from './StudentDetailsModal';
import PlanManagementModal from './PlanManagementModal';
import AddStudentModal from './AddStudentModal';
import FinancialReportModal from './modals/FinancialReportModal';
import Modal from './modals/Modal';
import ScheduleView from './ScheduleView';
import BulkEmailModal from './modals/BulkEmailModal';
import { sendEmail, EmailPayload } from '../services/emailService';

interface DashboardProps {
  onLogout: () => void;
  trainer: Trainer;
}

const Loader: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-primary"></div>
    </div>
);

// TrainerProfileModal Component defined locally
const TrainerProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  trainer: Trainer;
  onSave: (profileData: Omit<Trainer, 'id' | 'username' | 'password'>) => Promise<void>;
  onUpdatePassword: (currentPassword: string, newPassword: string) => Promise<{success: boolean, message: string}>;
}> = ({ isOpen, onClose, trainer, onSave, onUpdatePassword }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    contactEmail: '',
    instagram: '',
    whatsapp: '',
  });

  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: ''});
  const [passwordMessage, setPasswordMessage] = useState({type: '', text: ''});
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    // Sync form with props only when modal opens or trainer prop changes.
    if (isOpen) {
        setFormData({
            fullName: trainer.fullName || '',
            contactEmail: trainer.contactEmail || '',
            instagram: trainer.instagram || '',
            whatsapp: trainer.whatsapp || '',
        });
        // Reset password fields and messages
        setPasswordData({ current: '', new: '', confirm: ''});
        setPasswordMessage({type: '', text: ''});
        setIsSyncing(false);
    } else {
        setIsSyncing(true); // Allow sync for next open
    }
  }, [trainer, isOpen]);
  
  if (isSyncing) return null;


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]: value}));
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        await onSave(formData);
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
    <Modal title="Meu Perfil e Contato" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome Completo (Exibição)</label>
          <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email de Contato (Para respostas dos alunos)</label>
          <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Instagram (apenas usuário, sem @)</label>
          <input type="text" name="instagram" value={formData.instagram} onChange={handleInputChange} placeholder="ex: seunome" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">WhatsApp (com código do país)</label>
          <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} placeholder="ex: 5511999998888" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
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
             <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Fechar</button>
             <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-secondary rounded-md hover:bg-gray-700">Alterar Senha</button>
        </div>
      </form>
    </Modal>
  );
};


const Dashboard: React.FC<DashboardProps> = ({ onLogout, trainer }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentTrainer, setCurrentTrainer] = useState<Trainer>(trainer);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'schedule'>('list');

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isPlanModalOpen, setPlanModalOpen] = useState(false);
  const [isAddStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [isFinancialReportModalOpen, setFinancialReportModalOpen] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isBulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const toISO = (ts: any) => ts && ts.toDate ? ts.toDate().toISOString() : null;
      
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const plansSnapshot = await getDocs(collection(db, 'plans'));
      const paymentsSnapshot = await getDocs(query(collection(db, 'payments'), orderBy('paymentDate', 'desc')));

      const filterByTrainer = (doc: any) => {
          const data = doc.data();
          return data.trainerId === currentTrainer.id || (currentTrainer.username === 'bruno' && !data.trainerId);
      };

      const studentsList = studentsSnapshot.docs.filter(filterByTrainer).map(docSnapshot => {
        const data = docSnapshot.data();
        let scheduleData = data.schedule || null;
        if (scheduleData && !Array.isArray(scheduleData)) {
            if (typeof scheduleData === 'object' && scheduleData.day && scheduleData.startTime) {
                scheduleData = [scheduleData];
            } else {
                scheduleData = null;
            }
        }

        return {
          id: docSnapshot.id,
          ...data,
          startDate: toISO(data.startDate) || new Date().toISOString(),
          paymentDueDate: toISO(data.paymentDueDate),
          sessions: (data.sessions || []).filter(Boolean).map((s: any) => ({ ...s, date: toISO(s.date) })),
          schedule: scheduleData,
        } as Student;
      });

      const plansList = plansSnapshot.docs.filter(filterByTrainer).map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as Plan));

      const paymentsList = paymentsSnapshot.docs.filter(filterByTrainer).map(docSnapshot => {
        const data = docSnapshot.data();
        return {
            id: docSnapshot.id,
            ...data,
            paymentDate: toISO(data.paymentDate),
        } as Payment;
      });

      setStudents(studentsList);
      setPlans(plansList);
      setPayments(paymentsList);

    } catch (err) {
      console.error("Firebase Connection Error Details:", err);
      setError("CONNECTION_ERROR");
    } finally {
      setLoading(false);
    }
  }, [currentTrainer.id, currentTrainer.username]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveProfile = async (
    profileData: Omit<Trainer, 'id' | 'username' | 'password'>
  ) => {
    try {
        const trainerRef = doc(db, 'trainers', currentTrainer.id);

        await updateDoc(trainerRef, profileData);

        // Update local state for immediate UI feedback without a page reload
        const updatedTrainer = { ...currentTrainer, ...profileData };
        setCurrentTrainer(updatedTrainer);
        
        // Update session storage so a future refresh still has the data
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updatedTrainer));
        
        alert("Perfil salvo com sucesso!");
        setProfileModalOpen(false); // Close the modal on success

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
  
  const upcomingExpirations = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const lowSessionThreshold = 3;

    return students.filter(s => {
      const plan = plans.find(p => p.id === s.planId);
      if (!plan) return false;

      if (plan.type === 'duration') {
        return s.paymentDueDate && new Date(s.paymentDueDate) <= nextWeek;
      }
      if (plan.type === 'session') {
        return s.remainingSessions != null && s.remainingSessions > 0 && s.remainingSessions <= lowSessionThreshold;
      }
      return false;
    });
  }, [students, plans]);

  const activeStudents = useMemo(() => {
    return students.filter(s => {
       const plan = plans.find(p => p.id === s.planId);
       if (!plan) return false;
       if (plan.type === 'duration') {
           return s.paymentDueDate && new Date(s.paymentDueDate) > new Date();
       }
       if (plan.type === 'session') {
           return s.remainingSessions != null && s.remainingSessions > 0;
       }
       return false;
    });
  }, [students, plans]);

  const handleUpdateStudent = async (updatedStudent: Student) => {
    const studentRef = doc(db, 'students', updatedStudent.id);
    const dataToUpdate = {
        ...updatedStudent,
        trainerId: currentTrainer.id,
        startDate: Timestamp.fromDate(new Date(updatedStudent.startDate)),
        paymentDueDate: updatedStudent.paymentDueDate ? Timestamp.fromDate(new Date(updatedStudent.paymentDueDate)) : null,
        sessions: updatedStudent.sessions.map(s => ({ ...s, date: Timestamp.fromDate(new Date(s.date))}))
    };
    delete (dataToUpdate as any).id;
    await setDoc(studentRef, dataToUpdate, { merge: true });
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    setSelectedStudent(updatedStudent);
  };

  const handleAddStudent = async (newStudentData: Omit<Student, 'id'>) => {
    const studentWithTimestamps = {
        ...newStudentData,
        trainerId: currentTrainer.id,
        startDate: Timestamp.fromDate(new Date(newStudentData.startDate)),
        paymentDueDate: newStudentData.paymentDueDate ? Timestamp.fromDate(new Date(newStudentData.paymentDueDate)) : null,
    };
    const docRef = await addDoc(collection(db, 'students'), studentWithTimestamps);
    setStudents(prev => [...prev, { ...newStudentData, id: docRef.id, trainerId: currentTrainer.id }]);
  };
  
  const handleDeleteStudent = async (studentId: string) => {
      await deleteDoc(doc(db, 'students', studentId));
      setStudents(prev => prev.filter(s => s.id !== studentId));
      setSelectedStudent(null);
  }

  const handleAddPlan = async (planData: Omit<Plan, 'id'>) => {
    const planToAdd = { ...planData, trainerId: currentTrainer.id };
    const docRef = await addDoc(collection(db, 'plans'), planToAdd);
    setPlans(prev => [...prev, { ...planToAdd, id: docRef.id }]);
  };

  const handleUpdatePlan = async (updatedPlan: Plan) => {
      const planRef = doc(db, 'plans', updatedPlan.id);
      const dataToUpdate = { ...updatedPlan };
      delete (dataToUpdate as any).id;
      await setDoc(planRef, dataToUpdate);
      setPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
  }

  const handleDeletePlan = async (planId: string) => {
      if(window.confirm("Tem certeza que deseja excluir este plano? Alunos associados a ele não serão afetados, mas você não poderá adicioná-lo a novos alunos.")) {
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
    if (window.confirm("Tem certeza que deseja excluir este lançamento financeiro? Esta ação não pode ser desfeita.")) {
      try {
        await deleteDoc(doc(db, 'payments', paymentId));
        setPayments(prev => prev.filter(p => p.id !== paymentId));
      } catch (err) {
        console.error("Error deleting payment:", err);
        alert("Não foi possível excluir o lançamento. Tente novamente.");
      }
    }
  };

  const getPlan = (planId: string | null) => plans.find(p => p.id === planId);

  const formatSchedule = (schedule: DaySchedule[] | null | undefined): string => {
    if (!schedule || schedule.length === 0) {
        return 'N/A';
    }

    const dayMap: { [key: string]: string } = {
        sunday: 'Dom',
        monday: 'Seg',
        tuesday: 'Ter',
        wednesday: 'Qua',
        thursday: 'Qui',
        friday: 'Sex',
        saturday: 'Sáb',
    };
    
    const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    const sortedSchedule = [...schedule].sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));

    return sortedSchedule.map(item => 
        `${dayMap[item.day] || item.day} ${item.startTime}-${item.endTime}`
    ).join(' | ');
  };

  const getStudentStatus = (student: Student) => {
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
          if (dueDate <= nextWeek) return { text: 'Vence em breve', color: 'yellow', situation: situationText };

          return { text: 'Ativo', color: 'green', situation: situationText };
      }

      if (plan.type === 'session') {
          const remaining = student.remainingSessions;
          if (remaining == null) {
              return { text: 'Ativo', color: 'green', situation: 'Sessões não monitoradas' };
          }
          if (remaining < 0) {
              const plural = Math.abs(remaining) > 1;
              return { text: 'Devendo', color: 'red', situation: `${Math.abs(remaining)} aula${plural ? 's' : ''} a deduzir` };
          }
          if (remaining === 0) {
              return { text: 'Sem Aulas', color: 'red', situation: 'Nenhuma aula restante' };
          }
          if (remaining <= 3) {
              const plural = remaining > 1;
              return { text: 'Aulas Acabando', color: 'yellow', situation: `${remaining} aula${plural ? 's' : ''} restante${plural ? 's' : ''}` };
          }
          return { text: 'Ativo', color: 'green', situation: `${remaining} aulas restantes` };
      }
      
      return { text: 'N/A', color: 'gray', situation: 'N/A' };
  };

  return (
    <>
      <div className="bg-brand-dark">
          <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Dashboard do Personal - [{currentTrainer.fullName || currentTrainer.username}]</h1>
            <button onClick={onLogout} className="flex items-center gap-2 text-white hover:text-red-400 transition-colors">
              <LogoutIcon className="w-5 h-5" />
              <span>Sair</span>
            </button>
          </header>
      </div>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-full"><UserIcon className="w-8 h-8 text-blue-500"/></div>
                <div>
                    <p className="text-gray-500 text-sm">Total de Alunos</p>
                    <p className="text-2xl font-bold text-brand-dark">{students.length}</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-full"><DollarSignIcon className="w-8 h-8 text-green-500"/></div>
                <div>
                    <p className="text-gray-500 text-sm">Alunos Ativos</p>
                    <p className="text-2xl font-bold text-brand-dark">{activeStudents.length}</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-4">
                <div className="bg-yellow-100 p-3 rounded-full"><DollarSignIcon className="w-8 h-8 text-yellow-500"/></div>
                <div>
                    <p className="text-gray-500 text-sm">Avisos Próximos</p>
                    <p className="text-2xl font-bold text-brand-dark">{upcomingExpirations.length}</p>
                </div>
            </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
            <button onClick={() => setAddStudentModalOpen(true)} className="flex items-center gap-2 bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-accent transition-colors shadow">
                <PlusIcon className="w-5 h-5" /> Adicionar Aluno
            </button>
            <button onClick={() => setPlanModalOpen(true)} className="flex items-center gap-2 bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors shadow">
                <BriefcaseIcon className="w-5 h-5" /> Gerenciar Planos
            </button>
             <button onClick={() => setView(view === 'list' ? 'schedule' : 'list')} className="flex items-center gap-2 bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors shadow">
                <CalendarIcon className="w-5 h-5" /> {view === 'list' ? 'Ver Agenda' : 'Ver Lista de Alunos'}
            </button>
             <button onClick={() => setBulkEmailModalOpen(true)} className="flex items-center gap-2 bg-orange-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors shadow">
                <MailIcon className="w-5 h-5" /> Enviar E-mail
            </button>
            <button onClick={() => setFinancialReportModalOpen(true)} className="flex items-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors shadow">
                <ChartBarIcon className="w-5 h-5" /> Controle Financeiro
            </button>
            <button onClick={() => setProfileModalOpen(true)} className="relative flex items-center gap-2 bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors shadow">
                <SettingsIcon className="w-5 h-5" /> Meu Perfil
            </button>
        </div>

        {view === 'schedule' ? (
            <ScheduleView students={students} />
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b">
                  <h2 className="text-xl font-bold">Lista de Alunos</h2>
              </div>
              {loading ? <Loader /> : error ? (
                  <div className="m-4 sm:m-6 lg:m-8 bg-red-50 border border-red-200 p-6 rounded-lg shadow-sm">
                      <div className="flex items-start">
                          <div className="flex-shrink-0">
                              <ExclamationCircleIcon className="h-8 w-8 text-red-500" />
                          </div>
                          <div className="ml-4 flex-1">
                              <h3 className="text-lg font-bold text-red-800">Ação Necessária: Erro de Acesso ao Banco de Dados</h3>
                              {error === "CONNECTION_ERROR" ? (
                                  <div className="mt-2 text-sm text-red-700 space-y-4">
                                      <p>A aplicação não conseguiu se conectar ou ler os dados do seu banco de dados Firebase. A causa exata está no console do seu navegador.</p>
                                      
                                      <div className="p-3 bg-red-100 rounded-md border border-red-300">
                                          <h4 className="font-bold text-red-900">Como Diagnosticar o Erro Exato</h4>
                                          <ol className="list-decimal list-inside space-y-1 mt-1 text-red-800">
                                              <li>Pressione a tecla <strong className="font-mono bg-white text-red-900 px-1 py-0.5 rounded">F12</strong> no seu teclado para abrir o "Console do Desenvolvedor".</li>
                                              <li>Recarregue a página e tente realizar a ação novamente.</li>
                                              <li>Procure por uma mensagem de erro em vermelho que começa com <strong className="font-mono">"Firebase Connection Error Details:"</strong>. O texto que se segue é o erro real.</li>
                                          </ol>
                                      </div>
                                      
                                      <div>
                                          <h4 className="font-bold">Soluções Para Erros Comuns</h4>
                                          <p className="mb-2">Com base no erro que você encontrou no console, aqui estão as soluções:</p>
                                          <div className="space-y-3 pl-2">
                                              
                                              <div className="border-l-4 border-red-300 pl-3">
                                                  <p className="font-semibold text-red-800">SE O ERRO DIZ: <strong className="font-mono">"The query requires an index"</strong></p>
                                                  <p className="mt-1">Este é o erro mais comum após a configuração inicial. Significa que o banco de dados precisa de um "índice" para buscar os dados de forma eficiente.</p>
                                                  <ol className="list-decimal list-inside space-y-1 mt-2 text-red-800">
                                                      <li>A própria mensagem de erro no console contém um <strong>link longo</strong>.</li>
                                                      <li><strong>Clique nesse link.</strong> Ele o levará diretamente ao Firebase Console.</li>
                                                      <li>Uma janela aparecerá para criar o índice. Apenas clique em <strong>"Criar"</strong>.</li>
                                                      <li>A criação do índice pode levar alguns minutos. Aguarde e depois atualize a aplicação. O problema estará resolvido.</li>
                                                  </ol>
                                              </div>

                                              <div className="border-l-4 border-red-300 pl-3 pt-2">
                                                  <p className="font-semibold text-red-800">SE O ERRO DIZ: <strong className="font-mono">"permission-denied"</strong></p>
                                                  <p className="mt-1">Isto significa que suas <strong>Regras de Segurança</strong> do Firestore estão bloqueando o acesso. Para desenvolvimento, você pode usar regras abertas.</p>
                                                  <p className="mt-1">Vá para a seção <strong>Firestore Database &gt; Rules</strong> no seu Firebase Console e cole as seguintes regras:</p>
                                                  <pre className="mt-1 p-2 bg-red-100 text-red-900 rounded text-xs whitespace-pre-wrap font-mono">
                                                      {`rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`}
                                                  </pre>
                                              </div>

                                              <div className="border-l-4 border-red-300 pl-3 pt-2">
                                                  <p className="font-semibold text-red-800">OUTROS ERROS (ex: <strong className="font-mono">invalid-api-key</strong>, <strong className="font-mono">NOT_FOUND</strong>)</p>
                                                  <p className="mt-1">Estes erros geralmente indicam um problema de configuração no arquivo <strong>\`firebase.ts\`</strong>. Verifique se você copiou e colou <strong>exatamente</strong> as credenciais do seu projeto Firebase.</p>
                                              </div>
                                              
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="mt-2 text-sm text-red-700">
                                    <p>{error}</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-brand-light">
                            <tr>
                                <th className="p-4 font-semibold">Nome</th>
                                <th className="p-4 font-semibold">Plano</th>
                                <th className="p-4 font-semibold">Horário</th>
                                <th className="p-4 font-semibold">Situação</th>
                                <th className="p-4 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.length > 0 ? students.map(student => {
                                const status = getStudentStatus(student);
                                const colorClasses: { [key: string]: string } = {
                                    red: 'text-red-800 bg-red-100',
                                    yellow: 'text-yellow-800 bg-yellow-100',
                                    green: 'text-green-800 bg-green-100',
                                    gray: 'text-gray-800 bg-gray-100',
                                }
                                return (
                                    <tr key={student.id} onClick={() => setSelectedStudent(student)} className="border-t hover:bg-gray-50 cursor-pointer">
                                        <td className="p-4 font-medium">
                                            <div className="flex items-center gap-3">
                                                {student.profilePictureUrl ? (
                                                    <img src={student.profilePictureUrl} alt={student.name} className="w-10 h-10 rounded-full object-cover"/>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                        <UserIcon className="w-6 h-6 text-gray-500"/>
                                                    </div>
                                                )}
                                                <span>{student.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600">{getPlan(student.planId)?.name || 'N/A'}</td>
                                        <td className="p-4 text-gray-600">{formatSchedule(student.schedule)}</td>
                                        <td className="p-4 text-gray-600">{status.situation}</td>
                                        <td className="p-4">
                                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[status.color]}`}>{status.text}</span>
                                        </td>
                                    </tr>
                                )
                            }) : (
                                  <tr>
                                    <td colSpan={5} className="text-center p-8 text-gray-500">Nenhum aluno cadastrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
              )}
          </div>
        )}
      </main>

      {selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          plans={plans}
          trainer={currentTrainer}
          onClose={() => setSelectedStudent(null)}
          onUpdate={handleUpdateStudent}
          onDelete={handleDeleteStudent}
          onAddPayment={handleAddPayment}
          allStudents={students}
        />
      )}
      
      {isPlanModalOpen && (
        <PlanManagementModal
            plans={plans}
            onAddPlan={handleAddPlan}
            onUpdatePlan={handleUpdatePlan}
            onDeletePlan={handleDeletePlan}
            onClose={() => setPlanModalOpen(false)}
        />
      )}

      {isAddStudentModalOpen && (
        <AddStudentModal 
            plans={plans}
            onClose={() => setAddStudentModalOpen(false)}
            onAdd={handleAddStudent}
            allStudents={students}
        />
      )}

      {isFinancialReportModalOpen && (
          <FinancialReportModal 
            isOpen={isFinancialReportModalOpen}
            onClose={() => setFinancialReportModalOpen(false)}
            payments={payments}
            students={students}
            onDeletePayment={handleDeletePayment}
          />
      )}

      {isProfileModalOpen && (
        <TrainerProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setProfileModalOpen(false)}
            trainer={currentTrainer}
            onSave={handleSaveProfile}
            onUpdatePassword={handleUpdateTrainerPassword}
        />
      )}

      {isBulkEmailModalOpen && (
        <BulkEmailModal
          isOpen={isBulkEmailModalOpen}
          onClose={() => setBulkEmailModalOpen(false)}
          students={students}
          trainer={currentTrainer}
        />
      )}
    </>
  );
};

export default Dashboard;