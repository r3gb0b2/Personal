import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { collection, getDocs, query, where, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import StudentLogin from './components/student/StudentLogin';
import StudentPortal from './components/student/StudentPortal';
import AdminDashboard from './components/admin/AdminDashboard';
import { ADMIN_USERNAME, ADMIN_PASSWORD, AUTH_SESSION_KEY } from './constants';
import { Student, Plan, Payment, Trainer } from './types';

type View = 'trainerLogin' | 'dashboard' | 'studentLogin' | 'studentPortal' | 'adminDashboard';

const App: React.FC = () => {
  const [view, setView] = useState<View>('trainerLogin');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentUser, setCurrentUser] = useState<Trainer | { id: 'admin', username: 'admin' } | null>(null);
  const [currentStudentData, setCurrentStudentData] = useState<{ student: Student; payments: Payment[]; trainer: Trainer | null } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    try {
        const sessionAuth = sessionStorage.getItem(AUTH_SESSION_KEY);
        if (sessionAuth) {
            const parsedUser = JSON.parse(sessionAuth);
            setCurrentUser(parsedUser);
            if (parsedUser.id === 'admin') {
                setView('adminDashboard');
            } else {
                setView('dashboard');
            }
        }
    } catch (e) {
        // Corrupted session data, clear it
        sessionStorage.removeItem(AUTH_SESSION_KEY);
    }
  }, []);
  
  const fetchPlansForStudentPortal = useCallback(async () => {
    try {
        const plansSnapshot = await getDocs(collection(db, 'plans'));
        const plansList = plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
        setPlans(plansList);
    } catch (e) {
        console.error("Could not fetch plans for student portal", e);
    }
  }, []);

  useEffect(() => {
      // Fetch plans once on initial load for the student portal
      if (view === 'studentLogin' && plans.length === 0) {
          fetchPlansForStudentPortal();
      }
  }, [view, plans.length, fetchPlansForStudentPortal]);

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    // Admin Login
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const adminUser = { id: 'admin', username: 'admin' };
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(adminUser));
      setCurrentUser(adminUser);
      setView('adminDashboard');
      return true;
    }

    // Trainer Login
    try {
      const q = query(collection(db, 'trainers'), where("username", "==", username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return false;

      const trainerDoc = querySnapshot.docs[0];
      const trainerData = trainerDoc.data();

      // In a real app, password should be hashed. Here we do a simple check.
      if (trainerData.password === password) {
        const trainer = { id: trainerDoc.id, ...trainerData } as Trainer;
        delete trainer.password; // Don't store password in session
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(trainer));
        setCurrentUser(trainer);
        setView('dashboard');
        return true;
      }

    } catch (e) {
      console.error("Error during trainer login:", e);
    }
    
    return false;
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setCurrentUser(null);
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

      let trainer: Trainer | null = null;
      if (student.trainerId) {
          const trainerRef = doc(db, 'trainers', student.trainerId);
          const trainerSnap = await getDoc(trainerRef);
          if (trainerSnap.exists()) {
              trainer = { id: trainerSnap.id, ...trainerSnap.data() } as Trainer;
              delete trainer.password;
          }
      }
      
      setCurrentStudentData({ student, payments, trainer });
      setView('studentPortal');
      return { success: true };

    } catch (error) {
      console.error("Firebase Connection Error Details:", error);
      return { 
          success: false, 
          message: "CONNECTION_ERROR"
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
          case 'adminDashboard':
              return <AdminDashboard onLogout={handleLogout} />;
          case 'dashboard':
              if (currentUser && currentUser.id !== 'admin') {
                return <Dashboard onLogout={handleLogout} trainer={currentUser as Trainer} />;
              }
              // Fallback if user is not a trainer
              return <LoginScreen onLogin={handleLogin} onShowStudentLogin={() => setView('studentLogin')} />;
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
              return <LoginScreen onLogin={handleLogin} onShowStudentLogin={() => setView('studentLogin')} />;
      }
  }

  return (
    <div className="min-h-screen bg-brand-light font-sans text-brand-dark">
      {renderView()}
    </div>
  );
};

export default App;
