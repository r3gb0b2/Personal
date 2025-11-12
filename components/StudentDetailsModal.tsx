
import React, { useState } from 'react';
import { Student, Plan, ClassSession, Payment, PaymentMethod, ClassSessionType } from '../types';
import { CalendarIcon, CheckCircleIcon, ExclamationCircleIcon, PlusIcon, TrashIcon, UserIcon, CameraIcon } from './icons';
import Modal from './modals/Modal';
import PaymentModal from './modals/PaymentModal';
import ProfilePictureModal from './modals/ProfilePictureModal';

interface StudentDetailsModalProps {
  student: Student;
  plans: Plan[];
  onClose: () => void;
  onUpdate: (student: Student) => Promise<void>;
  onDelete: (studentId: string) => Promise<void>;
  onAddPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
}

const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({ student, plans, onClose, onUpdate, onDelete, onAddPayment }) => {
  const [editableStudent, setEditableStudent] = useState<Student>(student);
  const [isEditing, setIsEditing] = useState(false);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isPictureModalOpen, setPictureModalOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditableStudent(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = async () => {
    const studentToUpdate = {
        ...editableStudent,
        email: editableStudent.email.trim().toLowerCase(),
    };
    await onUpdate(studentToUpdate);
    setIsEditing(false);
  }

  const handleAddSession = async (type: ClassSessionType) => {
    const studentPlan = plans.find(p => p.id === editableStudent.planId);
    let updatedStudent = { ...editableStudent };
    
    const newSession: ClassSession = {
      id: new Date().toISOString() + Math.random(),
      date: new Date().toISOString(),
      type: type,
    };
    updatedStudent.sessions = [...updatedStudent.sessions, newSession];

    // Deduct session for regular classes and absences on session-based plans
    if ((type === 'regular' || type === 'absent') && studentPlan?.type === 'session' && updatedStudent.remainingSessions != null) {
        updatedStudent.remainingSessions -= 1;
    }
    
    setEditableStudent(updatedStudent);
    await onUpdate(updatedStudent);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta aula do histórico?")) return;

    const sessionToDelete = editableStudent.sessions.find(s => s.id === sessionId);
    if (!sessionToDelete) return;

    const studentPlan = plans.find(p => p.id === editableStudent.planId);
    let updatedStudent = { ...editableStudent };

    updatedStudent.sessions = updatedStudent.sessions.filter(s => s.id !== sessionId);

    // If it was a regular session or an absence for a session-based plan, give the session back
    if ((sessionToDelete.type === 'regular' || sessionToDelete.type === 'absent') && studentPlan?.type === 'session' && updatedStudent.remainingSessions != null) {
        updatedStudent.remainingSessions += 1;
    }

    setEditableStudent(updatedStudent);
    await onUpdate(updatedStudent);
  }
  
  const handleConfirmPayment = async (method: PaymentMethod) => {
    const plan = plans.find(p => p.id === editableStudent.planId);
    if (!plan) return;

    // Create payment record
    const paymentRecord: Omit<Payment, 'id'> = {
        studentId: student.id,
        studentName: student.name,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        paymentDate: new Date().toISOString(),
        paymentMethod: method,
    };
    await onAddPayment(paymentRecord);

    // Update student
    let updatedStudent = { ...editableStudent };
    if (plan.type === 'duration' && plan.durationInDays) {
        const newDueDate = new Date();
        newDueDate.setDate(newDueDate.getDate() + plan.durationInDays);
        updatedStudent.paymentDueDate = newDueDate.toISOString();
    } else if (plan.type === 'session' && plan.numberOfSessions) {
        // If the student owes classes (negative remainingSessions), deduct them from the new plan.
        const currentBalance = updatedStudent.remainingSessions ?? 0;
        updatedStudent.remainingSessions = currentBalance + plan.numberOfSessions;
        updatedStudent.paymentDueDate = null; // Clear due date for session plans
    }
    
    setEditableStudent(updatedStudent);
    await onUpdate(updatedStudent);
    setPaymentModalOpen(false);
  }

  const handleDelete = async () => {
    if (window.confirm(`Tem certeza que deseja excluir ${student.name}? Esta ação não pode ser desfeita.`)) {
      await onDelete(student.id);
    }
  }

  const studentPlan = plans.find(p => p.id === student.planId);
  const isPaymentDue = studentPlan?.type === 'duration' && student.paymentDueDate && new Date(student.paymentDueDate) < new Date();
  const areSessionsLow = studentPlan?.type === 'session' && (student.remainingSessions != null && student.remainingSessions <= 0);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const sessionTypeInfo = {
    regular: { label: 'Aula Normal', color: 'text-gray-500', bg: 'bg-gray-100' },
    extra: { label: 'Aula Extra (Bônus)', color: 'text-blue-500', bg: 'bg-blue-100' },
    absent: { label: 'Falta', color: 'text-red-500', bg: 'bg-red-100' },
  };

  return (
    <>
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
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                <div className="relative group flex-shrink-0">
                    {student.profilePictureUrl ? (
                        <img src={student.profilePictureUrl} alt={student.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"/>
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-md">
                            <UserIcon className="w-12 h-12 text-gray-500"/>
                        </div>
                    )}
                    <button onClick={() => setPictureModalOpen(true)} className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full transition-opacity opacity-0 group-hover:opacity-100">
                        <CameraIcon className="w-8 h-8 text-white"/>
                    </button>
                </div>

                <div className="flex-1 w-full">
                    <div className="flex flex-col-reverse items-center sm:flex-row sm:justify-between sm:items-start w-full gap-4 sm:gap-0">
                        <div className="text-center sm:text-left">
                            <p><strong>Email:</strong> {student.email || 'N/A'}</p>
                            <p><strong>Telefone:</strong> {student.phone || 'N/A'}</p>
                            <p><strong>Início:</strong> {formatDate(student.startDate)}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsEditing(true)} className="px-3 py-1 text-sm font-medium text-white bg-brand-secondary rounded-md hover:bg-gray-700">Editar</button>
                            <button onClick={handleDelete} className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Excluir</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`p-4 rounded-lg ${(isPaymentDue || areSessionsLow) ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border`}>
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg">{studentPlan?.name || 'Sem plano'}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            {(isPaymentDue || areSessionsLow) ? <ExclamationCircleIcon className="w-5 h-5 text-red-500" /> : <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                             <span className={(isPaymentDue || areSessionsLow) ? 'text-red-600' : 'text-green-600'}>
                                {studentPlan?.type === 'duration' && (student.paymentDueDate ? `Vencimento em ${formatDate(student.paymentDueDate)}` : 'Sem data de vencimento')}
                                {studentPlan?.type === 'session' && (() => {
                                    const remaining = student.remainingSessions;
                                    if (remaining == null) return "Contagem de aulas não iniciada";
                                    if (remaining < 0) {
                                        const plural = Math.abs(remaining) > 1;
                                        return `${Math.abs(remaining)} aula${plural ? 's' : ''} devendo (a deduzir na renovação)`;
                                    }
                                    if (remaining === 0) return 'Nenhuma aula restante';
                                    const plural = remaining > 1;
                                    return `${remaining} aula${plural ? 's' : ''} restante${plural ? 's' : ''}`;
                                })()}
                                {!studentPlan && 'Aluno sem plano ativo'}
                            </span>
                        </div>
                    </div>
                    {student.planId && <button onClick={() => setPaymentModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Marcar como Pago/Renovar</button>}
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg">Histórico de Aulas</h3>
                    <div className="flex gap-2">
                        <button onClick={() => handleAddSession('regular')} className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">
                            <PlusIcon className="w-4 h-4" /> Aula de Hoje
                        </button>
                         <button onClick={() => handleAddSession('extra')} title="Adicionar aula extra gratuita" className="px-3 py-1 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600">Extra</button>
                         <button onClick={() => handleAddSession('absent')} title="Marcar falta" className="px-3 py-1 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600">Falta</button>
                    </div>
                </div>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {student.sessions.length > 0 ? (
                        <ul className="divide-y">
                            {student.sessions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(session => {
                                const sessionInfo = sessionTypeInfo[session.type] || { label: 'Desconhecido', color: 'text-gray-500', bg: 'bg-gray-100' };
                                return (
                                <li key={session.id} className={`p-3 flex justify-between items-center ${sessionInfo.bg}`}>
                                    <div className="flex items-center gap-3">
                                        <CalendarIcon className={`w-5 h-5 ${sessionInfo.color}`} />
                                        <div>
                                            <span className="font-medium">{new Date(session.date).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</span>
                                            <span className={`ml-2 text-xs font-semibold ${sessionInfo.color}`}>({sessionInfo.label})</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteSession(session.id)} className="text-gray-400 hover:text-red-600">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </li>
                            )})}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 p-4">Nenhuma aula registrada.</p>
                    )}
                </div>
            </div>
        </div>
      )}
    </Modal>
    {isPaymentModalOpen && studentPlan && (
        <PaymentModal 
            isOpen={isPaymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            onConfirm={handleConfirmPayment}
            studentName={student.name}
            planName={studentPlan.name}
            planPrice={studentPlan.price}
        />
    )}
    {isPictureModalOpen && (
        <ProfilePictureModal
            student={student}
            isOpen={isPictureModalOpen}
            onClose={() => setPictureModalOpen(false)}
            onUpdateStudent={onUpdate}
        />
    )}
    </>
  );
};

export default StudentDetailsModal;
