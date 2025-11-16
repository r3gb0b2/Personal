import React, { useState } from 'react';
import { Plan, Student, DaySchedule, Trainer } from '../types';
import { PlusIcon, TrashIcon } from './icons';
import { sendEmail, generateEmailTemplate } from '../services/emailService';

interface AddStudentViewProps {
  plans: Plan[];
  onBack: () => void;
  onAdd: (student: Omit<Student, 'id'>) => Promise<void>;
  allStudents: Student[];
  trainer: Trainer;
}

const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const checkScheduleConflict = (
    scheduleToCheck: DaySchedule[],
    allStudents: Student[]
): { hasConflict: boolean; conflictWith?: string } => {
    if (!scheduleToCheck) {
        return { hasConflict: false };
    }

    for (const scheduleItem of scheduleToCheck) {
        if (!scheduleItem.startTime || !scheduleItem.endTime) continue;
        const startA = timeToMinutes(scheduleItem.startTime);
        const endA = timeToMinutes(scheduleItem.endTime);

        for (const otherStudent of allStudents) {
            if (!otherStudent.schedule) {
                continue;
            }

            for (const otherScheduleItem of otherStudent.schedule) {
                 if (!otherScheduleItem.startTime || !otherScheduleItem.endTime) continue;
                if (scheduleItem.day === otherScheduleItem.day) {
                    const startB = timeToMinutes(otherScheduleItem.startTime);
                    const endB = timeToMinutes(otherScheduleItem.endTime);

                    if (startA < endB && startB < endA) {
                        return { hasConflict: true, conflictWith: otherStudent.name };
                    }
                }
            }
        }
    }

    return { hasConflict: false };
};

const initialStudentState = {
    name: '',
    email: '',
    phone: '',
    planId: '',
    schedule: [],
    birthDate: '',
    accessBlocked: false,
};

