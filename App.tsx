
import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import StudentLogin from './components/student/StudentLogin';
import StudentPortal from './components/student/StudentPortal';
import { APP_PASSWORD, AUTH_SESSION_KEY } from './constants';
import { Student, Plan, Payment } from './types';

type View = 'trainerLogin' | 'dashboard' | 'studentLogin' | 'studentPortal';

const App: React.FC = () => {
  const [view, setView] = useState<View>('trainerLogin');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentStudentData, setCurrentStudentData] = useState<{ student: Student; payments: Payment[] } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (sessionAuth === 'true') {
      setView('dashboard');
    }
  }, []);
  
  const fetchPlans = useCallback(async () => {
    try {
        const plansSnapshot = await getDocs(collection(db, 'plans'));
        const plansList = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
        setPlans(plansList);
    } catch (e) {
        console.error("Could not fetch plans", e);
    }
  }, []);

  useEffect(() => {
      // Fetch plans once on initial load for the student portal
      if(plans.length === 0) {
          fetchPlans();
      }
  }, [plans, fetchPlans]);

  const handleTrainerLogin = (password: string): boolean => {
    if (password === APP_PASSWORD) {
      sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
      setView('dashboard');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setView('trainerLogin');
  };

  const handleStudentLogin = async (email: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      // Fetch all students to perform a case-insensitive email check on the client-side.
      const studentsCollection = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsCollection);
      
      const normalizedEmail = email.trim().toLowerCase();
      const studentDoc = studentsSnapshot.docs.find(doc => {
          const studentData = doc.data();
          // Ensure studentData.email exists and is a string before calling toLowerCase
          return typeof studentData.email === 'string' && studentData.email.toLowerCase() === normalizedEmail;
      });

      if (!studentDoc) {
        console.log("No student found with that email after client-side check.");
        return { success: false, message: 'Nenhum aluno encontrado com este email. Verifique o email digitado.' };
      }
      
      const toISO = (ts: any) => ts && ts.toDate ? ts.toDate().toISOString() : null;
      const studentData = studentDoc.data();
      const student: Student = {
          id: studentDoc.id,
          ...studentData,
          startDate: toISO(studentData.startDate) || new Date().toISOString(),
          paymentDueDate: toISO(studentData.paymentDueDate),
          sessions: (studentData.sessions || []).filter(Boolean).map((s: any) => ({ ...s, date: toISO(s.date) })),
      } as Student;

      const paymentsQuery = query(collection(db, 'payments'), where("studentId", "==", student.id), orderBy("paymentDate", "desc"));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const payments = paymentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              ...data,
              paymentDate: toISO(data.paymentDate),
          } as Payment;
      });
      
      setCurrentStudentData({ student, payments });
      setView('studentPortal');
      return { success: true };

    } catch (error) {
      console.error("Error during student login:", error);
      return { 
          success: false, 
          message: 'ERRO DE CONEXÃO: Não foi possível conectar ao banco de dados. Verifique se as credenciais no arquivo firebase.ts estão corretas e se as regras de segurança do Firestore permitem leitura.' 
      };
    } finally {
        setIsLoading(false);
    }
  };

  const handleStudentLogout = () => {
      setCurrentStudentData(null);
      setView('studentLogin');
  }

  const renderView = () => {
      switch(view) {
          case 'dashboard':
              return <Dashboard onLogout={handleLogout} />;
          case 'studentLogin':
              return <StudentLogin onLogin={handleStudentLogin} onBackToTrainerLogin={() => setView('trainerLogin')} isLoading={isLoading} />;
          case 'studentPortal':
              if (currentStudentData) {
                  return <StudentPortal studentData={currentStudentData} plans={plans} onLogout={handleStudentLogout} />;
              }
              // Fallback to login if data is missing
              setView('studentLogin');
              return null;
          case 'trainerLogin':
          default:
              return <LoginScreen onLogin={handleTrainerLogin} onShowStudentLogin={() => setView('studentLogin')} />;
      }
  }

  return (
    <div className="min-h-screen bg-brand-light font-sans text-brand-dark">
      {renderView()}
    </div>
  );
};

export default App;