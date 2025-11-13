import React, { useState } from 'react';
import { Plan, Student, DaySchedule } from '../types';
import Modal from './modals/Modal';
import { PlusIcon, TrashIcon } from './icons';

interface AddStudentModalProps {
  plans: Plan[];
  onClose: () => void;
  onAdd: (student: Omit<Student, 'id'>) => Promise<void>;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ plans, onClose, onAdd }) => {
  const [newStudent, setNewStudent] = useState<{
    name: string;
    email: string;
    phone: string;
    planId: string;
    schedule: DaySchedule[];
  }>({
    name: '',
    email: '',
    phone: '',
    planId: '',
    schedule: [],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewStudent(prev => ({ ...prev, [name]: value }));
  };

  const daysOfWeek = [
    { id: 'monday', label: 'Segunda-feira' },
    { id: 'tuesday', label: 'Terça-feira' },
    { id: 'wednesday', label: 'Quarta-feira' },
    { id: 'thursday', label: 'Quinta-feira' },
    { id: 'friday', label: 'Sexta-feira' },
    { id: 'saturday', label: 'Sábado' },
    { id: 'sunday', label: 'Domingo' },
  ];

  const handleScheduleChange = (index: number, field: keyof DaySchedule, value: string) => {
    const updatedSchedule = [...newStudent.schedule];
    updatedSchedule[index] = { ...updatedSchedule[index], [field]: value };
    setNewStudent(prev => ({ ...prev, schedule: updatedSchedule }));
  };

  const addScheduleItem = () => {
    setNewStudent(prev => ({
        ...prev,
        schedule: [...prev.schedule, { day: 'monday', startTime: '', endTime: '' }]
    }));
  };

  const removeScheduleItem = (index: number) => {
    setNewStudent(prev => ({
        ...prev,
        schedule: prev.schedule.filter((_, i) => i !== index)
    }));
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

    // Fix: Add a placeholder 'trainerId' to satisfy the type. It will be overwritten by the parent component.
    const studentToAdd: Omit<Student, 'id'> = {
      name: newStudent.name.trim(),
      email: newStudent.email.trim().toLowerCase(),
      phone: newStudent.phone.trim(),
      startDate: new Date().toISOString(),
      planId: newStudent.planId || null,
      paymentDueDate: paymentDueDate,
      remainingSessions: remainingSessions,
      sessions: [],
      profilePictureUrl: null,
      trainerId: '',
      schedule: newStudent.schedule.length > 0 ? newStudent.schedule.filter(s => s.startTime && s.endTime) : null,
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
         <div>
            <label className="block text-sm font-medium text-gray-700">Horário Fixo (Opcional)</label>
            <div className="mt-2 p-3 border rounded-md space-y-3 bg-gray-50">
                 {newStudent.schedule.map((item, index) => (
                    <div key={index} className="grid grid-cols-[1fr,auto,auto,auto] gap-2 items-center">
                        <select
                            value={item.day}
                            onChange={(e) => handleScheduleChange(index, 'day', e.target.value)}
                            className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
                        >
                            {daysOfWeek.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                        </select>
                        <input
                            type="time"
                            value={item.startTime}
                            onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                            className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
                        />
                         <input
                            type="time"
                            value={item.endTime}
                            onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                            className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => removeScheduleItem(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                            aria-label="Remover horário"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addScheduleItem}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-brand-primary bg-blue-100 rounded-md hover:bg-blue-200"
                >
                    <PlusIcon className="w-4 h-4" /> Adicionar Horário
                </button>
            </div>
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