
import React, { useState } from 'react';
import { Plan, PlanType } from '../types';
import Modal from './modals/Modal';

interface PlanManagementModalProps {
  plans: Plan[];
  onAddPlan: (plan: Omit<Plan, 'id'>) => Promise<void>;
  onDeletePlan: (planId: string) => Promise<void>;
  onClose: () => void;
}

const PlanManagementModal: React.FC<PlanManagementModalProps> = ({ plans, onAddPlan, onDeletePlan, onClose }) => {
  const [planType, setPlanType] = useState<PlanType>('duration');
  const [newPlan, setNewPlan] = useState({ name: '', price: '0', durationInDays: '30', numberOfSessions: '10' });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPlan(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.name.trim() || !newPlan.price) {
      alert('Por favor, preencha o nome e o preço do plano.');
      return;
    }
    
    let planToAdd: Omit<Plan, 'id'>;

    if (planType === 'duration') {
        planToAdd = {
            name: newPlan.name.trim(),
            price: parseFloat(newPlan.price),
            type: 'duration',
            durationInDays: parseInt(newPlan.durationInDays, 10),
        };
    } else {
        planToAdd = {
            name: newPlan.name.trim(),
            price: parseFloat(newPlan.price),
            type: 'session',
            numberOfSessions: parseInt(newPlan.numberOfSessions, 10),
        };
    }
    
    onAddPlan(planToAdd);
    setNewPlan({ name: '', price: '0', durationInDays: '30', numberOfSessions: '10' });
  };

  return (
    <Modal title="Gerenciar Planos" isOpen={true} onClose={onClose} size="lg">
      <div className="space-y-6">
        <div>
          <h3 className="font-bold text-lg mb-2">Adicionar Novo Plano</h3>
          <form onSubmit={handleAddPlan} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome do Plano</label>
              <input type="text" name="name" value={newPlan.name} onChange={handleInputChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de Plano</label>
              <select value={planType} onChange={(e) => setPlanType(e.target.value as PlanType)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                  <option value="duration">Por Duração (Ex: Mensal)</option>
                  <option value="session">Por Sessão (Ex: Pacote de 10 aulas)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Preço (R$)</label>
                <input type="number" name="price" value={newPlan.price} onChange={handleInputChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required step="0.01"/>
              </div>
              {planType === 'duration' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duração (dias)</label>
                  <input type="number" name="durationInDays" value={newPlan.durationInDays} onChange={handleInputChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Número de Aulas</label>
                  <input type="number" name="numberOfSessions" value={newPlan.numberOfSessions} onChange={handleInputChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                </div>
              )}
            </div>
            <button type="submit" className="w-full px-4 py-2 font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">Adicionar Plano</button>
          </form>
        </div>
        <div>
          <h3 className="font-bold text-lg mb-2">Planos Existentes</h3>
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {plans.length > 0 ? (
              <ul className="divide-y">
                {plans.map(plan => (
                  <li key={plan.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{plan.name}</p>
                      <p className="text-sm text-gray-600">
                        R$ {plan.price.toFixed(2)} / 
                        {plan.type === 'duration' ? ` ${plan.durationInDays} dias` : ` ${plan.numberOfSessions} aulas`}
                      </p>
                    </div>
                    <button onClick={() => onDeletePlan(plan.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Excluir</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 p-4">Nenhum plano cadastrado.</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PlanManagementModal;
