import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { collection, getDocs, query, where, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import StudentLogin from './components/student/StudentLogin';
import StudentPortal from './components/student/StudentPortal';
import AdminDashboard from './components/admin/AdminDashboard';
import { AUTH_SESSION_KEY, STUDENT_AUTH_SESSION_KEY } from './constants';
import { Student, Plan, Payment, Trainer } from './types';

type View = 'trainerLogin' | 'dashboard' | 'studentLogin' | 'studentPortal' | 'adminDashboard';

const App: React.FC = () => {
  const [view, setView] = useState<View>('trainerLogin');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentUser, setCurrentUser] = useState<Trainer | { id: 'admin', username: 'admin' } | null>(null);
  const [currentStudentData, setCurrentStudentData] = useState<{ student: Student; payments: Payment[]; trainer: Trainer | null } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleStudentLogin = useCallback(async (email: string): Promise<{ success: boolean; message?: string }> => {
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

      if (studentData.accessBlocked) {
        return { success: false, message: 'Seu acesso está bloqueado por inadimplência. Por favor, entre em contato com seu personal para regularizar a situação.' };
      }

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
      let trainerIdToFetch = student.trainerId;

      // For legacy students without a trainerId, default to 'bruno'.
      if (!trainerIdToFetch) {
        const q = query(collection(db, 'trainers'), where("username", "==", "bruno"));
        const brunoSnapshot = await getDocs(q);
        if (!brunoSnapshot.empty) {
            trainerIdToFetch = brunoSnapshot.docs[0].id;
            // FIX: Ensure the student object itself is updated with the new trainerId
            student.trainerId = trainerIdToFetch;
        }
      }

      if (trainerIdToFetch) {
          const trainerRef = doc(db, 'trainers', trainerIdToFetch);
          const trainerSnap = await getDoc(trainerRef);
          if (trainerSnap.exists()) {
              trainer = { id: trainerSnap.id, ...trainerSnap.data() } as Trainer;
              delete trainer.password;
          }
      }
      
      setCurrentStudentData({ student, payments, trainer });
      setView('studentPortal');
      sessionStorage.setItem(STUDENT_AUTH_SESSION_KEY, student.email);
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
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
        try {
            const sessionAuth = sessionStorage.getItem(AUTH_SESSION_KEY);
            const studentSessionAuth = sessionStorage.getItem(STUDENT_AUTH_SESSION_KEY);

            if (sessionAuth) {
                const parsedUser = JSON.parse(sessionAuth);
                setCurrentUser(parsedUser);
                if (parsedUser.id === 'admin') {
                    setView('adminDashboard');
                } else {
                    setView('dashboard');
                }
            } else if (studentSessionAuth) {
                await handleStudentLogin(studentSessionAuth);
            }
        } catch (e) {
            // Corrupted session data, clear it
            sessionStorage.removeItem(AUTH_SESSION_KEY);
            sessionStorage.removeItem(STUDENT_AUTH_SESSION_KEY);
        }
    };
    restoreSession();
  }, [handleStudentLogin]);
  
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
    const normalizedUsername = username.trim().toLowerCase();
    
    // Admin Login
    if (normalizedUsername === 'admin') {
      try {
        const adminRef = doc(db, 'settings', 'admin');
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists()) {
            if (adminSnap.data().password === password) {
                const adminUser = { id: 'admin', username: 'admin' };
                sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(adminUser));
                setCurrentUser(adminUser);
                setView('adminDashboard');
                return true;
            }
        } else {
             console.error("Admin login failed: The 'admin' document was not found in the 'settings' collection. Please check your Firestore setup instructions in `firebase.ts`.");
        }
      } catch (e) {
        console.error("Error during admin login:", e);
        return false;
      }
    }

    // Trainer Login (Case-insensitive)
    try {
      const trainersCollection = collection(db, 'trainers');
      const trainersSnapshot = await getDocs(trainersCollection);
      
      if (trainersSnapshot.empty) {
          console.error("Trainer login failed: The 'trainers' collection is empty or could not be read. Please check Firestore setup and security rules.");
      }

      const trainerDoc = trainersSnapshot.docs.find(doc => {
          const trainerData = doc.data();
          return trainerData.username && trainerData.username.toLowerCase() === normalizedUsername;
      });

      if (!trainerDoc) return false;

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

  const handleStudentLogout = () => {
      sessionStorage.removeItem(STUDENT_AUTH_SESSION_KEY);
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