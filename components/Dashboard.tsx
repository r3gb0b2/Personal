
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { db } from '../firebase';
// FIX: Changed firebase import path to use the scoped package '@firebase/firestore' to maintain consistency with the fix in `firebase.ts` and resolve potential module loading issues.
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc, Timestamp, query, orderBy, updateDoc, getDoc, where } from '@firebase/firestore';
import { AUTH_SESSION_KEY } from '../constants';
import { Student, Plan, Payment, Trainer, DaySchedule, WorkoutTemplate, PendingStudent, StudentGroup } from '../types';
import { UserIcon, DollarSignIcon, BriefcaseIcon, LogoutIcon, PlusIcon, ChartBarIcon, ExclamationCircleIcon, SettingsIcon, CalendarIcon, MailIcon, ClipboardListIcon, LinkIcon, UsersIcon, CheckCircleIcon } from './icons';
import StudentDetailsModal from './StudentDetailsModal';
import PlanManagementModal from './PlanManagementModal';
import AddStudentModal from './AddStudentModal';
import FinancialReportModal from './modals/FinancialReportModal';
import Modal from './modals/Modal';
import ScheduleView from './ScheduleView';
import BulkEmailModal from './modals/BulkEmailModal';
import WorkoutTemplateModal from './modals/WorkoutTemplateModal';
import GroupManagementModal from './modals/GroupManagementModal';

interface DashboardProps {
  onLogout: () => void;
  trainer: Trainer;
}

type SortKey = 'name' | 'plan' | 'status';
type SortDirection = 'asc' | 'desc';

type ActiveView = 'dashboard' | 'schedule' | 'studentDetails' | 'planManagement' | 'groupManagement' | 'addStudent' | 'financialReport' | 'profile' | 'bulkEmail' | 'copyLink' | 'workoutTemplates';


const Loader: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-primary"></div>
    </div>
);

