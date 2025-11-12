import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { Student, Plan, Payment } from '../types';
import { UserIcon, DollarSignIcon, BriefcaseIcon, LogoutIcon, PlusIcon, ChartBarIcon } from './icons';
import StudentDetailsModal from './StudentDetailsModal';
import PlanManagementModal from './PlanManagementModal';
import AddStudentModal from './AddStudentModal';
import FinancialReportModal from './modals/FinancialReportModal';

interface DashboardProps {
  onLogout: () => void;
}

const Loader: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-primary"></div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isPlanModalOpen, setPlanModalOpen] = useState(false);
  const [isAddStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [isFinancialReportModalOpen, setFinancialReportModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const toISO = (ts: any) => ts && ts.toDate ? ts.toDate().toISOString() : null;
      
      // Fetch students
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const studentsList = studentsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          startDate: toISO(data.startDate) || new Date().toISOString(),
          paymentDueDate: toISO(data.paymentDueDate),
          sessions: (data.sessions || []).filter(Boolean).map((s: any) => ({ ...s, date: toISO(s.date) })),
        } as Student;
      });

      // Fetch plans
      const plansSnapshot = await getDocs(collection(db, 'plans'));
      const plansList = plansSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as Plan));

      // Fetch payments
      const paymentsQuery = query(collection(db, 'payments'), orderBy('paymentDate', 'desc'));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentsList = paymentsSnapshot.docs.map(docSnapshot => {
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
      console.error("Error fetching data:", err);
      setError("Não foi possível carregar os dados. Verifique a configuração do Firebase e sua conexão com a internet.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
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
        return s.remainingSessions != null && s.remainingSessions <= lowSessionThreshold;
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
        startDate: Timestamp.fromDate(new Date(newStudentData.startDate)),
        paymentDueDate: newStudentData.paymentDueDate ? Timestamp.fromDate(new Date(newStudentData.paymentDueDate)) : null,
    };
    const docRef = await addDoc(collection(db, 'students'), studentWithTimestamps);
    setStudents(prev => [...prev, { ...newStudentData, id: docRef.id }]);
  };
  
  const handleDeleteStudent = async (studentId: string) => {
      await deleteDoc(doc(db, 'students', studentId));
      setStudents(prev => prev.filter(s => s.id !== studentId));
      setSelectedStudent(null);
  }

  const handleAddPlan = async (planData: Omit<Plan, 'id'>) => {
    const docRef = await addDoc(collection(db, 'plans'), planData);
    setPlans(prev => [...prev, { ...planData, id: docRef.id }]);
  };

  const handleUpdatePlan = async (updatedPlan: Plan) => {
      const planRef = doc(db, 'plans', updatedPlan.id);
      const dataToUpdate = { ...updatedPlan };
      delete (dataToUpdate as any).id;
      await setDoc(planRef, dataToUpdate, { merge: true });
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
          paymentDate: Timestamp.fromDate(new Date(paymentData.paymentDate)),
      };
      const docRef = await addDoc(collection(db, 'payments'), paymentWithTimestamp);
      const newPayment = { ...paymentData, id: docRef.id };
      setPayments(prev => [newPayment, ...prev]);
  };

  const getPlan = (planId: string | null) => plans.find(p => p.id === planId);

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
          const situationText = `${remaining ?? 0} aulas restantes`;
          if (remaining == null || remaining <= 0) return { text: 'Sem Aulas', color: 'red', situation: situationText };
          if (remaining <= 3) return { text: 'Aulas Acabando', color: 'yellow', situation: situationText };
          return { text: 'Ativo', color: 'green', situation: situationText };
      }
      
      return { text: 'N/A', color: 'gray', situation: 'N/A' };
  };

  return (
    <>
      <div className="bg-brand-dark">
          <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Dashboard do Personal</h1>
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
            <button onClick={() => setFinancialReportModalOpen(true)} className="flex items-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors shadow">
                <ChartBarIcon className="w-5 h-5" /> Controle Financeiro
            </button>
        </div>

        {/* Students List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b">
                <h2 className="text-xl font-bold">Lista de Alunos</h2>
            </div>
            {loading ? <Loader /> : error ? <div className="p-8 text-center text-red-500">{error}</div> : (
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-brand-light">
                          <tr>
                              <th className="p-4 font-semibold">Nome</th>
                              <th className="p-4 font-semibold">Plano</th>
                              <th className="p-4 font-semibold">Situação</th>
                              <th className="p-4 font-semibold">Status</th>
                          </tr>
                      </thead>
                      <tbody>
                          {students.length > 0 ? students.map(student => {
                              const status = getStudentStatus(student);
                              const colorClasses = {
                                  red: 'text-red-800 bg-red-100',
                                  yellow: 'text-yellow-800 bg-yellow-100',
                                  green: 'text-green-800 bg-green-100',
                                  gray: 'text-gray-800 bg-gray-100',
                              }
                              return (
                                  <tr key={student.id} onClick={() => setSelectedStudent(student)} className="border-t hover:bg-gray-50 cursor-pointer">
                                      <td className="p-4 font-medium">{student.name}</td>
                                      <td className="p-4 text-gray-600">{getPlan(student.planId)?.name || 'N/A'}</td>
                                      <td className="p-4 text-gray-600">{status.situation}</td>
                                      <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[status.color]}`}>{status.text}</span>
                                      </td>
                                  </tr>
                              )
                          }) : (
                               <tr>
                                  <td colSpan={4} className="text-center p-8 text-gray-500">Nenhum aluno cadastrado.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
            )}
        </div>
      </main>

      {selectedStudent && (
        <StudentDetailsModal
          student={selectedStudent}
          plans={plans}
          onClose={() => setSelectedStudent(null)}
          onUpdate={handleUpdateStudent}
          onDelete={handleDeleteStudent}
          onAddPayment={handleAddPayment}
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
        />
      )}

      {isFinancialReportModalOpen && (
          <FinancialReportModal 
            isOpen={isFinancialReportModalOpen}
            onClose={() => setFinancialReportModalOpen(false)}
            payments={payments}
            students={students}
          />
      )}
    </>
  );
};

export default Dashboard;