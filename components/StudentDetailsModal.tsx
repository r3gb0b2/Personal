import React, { useState } from 'react';
import { Student, Plan, ClassSession } from '../types';
import { CalendarIcon, CheckCircleIcon, ExclamationCircleIcon, PlusIcon } from './icons';
import Modal from './modals/Modal';

interface StudentDetailsModalProps {
  student: Student;
  plans: Plan[];
  onClose: () => void;
  onUpdate: (student: Student) => Promise<void>;
  onDelete: (studentId: string) => Promise<void>;
}

const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({ student, plans, onClose, onUpdate, onDelete }) => {
  const [editableStudent, setEditableStudent] = useState<Student>(student);
  const [isEditing, setIsEditing] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditableStudent(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = async () => {
    await onUpdate(editableStudent);
    setIsEditing(false);
  }

  const handleAddSession = async () => {
    const newSession: ClassSession = {
      id: new Date().toISOString() + Math.random(),
      date: new Date().toISOString(),
    };
    const updatedStudent = { ...editableStudent, sessions: [...editableStudent.sessions, newSession] };
    setEditableStudent(updatedStudent);
    await onUpdate(updatedStudent);
  };
  
  const handleRenewPlan = async () => {
    const plan = plans.find(p => p.id === editableStudent.planId);
    if (!plan) return;
    
    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + plan.durationInDays);
    
    const updatedStudent = {...editableStudent, paymentDueDate: newDueDate.toISOString()};
    setEditableStudent(updatedStudent);
    await onUpdate(updatedStudent);
  }

  const handleDelete = async () => {
    if (window.confirm(`Tem certeza que deseja excluir ${student.name}? Esta ação não pode ser desfeita.`)) {
      await onDelete(student.id);
    }
  }

  const studentPlan = plans.find(p => p.id === student.planId);
  const isPaymentDue = student.paymentDueDate && new Date(student.paymentDueDate) < new Date();
  
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <Modal title={isEditing ? `Editando ${student.name}` : student.name} isOpen={true} onClose={onClose} size="lg">
      {isEditing ? (
         <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input type="text" name="name" value={editableStudent.name} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" value={editableStudent.email} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Telefone</label>
                <input type="tel" name="phone" value={editableStudent.phone} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Plano</label>
                <select name="planId" value={editableStudent.planId ?? ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm">
                    <option value="">Sem Plano</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
            <div className="flex justify-end gap-4">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">Salvar</button>
            </div>
         </div>
      ) : (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <p><strong>Email:</strong> {student.email || 'N/A'}</p>
                    <p><strong>Telefone:</strong> {student.phone || 'N/A'}</p>
                    <p><strong>Início:</strong> {formatDate(student.startDate)}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsEditing(true)} className="px-3 py-1 text-sm font-medium text-white bg-brand-secondary rounded-md hover:bg-gray-700">Editar</button>
                    <button onClick={handleDelete} className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Excluir</button>
                </div>
            </div>

            <div className={`p-4 rounded-lg ${isPaymentDue ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border`}>
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg">{studentPlan?.name || 'Sem plano'}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            {isPaymentDue ? <ExclamationCircleIcon className="w-5 h-5 text-red-500" /> : <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                            <span className={isPaymentDue ? 'text-red-600' : 'text-green-600'}>
                                {student.paymentDueDate ? `Vencimento em ${formatDate(student.paymentDueDate)}` : 'Sem data de vencimento'}
                            </span>
                        </div>
                    </div>
                    {student.planId && <button onClick={handleRenewPlan} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Marcar como Pago/Renovar</button>}
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg">Histórico de Aulas</h3>
                    <button onClick={handleAddSession} className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">
                        <PlusIcon className="w-4 h-4" /> Adicionar Aula
                    </button>
                </div>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {student.sessions.length > 0 ? (
                        <ul className="divide-y">
                            {student.sessions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(session => (
                                <li key={session.id} className="p-3 flex items-center gap-3">
                                    <CalendarIcon className="w-5 h-5 text-gray-500" />
                                    <span>{new Date(session.date).toLocaleString('pt-BR')}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 p-4">Nenhuma aula registrada.</p>
                    )}
                </div>
            </div>
        </div>
      )}
    </Modal>
  );
};

export default StudentDetailsModal;