// TrainerProfileView Component defined locally
const TrainerProfileView: React.FC<{
  onBack: () => void;
  trainer: Trainer;
  onSave: (profileData: Omit<Trainer, 'id' | 'username' | 'password'>) => Promise<void>;
  onUpdatePassword: (currentPassword: string, newPassword: string) => Promise<{success: boolean, message: string}>;
}> = ({ onBack, trainer, onSave, onUpdatePassword }) => {
  const [formData, setFormData] = useState({
    fullName: trainer.fullName || '',
    contactEmail: trainer.contactEmail || '',
    instagram: trainer.instagram || '',
    whatsapp: trainer.whatsapp || '',
  });

  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: ''});
  const [passwordMessage, setPasswordMessage] = useState({type: '', text: ''});
  const [isSaving, setIsSaving] = useState(false);

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
        onBack();
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
            <h2 className="text-2xl font-bold text-brand-dark">Meu Perfil e Contato</h2>
            <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Voltar</button>
        </div>

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
             <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-secondary rounded-md hover:bg-gray-700">Alterar Senha</button>
        </div>
      </form>
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
  
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'asc' });
  const [groupFilter, setGroupFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const toISO = (ts: any) => ts && ts.toDate ? ts.toDate().toISOString() : null;
      
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const plansSnapshot = await getDocs(collection(db, 'plans'));
      const paymentsSnapshot = await getDocs(query(collection(db, 'payments'), orderBy('paymentDate', 'desc')));
      const templatesSnapshot = await getDocs(collection(db, 'workoutTemplates'));
      const pendingStudentsQuery = query(collection(db, 'pendingStudents'), where("trainerId", "==", currentTrainer.id), where("status", "==", "pending"));
      const pendingStudentsSnapshot = await getDocs(pendingStudentsQuery);
      const groupsQuery = query(collection(db, 'studentGroups'), where("trainerId", "==", currentTrainer.id));
      const groupsSnapshot = await getDocs(groupsQuery);


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
          ...data,
          id: docSnapshot.id,
          startDate: toISO(data.startDate) || new Date().toISOString(),
          paymentDueDate: toISO(data.paymentDueDate),
          birthDate: toISO(data.birthDate),
          sessions: (data.sessions || []).filter(Boolean).map((s: any) => ({ ...s, date: toISO(s.date) })),
          schedule: scheduleData,
        } as Student;
      });

      const plansList = plansSnapshot.docs.filter(filterByTrainer).map(docSnapshot => ({ ...docSnapshot.data(), id: docSnapshot.id } as Plan));
      
      const templatesList = templatesSnapshot.docs.filter(filterByTrainer).map(docSnapshot => ({ ...docSnapshot.data(), id: docSnapshot.id } as WorkoutTemplate));

      const paymentsList = paymentsSnapshot.docs.filter(filterByTrainer).map(docSnapshot => {
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

      if (groupsList.length === 0) {
        // If no groups exist, create the defaults and refetch
        await Promise.all([
          addDoc(collection(db, 'studentGroups'), { name: 'Presencial', trainerId: currentTrainer.id }),
          addDoc(collection(db, 'studentGroups'), { name: 'Online', trainerId: currentTrainer.id })
        ]);
        const newGroupsSnapshot = await getDocs(groupsQuery);
        groupsList = newGroupsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as StudentGroup));
      }

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
  }, [currentTrainer.id, currentTrainer.username]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApproveStudent = async (pendingStudent: PendingStudent) => {
      // 1. Check for duplicate email
      const emailExists = students.some(
          student => student.email.toLowerCase() === pendingStudent.email.toLowerCase()
      );

      if (emailExists) {
          alert(
              `Erro: O e-mail "${pendingStudent.email}" já está cadastrado para outro aluno. ` +
              `Por favor, rejeite esta solicitação.`
          );
          return;
      }

      try {
          // 2. Create a complete student object with defaults for optional fields
          const newStudentData: Omit<Student, 'id'> = {
              name: pendingStudent.name,
              email: pendingStudent.email,
              phone: pendingStudent.phone,
              birthDate: pendingStudent.birthDate,
              startDate: new Date().toISOString(),
              planId: null,
              paymentDueDate: null,
              sessions: [],
              remainingSessions: null,
              profilePictureUrl: pendingStudent.profilePictureUrl || null,
              schedule: null,
              remindersSent: {},
              accessBlocked: false,
              groupIds: [],
              trainerId: pendingStudent.trainerId,
          };
          
          // 3. Add to Firestore with correct Timestamp conversion
          await addDoc(collection(db, 'students'), {
              ...newStudentData,
              startDate: Timestamp.fromDate(new Date(newStudentData.startDate)),
              birthDate: newStudentData.birthDate ? Timestamp.fromDate(new Date(newStudentData.birthDate)) : null
          });

          // 4. Delete the pending request
          await deleteDoc(doc(db, 'pendingStudents', pendingStudent.id));
          
          // 5. Refresh data and notify user
          fetchData(); // Refresh all data
          alert(`${pendingStudent.name} foi aprovado(a) e adicionado(a) à sua lista de alunos.`);
      } catch (error) {
          console.error("Error approving student:", error);
          alert("Ocorreu um erro ao aprovar o aluno. Verifique o console para mais detalhes.");
      }
  };


  const handleRejectStudent = async (pendingStudentId: string) => {
    if (window.confirm("Tem certeza que deseja rejeitar esta solicitação? A ação não pode ser desfeita.")) {
        try {
            await deleteDoc(doc(db, 'pendingStudents', pendingStudentId));
            fetchData();
            alert("Solicitação rejeitada com sucesso.");
        } catch(error) {
            console.error("Error rejecting student:", error);
            alert("Ocorreu um erro ao rejeitar a solicitação.");
        }
    }
  };

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
       if (s.accessBlocked) return false; // Exclude blocked students
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
        birthDate: updatedStudent.birthDate ? Timestamp.fromDate(new Date(updatedStudent.birthDate)) : null,
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
        birthDate: newStudentData.birthDate ? Timestamp.fromDate(new Date(newStudentData.birthDate)) : null,
    };
    const docRef = await addDoc(collection(db, 'students'), studentWithTimestamps);
    const newStudentWithId = { ...newStudentData, id: docRef.id, trainerId: currentTrainer.id };
    setStudents(prev => [...prev, newStudentWithId]);
    fetchData(); // Refresh to get all data consistent
    setSelectedStudent(newStudentWithId);
    setActiveView('studentDetails');
  };
  
  const handleDeleteStudent = async (studentId: string) => {
      await deleteDoc(doc(db, 'students', studentId));
      setStudents(prev => prev.filter(s => s.id !== studentId));
      setSelectedStudent(null);
      setActiveView('dashboard');
  }

  const handleAddPlan = async (planData: Omit<Plan, 'id'>) => {
    const planToAdd = { ...planData, trainerId: currentTrainer.id };
    const docRef = await addDoc(collection(db, 'plans'), planToAdd);
    setPlans(prev => [...prev, { ...planToAdd, id: docRef.id }]);
  };

  const handleUpdatePlan = async (updatedPlan: Plan) => {
      const planRef = doc(db, 'plans', updatedPlan.id);
      // Ensure trainerId is always set to the current trainer. This prevents errors when updating
      // legacy plans that might not have a trainerId, which would cause Firestore to reject
      // an 'undefined' value. It also correctly assigns ownership.
      const dataToUpdate = { 
          ...updatedPlan,
          trainerId: currentTrainer.id 
      };
      delete (dataToUpdate as any).id;
      await setDoc(planRef, dataToUpdate);

      // Create a final version of the plan with the correct trainerId for local state update
      const finalUpdatedPlan = { ...updatedPlan, trainerId: currentTrainer.id };
      setPlans(prev => prev.map(p => p.id === updatedPlan.id ? finalUpdatedPlan : p));
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
          if (dueDate <= nextWeek) return { text: 'Vence em breve', color: 'yellow', situation: situationText };

          return { text: 'Ativo', color: 'green', situation: situationText };
      }

      if (plan.type === 'session') {
          const remaining = student.remainingSessions;
          if (remaining == null || isNaN(remaining)) {
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
  
  const renderDashboard = () => (
    <>
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
            <button onClick={() => setActiveView('addStudent')} className="flex items-center gap-2 bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-accent transition-colors shadow">
                <PlusIcon className="w-5 h-5" /> Adicionar Aluno
            </button>
            <button onClick={() => setActiveView('planManagement')} className="flex items-center gap-2 bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors shadow">
                <BriefcaseIcon className="w-5 h-5" /> Gerenciar Planos
            </button>
            <button onClick={() => setActiveView('groupManagement')} className="flex items-center gap-2 bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-700 transition-colors shadow">
                <UsersIcon className="w-5 h-5" /> Gerenciar Grupos
            </button>
            <button onClick={() => setActiveView('copyLink')} className="flex items-center gap-2 bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors shadow">
                <LinkIcon className="w-5 h-5" /> Link de Cadastro
            </button>
             <button onClick={() => setActiveView('workoutTemplates')} className="flex items-center gap-2 bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors shadow">
                <ClipboardListIcon className="w-5 h-5" /> Modelos de Treino
            </button>
             <button onClick={() => setActiveView('schedule')} className="flex items-center gap-2 bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors shadow">
                <CalendarIcon className="w-5 h-5" /> Ver Agenda
            </button>
             <button onClick={() => setActiveView('bulkEmail')} className="flex items-center gap-2 bg-orange-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors shadow">
                <MailIcon className="w-5 h-5" /> Enviar E-mail
            </button>
            <button onClick={() => setActiveView('financialReport')} className="flex items-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors shadow">
                <ChartBarIcon className="w-5 h-5" /> Controle Financeiro
            </button>
            <button onClick={() => setActiveView('profile')} className="relative flex items-center gap-2 bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors shadow">
                <SettingsIcon className="w-5 h-5" /> Meu Perfil
            </button>
        </div>
        
        {pendingStudents.length > 0 && (
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-300 rounded-lg shadow-sm">
                <h3 className="font-bold text-lg text-yellow-900 mb-3">{pendingStudents.length} Nova(s) Solicitação(ões) de Cadastro</h3>
                <div className="space-y-2">
                    {pendingStudents.map(ps => (
                        <div key={ps.id} className="flex items-center justify-between p-3 bg-white rounded-md border">
                            <div className="flex items-center gap-3">
                                {ps.profilePictureUrl ? (
                                    <img src={ps.profilePictureUrl} alt={ps.name} className="w-10 h-10 rounded-full object-cover"/>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                        <UserIcon className="w-6 h-6 text-gray-500"/>
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold">{ps.name}</p>
                                    <p className="text-sm text-gray-500">{ps.email}</p>
                                </div>
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

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                  <h2 className="text-xl font-bold">Lista de Alunos</h2>
                  <div>
                    <label htmlFor="group-filter" className="text-sm font-medium text-gray-700 mr-2">Filtrar por Grupo:</label>
                    <select id="group-filter" value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="border-gray-300 rounded-md shadow-sm text-sm">
                        <option value="all">Todos os Grupos</option>
                        {studentGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
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
                                <SortableHeader sortKey="name" label="Nome" />
                                <SortableHeader sortKey="plan" label="Plano" />
                                <th className="p-4 font-semibold">Grupos</th>
                                <th className="p-4 font-semibold">Situação</th>
                                <SortableHeader sortKey="status" label="Status" />
                            </tr>
                        </thead>
                        <tbody>
                            {sortedStudents.length > 0 ? sortedStudents.map(student => {
                                const status = getStudentStatus(student);
                                const colorClasses: { [key: string]: string } = {
                                    red: 'text-red-800 bg-red-100',
                                    yellow: 'text-yellow-800 bg-yellow-100',
                                    green: 'text-green-800 bg-green-100',
                                    gray: 'text-gray-800 bg-gray-100',
                                }
                                const groups = student.groupIds?.map(gid => studentGroups.find(g => g.id === gid)?.name).filter(Boolean) || [];
                                return (
                                    <tr key={student.id} onClick={() => handleSelectStudent(student.id)} className="border-t hover:bg-gray-50 cursor-pointer">
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
                                        <td className="p-4 text-gray-600 text-sm">
                                            {groups.length > 0 ? groups.map(g => <span key={g} className="inline-block bg-gray-200 rounded-full px-2 py-1 text-xs mr-1 mb-1">{g}</span>) : 'N/A'}
                                        </td>
                                        <td className="p-4 text-gray-600">{status.situation}</td>
                                        <td className="p-4">
                                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[status.color]}`}>{status.text}</span>
                                        </td>
                                    </tr>
                                )
                            }) : (
                                  <tr>
                                    <td colSpan={5} className="text-center p-8 text-gray-500">Nenhum aluno encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
              )}
          </div>
    </>
  );
  
  const renderActiveView = () => {
    const onBack = () => {
      setActiveView('dashboard');
      setSelectedStudent(null);
    }

    switch(activeView) {
      case 'studentDetails':
        return selectedStudent && <StudentDetailsModal student={selectedStudent} plans={plans} trainer={currentTrainer} workoutTemplates={workoutTemplates} groups={studentGroups} onBack={onBack} onUpdate={handleUpdateStudent} onDelete={handleDeleteStudent} onAddPayment={handleAddPayment} allStudents={students} />;
      case 'planManagement':
        return <PlanManagementModal plans={plans} onAddPlan={handleAddPlan} onUpdatePlan={handleUpdatePlan} onDeletePlan={handleDeletePlan} onBack={onBack} />;
      case 'groupManagement':
        return <GroupManagementModal isOpen={true} onBack={onBack} groups={studentGroups} trainerId={currentTrainer.id} onUpdate={fetchData} />;
      case 'workoutTemplates':
        return <WorkoutTemplateModal isOpen={true} onBack={onBack} templates={workoutTemplates} trainerId={currentTrainer.id} onUpdate={fetchData} students={students} groups={studentGroups} />;
      case 'addStudent':
        return <AddStudentModal plans={plans} onBack={onBack} onAdd={handleAddStudent} allStudents={students} trainer={currentTrainer} />;
      case 'financialReport':
        return <FinancialReportModal isOpen={true} onBack={onBack} payments={payments} students={students} onDeletePayment={handleDeletePayment} />;
      case 'profile':
        return <TrainerProfileView onBack={onBack} trainer={currentTrainer} onSave={handleSaveProfile} onUpdatePassword={handleUpdateTrainerPassword} />;
      case 'bulkEmail':
        return <BulkEmailModal isOpen={true} onBack={onBack} students={students} trainer={currentTrainer} />;
      case 'schedule':
        return <ScheduleView students={students} plans={plans} onStudentClick={handleSelectStudent} />;
      case 'copyLink':
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Link de Cadastro para Alunos</h2>
                    <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Voltar</button>
                </div>
                <div className="space-y-4">
                    <p>Compartilhe este link com novos alunos para que eles possam se cadastrar. As solicitações aparecerão no seu painel para aprovação.</p>
                    <input 
                        type="text" 
                        readOnly 
                        value={`${window.location.origin}?trainer=${currentTrainer.id}`}
                        className="w-full p-2 border rounded bg-gray-100"
                    />
                    <button
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}?trainer=${currentTrainer.id}`)}
                        className="w-full px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent"
                    >
                        Copiar Link
                    </button>
                </div>
            </div>
        );
      case 'dashboard':
      default:
        return renderDashboard();
    }
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
        {renderActiveView()}
      </main>
    </>
  );
};

export default Dashboard;