const AddStudentView: React.FC<AddStudentViewProps> = ({ plans, onBack, onAdd, allStudents, trainer }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStudent, setNewStudent] = useState(initialStudentState);
  const [sendLoginEmail, setSendLoginEmail] = useState(true);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    // @ts-ignore
    const inputValue = isCheckbox ? e.target.checked : value;
    setNewStudent(prev => ({ ...prev, [name]: inputValue }));
  };

  const daysOfWeek = [
    { id: 'monday', label: 'Segunda-feira' }, { id: 'tuesday', label: 'Terça-feira' },
    { id: 'wednesday', label: 'Quarta-feira' }, { id: 'thursday', label: 'Quinta-feira' },
    { id: 'friday', label: 'Sexta-feira' }, { id: 'saturday', label: 'Sábado' },
    { id: 'sunday', label: 'Domingo' },
  ];

  const handleScheduleChange = (index: number, field: keyof DaySchedule, value: string) => {
    const updatedSchedule = [...newStudent.schedule];
    updatedSchedule[index] = { ...updatedSchedule[index], [field]: value };
    setNewStudent(prev => ({ ...prev, schedule: updatedSchedule }));
  };

  const addScheduleItem = () => {
    setNewStudent(prev => ({ ...prev, schedule: [...prev.schedule, { day: 'monday', startTime: '', endTime: '' }] }));
  };

  const removeScheduleItem = (index: number) => {
    setNewStudent(prev => ({ ...prev, schedule: prev.schedule.filter((_, i) => i !== index) }));
  };

  const sendWelcomeEmail = async (student: Omit<Student, 'id'>) => {
    const subject = `Bem-vindo(a)! Seus dados de acesso`;
    const body = `
        <p>Olá ${student.name},</p>
        <p>Seu cadastro foi realizado com sucesso!</p>
        <p>Você pode acessar o Portal do Aluno para visualizar seus treinos, pagamentos e muito mais.</p>
        <p><strong>Seu login é o seu e-mail:</strong> ${student.email}</p>
        <p>Clique no link abaixo para acessar:</p>
        <p><a href="${window.location.origin}" style="color: #0052cc; text-decoration: none; border: 1px solid #0052cc; padding: 10px 15px; border-radius: 5px; display: inline-block;">Acessar Portal do Aluno</a></p>
    `;
    const htmlContent = generateEmailTemplate(subject, body, trainer);
    await sendEmail({
        recipients: [{ email: student.email, name: student.name }],
        subject, htmlContent, trainer,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name.trim()) {
      alert("O nome do aluno é obrigatório."); return;
    }
    
    if (newStudent.email) {
        const emailExists = allStudents.some(
            student => student.email.toLowerCase() === newStudent.email.trim().toLowerCase()
        );
        if (emailExists) {
            alert("Este e-mail já está cadastrado para outro aluno.");
            return;
        }
    }
    
    const { hasConflict, conflictWith } = checkScheduleConflict(newStudent.schedule, allStudents);
    if (hasConflict && !window.confirm(`Atenção: Este horário conflita com o de ${conflictWith}. Deseja salvar mesmo assim?`)) {
        return;
    }
    const selectedPlan = plans.find(p => p.id === newStudent.planId);
    let paymentDueDate: string | null = null;
    let remainingSessions: number | null = null;
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
      email: newStudent.email.trim().toLowerCase(),
      phone: newStudent.phone.trim(),
      startDate: new Date().toISOString(),
      planId: newStudent.planId || null,
      paymentDueDate, remainingSessions, sessions: [],
      profilePictureUrl: null, trainerId: '',
      schedule: newStudent.schedule.length > 0 ? newStudent.schedule.filter(s => s.startTime && s.endTime) : null,
      birthDate: newStudent.birthDate ? new Date(newStudent.birthDate).toISOString() : null,
      accessBlocked: newStudent.accessBlocked,
    };

    setIsSubmitting(true);
    try {
        await onAdd(studentToAdd);
        if (sendLoginEmail && studentToAdd.email) {
            await sendWelcomeEmail(studentToAdd);
        }
    } catch (error) {
        console.error("Failed to add student:", error);
        alert("Houve um erro ao salvar o aluno.");
        setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-brand-dark">Adicionar Novo Aluno</h2>
            <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Voltar</button>
        </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700">Nome Completo</label><input type="text" name="name" value={newStudent.name} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" required /></div>
        <div><label className="block text-sm font-medium text-gray-700">Email</label><input type="email" name="email" value={newStudent.email} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Telefone</label><input type="tel" name="phone" value={newStudent.phone} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Data de Nascimento</label><input type="date" name="birthDate" value={newStudent.birthDate} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Plano Inicial</label><select name="planId" value={newStudent.planId} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"><option value="">Nenhum plano</option>{plans.map(plan => (<option key={plan.id} value={plan.id}>{plan.name} - R$ {plan.price.toFixed(2)}</option>))}</select><p className="mt-1 text-xs text-gray-500">O status inicial do aluno será definido com base no plano selecionado.</p></div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Horário Fixo (Opcional)</label>
            <div className="mt-2 p-3 border rounded-md space-y-3 bg-gray-50">
                 {newStudent.schedule.map((item, index) => (<div key={index} className="grid grid-cols-[1fr,auto,auto,auto] gap-2 items-center"><select value={item.day} onChange={(e) => handleScheduleChange(index, 'day', e.target.value)} className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">{daysOfWeek.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select><input type="time" value={item.startTime} onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)} className="border border-gray-300 rounded-md shadow-sm py-2 px-3" /><input type="time" value={item.endTime} onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)} className="border border-gray-300 rounded-md shadow-sm py-2 px-3" /><button type="button" onClick={() => removeScheduleItem(index)} className="text-red-500 hover:text-red-700 p-1" aria-label="Remover horário"><TrashIcon className="w-5 h-5" /></button></div>))}
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addScheduleItem(); }} className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-brand-primary bg-blue-100 rounded-md hover:bg-blue-200"><PlusIcon className="w-4 h-4" /> Adicionar Horário</button>
            </div>
        </div>
        <div className="space-y-2 pt-2">
            <div className="flex items-center"><input id="accessBlocked" name="accessBlocked" type="checkbox" checked={newStudent.accessBlocked} onChange={handleInputChange} className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300 rounded" /><label htmlFor="accessBlocked" className="ml-2 block text-sm text-gray-900">Bloquear acesso do aluno ao portal (por inadimplência)</label></div>
            <div className="flex items-center"><input id="sendLoginEmail" name="sendLoginEmail" type="checkbox" checked={sendLoginEmail} onChange={(e) => setSendLoginEmail(e.target.checked)} className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300 rounded" /><label htmlFor="sendLoginEmail" className="ml-2 block text-sm text-gray-900">Enviar e-mail com informações de acesso</label></div>
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent disabled:bg-gray-400">{isSubmitting ? 'Salvando...' : 'Salvar Aluno'}</button>
        </div>
      </form>
    </div>
  );
};

export default AddStudentView;