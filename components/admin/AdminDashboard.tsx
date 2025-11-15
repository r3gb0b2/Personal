import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, doc, deleteDoc, getDoc, updateDoc, setDoc, query, where, Timestamp, limit } from 'firebase/firestore';
import { Trainer, LibraryExercise, TrainerSuggestion } from '../../types';
import { LogoutIcon, PlusIcon, UserIcon, TrashIcon, SettingsIcon, ClockIcon, DumbbellIcon } from '../icons';
import Modal from '../modals/Modal';
import AutomationSettingsModal from './AutomationSettingsModal';
import ExerciseManagementModal from './ExerciseManagementModal';
import { defaultExercises } from '../../data/defaultExercises';


interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminPasswordModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onPasswordUpdate: (current: string, newPass: string) => Promise<{success: boolean, message: string}>
}> = ({ isOpen, onClose, onPasswordUpdate }) => {
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: ''});
    const [message, setMessage] = useState({type: '', text: ''});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({type: '', text: ''});
        if (passwordData.new !== passwordData.confirm) {
            setMessage({type: 'error', text: 'As novas senhas não coincidem.'});
            return;
        }
        const result = await onPasswordUpdate(passwordData.current, passwordData.new);
        if (result.success) {
            setMessage({type: 'success', text: result.message});
            setPasswordData({ current: '', new: '', confirm: ''});
        } else {
            setMessage({type: 'error', text: result.message});
        }
    }

    return (
        <Modal title="Alterar Senha do Administrador" isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Senha Atual</label>
                    <input type="password" name="current" value={passwordData.current} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                    <input type="password" name="new" value={passwordData.new} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                    <input type="password" name="confirm" value={passwordData.confirm} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                </div>
                 {message.text && (
                    <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                        {message.text}
                    </p>
                )}
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">Salvar Senha</button>
                </div>
            </form>
        </Modal>
    );
}

const EmailSettingsModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
}> = ({ isOpen, onClose }) => {
    const [settings, setSettings] = useState({ apiKey: '', senderEmail: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchSettings = async () => {
                setIsLoading(true);
                const settingsRef = doc(db, 'settings', 'brevoConfig');
                const docSnap = await getDoc(settingsRef);
                if (docSnap.exists()) {
                    setSettings(docSnap.data() as any);
                }
                setIsLoading(false);
            };
            fetchSettings();
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const settingsRef = doc(db, 'settings', 'brevoConfig');
            await setDoc(settingsRef, settings, { merge: true });
            alert("Configurações salvas com sucesso!");
            onClose();
        } catch (error) {
            console.error("Failed to save email settings:", error);
            alert("Erro ao salvar as configurações.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal title="Configurações Globais de E-mail" isOpen={isOpen} onClose={onClose}>
            {isLoading ? <p>Carregando...</p> : (
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Chave da API da Brevo (v3)</label>
                    <input type="password" name="apiKey" value={settings.apiKey} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">E-mail Remetente Global</label>
                    <input type="email" name="senderEmail" value={settings.senderEmail} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                     <p className="text-xs text-gray-500 mt-1">Este e-mail aparecerá como remetente para todos os alunos.</p>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent disabled:bg-gray-400">
                        {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                </div>
            </form>
            )}
        </Modal>
    );
};


const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [libraryExercises, setLibraryExercises] = useState<LibraryExercise[]>([]);
  const [trainerSuggestions, setTrainerSuggestions] = useState<TrainerSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  const [isEmailModalOpen, setEmailModalOpen] = useState(false);
  const [isAutomationModalOpen, setAutomationModalOpen] = useState(false);
  const [isExerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [newTrainer, setNewTrainer] = useState({ username: '', password: '' });

  const fetchData = useCallback(async (isInitialLoad = false) => {
    setLoading(true);
    try {
      const trainersSnapshot = await getDocs(collection(db, 'trainers'));
      const trainersList = trainersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trainer));
      setTrainers(trainersList);
      
      const toISO = (ts: any) => ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString();

      const libraryRef = collection(db, 'libraryExercises');
      let librarySnapshot = await getDocs(libraryRef);

      if (isInitialLoad && librarySnapshot.empty) {
          console.log("Empty library detected, seeding with default exercises...");
          const seedPromises = defaultExercises.map(ex => addDoc(libraryRef, ex));
          await Promise.all(seedPromises);
          // Refetch after seeding
          librarySnapshot = await getDocs(libraryRef);
          console.log("Seeding complete.");
      }
      setLibraryExercises(librarySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibraryExercise)));


      const suggestionsQuery = query(collection(db, 'trainerSuggestions'), where("status", "==", "pending"));
      const suggestionsSnapshot = await getDocs(suggestionsQuery);
      setTrainerSuggestions(suggestionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), submittedAt: toISO(doc.data().submittedAt) } as TrainerSuggestion)));

    } catch (error) {
      console.error("Failed to fetch data:", error);
      alert("Não foi possível carregar os dados. Verifique o console.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTrainer(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrainer.username.trim() || !newTrainer.password.trim()) {
      alert("Usuário e senha são obrigatórios.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'trainers'), newTrainer);
      setTrainers(prev => [...prev, { id: docRef.id, ...newTrainer }]);
      setNewTrainer({ username: '', password: '' });
      setAddModalOpen(false);
    } catch (error) {
      console.error("Failed to add trainer:", error);
      alert("Não foi possível adicionar o personal. Verifique o console.");
    }
  };

  const handleDeleteTrainer = async (trainerId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este personal? Todos os seus alunos e dados associados permanecerão no sistema, mas ficarão órfãos.")) {
        try {
            await deleteDoc(doc(db, 'trainers', trainerId));
            setTrainers(prev => prev.filter(t => t.id !== trainerId));
        } catch (error) {
            console.error("Failed to delete trainer:", error);
            alert("Não foi possível excluir o personal.");
        }
    }
  };

  const handleUpdateAdminPassword = async (current: string, newPass: string): Promise<{success: boolean, message: string}> => {
      try {
          const adminRef = doc(db, 'settings', 'admin');
          const adminSnap = await getDoc(adminRef);

          if (!adminSnap.exists()) {
              return { success: false, message: "Conta de admin não encontrada no banco de dados." };
          }
          if (adminSnap.data().password !== current) {
              return { success: false, message: "A senha atual está incorreta." };
          }

          await updateDoc(adminRef, { password: newPass });
          return { success: true, message: "Senha de administrador alterada com sucesso!" };

      } catch (error) {
           console.error("Failed to update admin password:", error);
           return { success: false, message: "Erro ao atualizar a senha." };
      }
  };

  return (
    <>
      <div className="bg-brand-dark">
        <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Painel do Administrador</h1>
          <button onClick={onLogout} className="flex items-center gap-2 text-white hover:text-red-400 transition-colors">
            <LogoutIcon className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </header>
      </div>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold">Gerenciar Sistema</h2>
          <div className="flex flex-wrap gap-4">
             <button onClick={() => setExerciseModalOpen(true)} className="flex items-center gap-2 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors shadow">
                <DumbbellIcon className="w-5 h-5" /> Gerenciar Exercícios
                 {trainerSuggestions.length > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{trainerSuggestions.length}</span>
                 )}
            </button>
             <button onClick={() => setAutomationModalOpen(true)} className="flex items-center gap-2 bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors shadow">
                <ClockIcon className="w-5 h-5" /> Lembretes Automáticos
            </button>
             <button onClick={() => setEmailModalOpen(true)} className="flex items-center gap-2 bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors shadow">
                <SettingsIcon className="w-5 h-5" /> Configurar E-mail
            </button>
            <button onClick={() => setAddModalOpen(true)} className="flex items-center gap-2 bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-accent transition-colors shadow">
                <PlusIcon className="w-5 h-5" /> Adicionar Personal
            </button>
            <button onClick={() => setPasswordModalOpen(true)} className="flex items-center gap-2 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors shadow">
                <SettingsIcon className="w-5 h-5" /> Alterar Senha
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="text-center p-8">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-brand-light">
                  <tr>
                    <th className="p-4 font-semibold">Usuário do Personal</th>
                    <th className="p-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {trainers.length > 0 ? trainers.map(trainer => (
                    <tr key={trainer.id} className="border-t">
                      <td className="p-4 font-medium">
                        <div className="flex items-center gap-3">
                            <UserIcon className="w-6 h-6 text-gray-500"/>
                            <span>{trainer.username}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <button onClick={() => handleDeleteTrainer(trainer.id)} className="text-gray-400 hover:text-red-600" title="Excluir Personal">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={2} className="text-center p-8 text-gray-500">Nenhum personal cadastrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {isAddModalOpen && (
        <Modal title="Adicionar Novo Personal" isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)}>
          <form onSubmit={handleAddTrainer} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome de Usuário</label>
              <input type="text" name="username" value={newTrainer.username} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input type="password" name="password" value={newTrainer.password} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <button type="button" onClick={() => setAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">Salvar Personal</button>
            </div>
          </form>
        </Modal>
      )}

      {isPasswordModalOpen && (
        <AdminPasswordModal
            isOpen={isPasswordModalOpen}
            onClose={() => setPasswordModalOpen(false)}
            onPasswordUpdate={handleUpdateAdminPassword}
        />
      )}

      {isEmailModalOpen && (
          <EmailSettingsModal
            isOpen={isEmailModalOpen}
            onClose={() => setEmailModalOpen(false)}
          />
      )}

      {isAutomationModalOpen && (
        <AutomationSettingsModal
            isOpen={isAutomationModalOpen}
            onClose={() => setAutomationModalOpen(false)}
        />
      )}

      {isExerciseModalOpen && (
        <ExerciseManagementModal
            isOpen={isExerciseModalOpen}
            onClose={() => setExerciseModalOpen(false)}
            libraryExercises={libraryExercises}
            trainerSuggestions={trainerSuggestions}
            trainers={trainers}
            onUpdate={() => fetchData(false)}
        />
      )}
    </>
  );
};

export default AdminDashboard;