
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { Trainer } from '../../types';
import { LogoutIcon, PlusIcon, UserIcon, TrashIcon, SettingsIcon, CheckCircleIcon, ExclamationCircleIcon } from '../icons';
import Modal from '../modals/Modal';

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


const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [allTrainers, setAllTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  const [newTrainer, setNewTrainer] = useState({ username: '', password: '', fullName: '', contactEmail: '' });
  const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');

  const fetchTrainers = useCallback(async () => {
    setLoading(true);
    try {
      const trainersSnapshot = await getDocs(collection(db, 'trainers'));
      const trainersList = trainersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trainer));
      setAllTrainers(trainersList);
    } catch (error) {
      console.error("Failed to fetch trainers:", error);
      alert("Não foi possível carregar os dados dos personais. Verifique o console.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  const approvedTrainers = allTrainers.filter(t => t.status === 'approved' || !t.status); // Backwards compatibility for old trainers
  const pendingTrainers = allTrainers.filter(t => t.status === 'pending');

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
      const trainerToAdd = { ...newTrainer, status: 'approved' as const };
      const docRef = await addDoc(collection(db, 'trainers'), trainerToAdd);
      setAllTrainers(prev => [...prev, { id: docRef.id, ...trainerToAdd }]);
      setNewTrainer({ username: '', password: '', fullName: '', contactEmail: '' });
      setAddModalOpen(false);
    } catch (error) {
      console.error("Failed to add trainer:", error);
      alert("Não foi possível adicionar o personal. Verifique o console.");
    }
  };
  
  const handleApproveTrainer = async (trainerId: string) => {
      try {
          await updateDoc(doc(db, 'trainers', trainerId), { status: 'approved' });
          fetchTrainers(); // Refresh list
      } catch (error) {
           console.error("Failed to approve trainer:", error);
           alert("Não foi possível aprovar o personal.");
      }
  };

  const handleDeleteTrainer = async (trainerId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este personal? Todos os seus alunos e dados associados permanecerão no sistema, mas ficarão órfãos.")) {
        try {
            await deleteDoc(doc(db, 'trainers', trainerId));
            fetchTrainers(); // Refresh list
        } catch (error) {
            console.error("Failed to delete trainer:", error);
            alert("Não foi possível excluir o personal.");
        }
    }
  };
  
   const handleRejectTrainer = async (trainerId: string) => {
    if (window.confirm("Tem certeza que deseja REJEITAR este cadastro? A solicitação será excluída permanentemente.")) {
        try {
            await deleteDoc(doc(db, 'trainers', trainerId));
            fetchTrainers(); // Refresh list
        } catch (error) {
            console.error("Failed to reject trainer:", error);
            alert("Não foi possível rejeitar o cadastro.");
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
          <h2 className="text-xl font-bold">Gerenciar Personais</h2>
          <div className="flex gap-4">
            <button onClick={() => setAddModalOpen(true)} className="flex items-center gap-2 bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-accent transition-colors shadow">
                <PlusIcon className="w-5 h-5" /> Adicionar Personal
            </button>
            <button onClick={() => setPasswordModalOpen(true)} className="flex items-center gap-2 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors shadow">
                <SettingsIcon className="w-5 h-5" /> Alterar Senha
            </button>
          </div>
        </div>

        <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                    onClick={() => setActiveTab('approved')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'approved' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    Personais Aprovados <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{approvedTrainers.length}</span>
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'pending' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    Solicitações Pendentes <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{pendingTrainers.length}</span>
                </button>
            </nav>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="text-center p-8">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
                {activeTab === 'approved' && (
                  <table className="w-full text-left">
                    <thead className="bg-brand-light">
                      <tr>
                        <th className="p-4 font-semibold">Usuário do Personal</th>
                        <th className="p-4 font-semibold">Nome Completo</th>
                        <th className="p-4 font-semibold">Email de Contato</th>
                        <th className="p-4 font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedTrainers.length > 0 ? approvedTrainers.map(trainer => (
                        <tr key={trainer.id} className="border-t">
                          <td className="p-4 font-medium">
                            <div className="flex items-center gap-3">
                                <UserIcon className="w-6 h-6 text-gray-500"/>
                                <span>{trainer.username}</span>
                            </div>
                          </td>
                           <td className="p-4">{trainer.fullName || 'N/A'}</td>
                           <td className="p-4">{trainer.contactEmail || 'N/A'}</td>
                          <td className="p-4">
                            <button onClick={() => handleDeleteTrainer(trainer.id)} className="text-gray-400 hover:text-red-600" title="Excluir Personal">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="text-center p-8 text-gray-500">Nenhum personal aprovado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
                {activeTab === 'pending' && (
                    <table className="w-full text-left">
                        <thead className="bg-brand-light">
                        <tr>
                            <th className="p-4 font-semibold">Usuário Solicitado</th>
                            <th className="p-4 font-semibold">Nome Completo</th>
                            <th className="p-4 font-semibold">Email de Contato</th>
                            <th className="p-4 font-semibold text-center">Ações</th>
                        </tr>
                        </thead>
                        <tbody>
                        {pendingTrainers.length > 0 ? pendingTrainers.map(trainer => (
                            <tr key={trainer.id} className="border-t">
                            <td className="p-4 font-medium">
                                <div className="flex items-center gap-3">
                                    <UserIcon className="w-6 h-6 text-gray-500"/>
                                    <span>{trainer.username}</span>
                                </div>
                            </td>
                            <td className="p-4">{trainer.fullName || 'N/A'}</td>
                            <td className="p-4">{trainer.contactEmail || 'N/A'}</td>
                            <td className="p-4">
                                <div className="flex justify-center gap-4">
                                    <button onClick={() => handleApproveTrainer(trainer.id)} className="flex items-center gap-2 text-sm text-white bg-green-600 px-3 py-1 rounded-md hover:bg-green-700" title="Aprovar Cadastro">
                                        <CheckCircleIcon className="w-4 h-4"/> Aprovar
                                    </button>
                                    <button onClick={() => handleRejectTrainer(trainer.id)} className="flex items-center gap-2 text-sm text-white bg-red-600 px-3 py-1 rounded-md hover:bg-red-700" title="Rejeitar Cadastro">
                                        <ExclamationCircleIcon className="w-4 h-4"/> Rejeitar
                                    </button>
                                </div>
                            </td>
                            </tr>
                        )) : (
                            <tr>
                            <td colSpan={4} className="text-center p-8 text-gray-500">Nenhuma solicitação pendente.</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                )}
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
              <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
              <input type="text" name="fullName" value={newTrainer.fullName} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">Email de Contato</label>
              <input type="email" name="contactEmail" value={newTrainer.contactEmail} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input type="password" name="password" value={newTrainer.password} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
            </div>
             <p className="text-xs text-gray-500">Nota: Personais adicionados manualmente são aprovados automaticamente.</p>
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
    </>
  );
};

export default AdminDashboard;