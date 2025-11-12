
import React, { useState } from 'react';
import { Plan, Student } from '../types';
import Modal from './modals/Modal';

interface AddStudentModalProps {
  plans: Plan[];
  onClose: () => void;
  onAdd: (student: Omit<Student, 'id'>) => Promise<void>;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ plans, onClose, onAdd }) => {
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    phone: '',
    planId: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewStudent(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name.trim()) {
      alert("O nome do aluno é obrigatório.");
      return;
    }
    
    const selectedPlan = plans.find(p => p.id === newStudent.planId);
    let paymentDueDate = null;
    let remainingSessions = undefined;

    if (selectedPlan) {
        if (selectedPlan.type === 'duration' && selectedPlan.durationInDays) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + selectedPlan.durationInDays);
            paymentDueDate = dueDate.toISOString();
        } else if (selectedPlan.type === 'session' && selectedPlan.numberOfSessions) {
            remainingSessions = selectedPlan.numberOfSessions;
        }
    }

    const studentToAdd: Omit<Student, 'id'> = {
      name: newStudent.name.trim(),
      email: newStudent.email.trim(),
      phone: newStudent.phone.trim(),
      startDate: new Date().toISOString(),
      planId: newStudent.planId || null,
      paymentDueDate: paymentDueDate,
      remainingSessions: remainingSessions,
      sessions: [],
      profilePictureUrl: null,
    };

    onAdd(studentToAdd);
    onClose();
  };

  return (
    <Modal title="Adicionar Novo Aluno" isOpen={true} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
          <input type="text" name="name" value={newStudent.name} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" name="email" value={newStudent.email} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Telefone</label>
          <input type="tel" name="phone" value={newStudent.phone} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Plano Inicial</label>
          <select name="planId" value={newStudent.planId} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm">
            <option value="">Nenhum plano</option>
            {plans.map(plan => (
              <option key={plan.id} value={plan.id}>{plan.name} - R$ {plan.price.toFixed(2)}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">O status inicial do aluno será definido com base no plano selecionado.</p>
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">Salvar Aluno</button>
        </div>
      </form>
    </Modal>
  );
};

export default AddStudentModal;