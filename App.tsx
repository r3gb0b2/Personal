
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

  const handleStudentLogin = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const studentQuery = query(collection(db, 'students'), where("email", "==", email.trim().toLowerCase()));
      const studentSnapshot = await getDocs(studentQuery);

      if (studentSnapshot.empty) {
        console.log("No student found with that email.");
        return false;
      }
      
      const toISO = (ts: any) => ts && ts.toDate ? ts.toDate().toISOString() : null;
      const studentDoc = studentSnapshot.docs[0];
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
      return true;

    } catch (error) {
      console.error("Error during student login:", error);
      return false;
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
