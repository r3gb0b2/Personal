import React, { useState, useEffect } from 'react';
import { Plan, PlanType } from '../types';
import Modal from './modals/Modal';
import { PencilIcon, TrashIcon } from './icons';

interface PlanManagementModalProps {
  plans: Plan[];
  onAddPlan: (plan: Omit<Plan, 'id'>) => Promise<void>;
  onUpdatePlan: (plan: Plan) => Promise<void>;
  onDeletePlan: (planId: string) => Promise<void>;
  onClose: () => void;
}

const initialFormState = { name: '', price: '0', durationInDays: '30', numberOfSessions: '10' };

const PlanManagementModal: React.FC<PlanManagementModalProps> = ({ plans, onAddPlan, onUpdatePlan, onDeletePlan, onClose }) => {
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planType, setPlanType] = useState<PlanType>('duration');
  const [formState, setFormState] = useState(initialFormState);

  useEffect(() => {
    if (editingPlan) {
      setPlanType(editingPlan.type);
      setFormState({
        name: editingPlan.name,
        price: String(editingPlan.price),
        durationInDays: String(editingPlan.durationInDays || 30),
        numberOfSessions: String(editingPlan.numberOfSessions || 10),
      });
    } else {
        setPlanType('duration');
        setFormState(initialFormState);
    }
  }, [editingPlan]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCancelEdit = () => {
    setEditingPlan(null);
  }

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim() || !formState.price) {
      alert('Por favor, preencha o nome e o preço do plano.');
      return;
    }

    try {
        if (editingPlan) {
            let planToUpdate: Plan;
            // Re-construct the object to avoid sending old/conflicting fields to Firestore
            if (planType === 'duration') {
                planToUpdate = {
                    id: editingPlan.id,
                    name: formState.name.trim(),
                    price: parseFloat(formState.price),
                    type: 'duration',
                    durationInDays: parseInt(formState.durationInDays, 10),
                };
            } else {
                 planToUpdate = {
                    id: editingPlan.id,
                    name: formState.name.trim(),
                    price: parseFloat(formState.price),
                    type: 'session',
                    numberOfSessions: parseInt(formState.numberOfSessions, 10),
                };
            }
            await onUpdatePlan(planToUpdate);
            setEditingPlan(null);
        } else {
            let planToAdd: Omit<Plan, 'id'>;
            if (planType === 'duration') {
                planToAdd = {
                    name: formState.name.trim(),
                    price: parseFloat(formState.price),
                    type: 'duration',
                    durationInDays: parseInt(formState.durationInDays, 10),
                };
            } else {
                planToAdd = {
                    name: formState.name.trim(),
                    price: parseFloat(formState.price),
                    type: 'session',
                    numberOfSessions: parseInt(formState.numberOfSessions, 10),
                };
            }
            await onAddPlan(planToAdd);
        }
        // Reset form state for the next entry
        setFormState(initialFormState);
        setPlanType('duration');

    } catch (error) {
        console.error("Erro ao salvar o plano:", error);
        alert("Ocorreu um erro ao salvar o plano. Verifique o console para mais detalhes.");
    }
  };

  return (
    <Modal title="Gerenciar Planos" isOpen={true} onClose={onClose} size="lg">
      <div className="space-y-6">
        <div>
          <h3 className="font-bold text-lg mb-2">{editingPlan ? `Editando Plano: ${editingPlan.name}`: 'Adicionar Novo Plano'}</h3>
          <form onSubmit={handleSavePlan} className="space-y-4 p-4 border rounded-md bg-gray-50">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome do Plano</label>
              <input type="text" name="name" value={formState.name} onChange={handleInputChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
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
                <input type="number" name="price" value={formState.price} onChange={handleInputChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required step="0.01"/>
              </div>
              {planType === 'duration' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duração (dias)</label>
                  <input type="number" name="durationInDays" value={formState.durationInDays} onChange={handleInputChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Número de Aulas</label>
                  <input type="number" name="numberOfSessions" value={formState.numberOfSessions} onChange={handleInputChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
                {editingPlan && (
                    <button type="button" onClick={handleCancelEdit} className="px-4 py-2 font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                )}
                <button type="submit" className="px-4 py-2 font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">{editingPlan ? 'Salvar Alterações' : 'Adicionar Plano'}</button>
            </div>
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
                    <div className="flex gap-4">
                        <button onClick={() => setEditingPlan(plan)} className="text-gray-500 hover:text-brand-primary">
                            <PencilIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={() => onDeletePlan(plan.id)} className="text-gray-500 hover:text-red-600">
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                    </div>
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