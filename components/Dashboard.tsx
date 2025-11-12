import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { Student, Plan } from '../types';
import { UserIcon, DollarSignIcon, BriefcaseIcon, LogoutIcon, PlusIcon } from './icons';
import StudentDetailsModal from './StudentDetailsModal';
import PlanManagementModal from './PlanManagementModal';
import AddStudentModal from './AddStudentModal';

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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isPlanModalOpen, setPlanModalOpen] = useState(false);
  const [isAddStudentModalOpen, setAddStudentModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch students
      const studentsCollection = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsCollection);
      const studentsList = studentsSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        const toISO = (ts: any) => ts && ts.toDate ? ts.toDate().toISOString() : null;
        return {
          id: docSnapshot.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          planId: data.planId || null,
          startDate: toISO(data.startDate) || new Date().toISOString(),
          paymentDueDate: toISO(data.paymentDueDate),
          sessions: (data.sessions || []).map((s: any) => ({ ...s, date: toISO(s.date) })),
        } as Student;
      });

      // Fetch plans
      const plansCollection = collection(db, 'plans');
      const plansSnapshot = await getDocs(plansCollection);
      const plansList = plansSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as Plan));

      setStudents(studentsList);
      setPlans(plansList);
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
  
  const upcomingPayments = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return students
      .filter(s => s.paymentDueDate && new Date(s.paymentDueDate) <= nextWeek)
      .sort((a, b) => new Date(a.paymentDueDate!).getTime() - new Date(b.paymentDueDate!).getTime());
  }, [students]);

  const activeStudents = useMemo(() => {
    return students.filter(s => s.paymentDueDate && new Date(s.paymentDueDate) > new Date());
  }, [students]);

  const handleUpdateStudent = async (updatedStudent: Student) => {
    const studentRef = doc(db, 'students', updatedStudent.id);
    const dataToUpdate = {
        ...updatedStudent,
        startDate: Timestamp.fromDate(new Date(updatedStudent.startDate)),
        paymentDueDate: updatedStudent.paymentDueDate ? Timestamp.fromDate(new Date(updatedStudent.paymentDueDate)) : null,
        sessions: updatedStudent.sessions.map(s => ({ ...s, date: Timestamp.fromDate(new Date(s.date))}))
    };
    delete (dataToUpdate as any).id;
    await setDoc(studentRef, dataToUpdate);
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

  const handleDeletePlan = async (planId: string) => {
      if(window.confirm("Tem certeza que deseja excluir este plano? Alunos associados a ele não serão afetados, mas você não poderá adicioná-lo a novos alunos.")) {
          await deleteDoc(doc(db, 'plans', planId));
          setPlans(prev => prev.filter(p => p.id !== planId));
      }
  }

  const getPlanName = (planId: string | null) => plans.find(p => p.id === planId)?.name || 'N/A';
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

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
                    <p className="text-gray-500 text-sm">Vencimentos Próximos</p>
                    <p className="text-2xl font-bold text-brand-dark">{upcomingPayments.length}</p>
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
                              <th className="p-4 font-semibold">Vencimento</th>
                              <th className="p-4 font-semibold">Status</th>
                          </tr>
                      </thead>
                      <tbody>
                          {students.length > 0 ? students.map(student => {
                              const isDue = student.paymentDueDate && new Date(student.paymentDueDate) < new Date();
                              const dueDate = new Date(student.paymentDueDate || 0);
                              const now = new Date();
                              now.setHours(0,0,0,0);
                              const isDueSoon = student.paymentDueDate && dueDate >= now && (dueDate.getTime() - now.getTime()) <= 7 * 24 * 60 * 60 * 1000;

                              return (
                                  <tr key={student.id} onClick={() => setSelectedStudent(student)} className="border-t hover:bg-gray-50 cursor-pointer">
                                      <td className="p-4 font-medium">{student.name}</td>
                                      <td className="p-4 text-gray-600">{getPlanName(student.planId)}</td>
                                      <td className="p-4 text-gray-600">{formatDate(student.paymentDueDate)}</td>
                                      <td className="p-4">
                                          {isDue ? <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">Vencido</span>
                                          : isDueSoon ? <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">Vence em breve</span>
                                          : <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Ativo</span>}
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
        />
      )}
      
      {isPlanModalOpen && (
        <PlanManagementModal
            plans={plans}
            onAddPlan={handleAddPlan}
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
    </>
  );
};

export default Dashboard;