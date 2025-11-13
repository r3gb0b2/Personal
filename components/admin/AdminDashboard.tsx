
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { Trainer } from '../../types';
import { LogoutIcon, PlusIcon, UserIcon, TrashIcon } from '../icons';
import Modal from '../modals/Modal';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [newTrainer, setNewTrainer] = useState({ username: '', password: '' });

  const fetchTrainers = useCallback(async () => {
    setLoading(true);
    try {
      const trainersSnapshot = await getDocs(collection(db, 'trainers'));
      const trainersList = trainersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trainer));
      setTrainers(trainersList);
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
  }

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
          <button onClick={() => setAddModalOpen(true)} className="flex items-center gap-2 bg-brand-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-brand-accent transition-colors shadow">
            <PlusIcon className="w-5 h-5" /> Adicionar Personal
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="text-center p-8">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-brand-light">
                  <tr>
                    <th className="p-4 font-semibold">Usuário</th>
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
    </>
  );
};

export default AdminDashboard;
