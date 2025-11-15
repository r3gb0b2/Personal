import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Student, Plan, ClassSession, Payment, PaymentMethod, ClassSessionType, Workout, StudentFile, ProgressPhoto, DaySchedule, Trainer, Exercise, WorkoutTemplate, StudentGroup } from '../types';
import { CalendarIcon, CheckCircleIcon, ExclamationCircleIcon, PlusIcon, TrashIcon, UserIcon, CameraIcon, FileTextIcon, ImageIcon, LinkIcon, SendIcon, BriefcaseIcon, MailIcon, DumbbellIcon, PencilIcon, EyeIcon, EyeOffIcon, CloneIcon, UsersIcon } from './icons';
import Modal from './modals/Modal';
import PaymentModal from './modals/PaymentModal';
import ProfilePictureModal from './modals/ProfilePictureModal';
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendEmail, generateEmailTemplate } from '../services/emailService';
import WorkoutEditor from './WorkoutEditor';
import CloneWorkoutModal from './modals/CloneWorkoutModal';

interface StudentDetailsModalProps {
  student: Student;
  plans: Plan[];
  trainer: Trainer;
  workoutTemplates: WorkoutTemplate[];
  groups: StudentGroup[];
  onClose: () => void;
  onUpdate: (student: Student) => Promise<void>;
  onDelete: (studentId: string) => Promise<void>;
  onAddPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
  allStudents: Student[];
}

type Tab = 'details' | 'workouts' | 'files' | 'progress';

const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const checkScheduleConflict = (
    currentStudentId: string,
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
            if (otherStudent.id === currentStudentId || !otherStudent.schedule) {
                continue;
            }

            for (const otherScheduleItem of otherStudent.schedule) {
                 if (!otherScheduleItem.startTime || !otherScheduleItem.endTime) continue;
                if (scheduleItem.day === otherScheduleItem.day) {
                    const startB = timeToMinutes(otherScheduleItem.startTime);
                    const endB = timeToMinutes(otherScheduleItem.endTime);

                    // Check for overlap
                    if (startA < endB && startB < endA) {
                        return { hasConflict: true, conflictWith: otherStudent.name };
                    }
                }
            }
        }
    }

    return { hasConflict: false };
};

const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({ student, plans, trainer, workoutTemplates, groups, onClose, onUpdate, onDelete, onAddPayment, allStudents }) => {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [editableStudent, setEditableStudent] = useState<Student>(student);
  const [isEditing, setIsEditing] = useState(false);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isPictureModalOpen, setPictureModalOpen] = useState(false);
  const [workoutToClone, setWorkoutToClone] = useState<Workout | null>(null);
  
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [studentFiles, setStudentFiles] = useState<StudentFile[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(true);

  const fetchFeatureData = useCallback(async () => {
    if (!student) return;
    setIsLoadingFeatures(true);
    const toISO = (ts: any) => ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString();
    try {
        const workoutsQuery = query(collection(db, 'workouts'), where("studentId", "==", student.id), orderBy("createdAt", "desc"));
        const workoutsSnapshot = await getDocs(workoutsQuery);
        setWorkouts(workoutsSnapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) } as Workout)));

        const filesQuery = query(collection(db, 'studentFiles'), where("studentId", "==", student.id), orderBy("uploadedAt", "desc"));
        const filesSnapshot = await getDocs(filesQuery);
        setStudentFiles(filesSnapshot.docs.map(d => ({ id: d.id, ...d.data(), uploadedAt: toISO(d.data().uploadedAt) } as StudentFile)));

        const photosQuery = query(collection(db, 'progressPhotos'), where("studentId", "==", student.id), orderBy("uploadedAt", "desc"));
        const photosSnapshot = await getDocs(photosQuery);
setProgressPhotos(photosSnapshot.docs.map(d => ({ id: d.id, ...d.data(), uploadedAt: toISO(d.data().uploadedAt) } as ProgressPhoto)));

    } catch (e) {
        console.error("Error fetching student feature data:", e);
    } finally {
        setIsLoadingFeatures(false);
    }
  }, [student]);

  useEffect(() => {
    fetchFeatureData();
  }, [fetchFeatureData]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    // @ts-ignore
    const inputValue = isCheckbox ? e.target.checked : value;
    setEditableStudent(prev => ({ ...prev, [name]: inputValue }));
  };
  
  const handleSave = async () => {
    const { hasConflict, conflictWith } = checkScheduleConflict(
        editableStudent.id,
        editableStudent.schedule ?? [],
        allStudents
    );

    if (hasConflict) {
        if (!window.confirm(`Atenção: Este horário conflita com o de ${conflictWith}. Deseja salvar mesmo assim?`)) {
            return; // Abort save if user clicks "Cancel"
        }
    }
    
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
    if ((sessionToDelete.type === 'regular' || sessionToDelete.type === 'absent') && studentPlan?.type === 'session' && updatedStudent.remainingSessions != null) {
        updatedStudent.remainingSessions += 1;
    }
    setEditableStudent(updatedStudent);
    await onUpdate(updatedStudent);
  }
  
  const handleConfirmPayment = async (method: PaymentMethod) => {
    const plan = plans.find(p => p.id === editableStudent.planId);
    if (!plan) return;

    const paymentRecord: Omit<Payment, 'id'> = {
        studentId: student.id,
        studentName: student.name,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        paymentDate: new Date().toISOString(),
        paymentMethod: method,
        trainerId: student.trainerId,
    };
    await onAddPayment(paymentRecord);

    let updatedStudent = { ...editableStudent };
    if (plan.type === 'duration' && plan.durationInDays) {
        const today = new Date();
        const currentDueDate = editableStudent.paymentDueDate ? new Date(editableStudent.paymentDueDate) : today;
        
        const baseDate = currentDueDate > today ? currentDueDate : today;
        
        const newDueDate = new Date(baseDate);
        newDueDate.setDate(newDueDate.getDate() + plan.durationInDays);
        updatedStudent.paymentDueDate = newDueDate.toISOString();
        // Clear session count when renewing a duration-based plan to avoid data conflicts
        updatedStudent.remainingSessions = null;

    } else if (plan.type === 'session') {
        if (!plan.numberOfSessions || plan.numberOfSessions <= 0) {
            alert("Erro: Este plano de sessão não tem um número de aulas válido configurado. Por favor, edite o plano em 'Gerenciar Planos' antes de registrar o pagamento.");
            setPaymentModalOpen(false); // Close modal to prevent further action
            return; // Stop execution to prevent data corruption
        }
        
        const currentBalance = updatedStudent.remainingSessions ?? 0;
        updatedStudent.remainingSessions = currentBalance + plan.numberOfSessions;
        updatedStudent.paymentDueDate = null;
        updatedStudent.remindersSent = {};
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

  const handleCloneWorkout = async (targetStudentIds: string[]): Promise<{success: boolean, message?: string}> => {
    if (!workoutToClone) return { success: false, message: 'Nenhum treino selecionado para clonar.' };

    try {
        // Clone exercises but clear out any student-specific feedback
        const clonedExercises = workoutToClone.exercises.map(ex => {
            const { studentFeedback, ...restOfExercise } = ex;
            return restOfExercise;
        });

        const clonePromises = targetStudentIds.map(studentId => {
            const newWorkoutData = {
                title: workoutToClone.title,
                exercises: clonedExercises,
                studentId: studentId,
                trainerId: workoutToClone.trainerId, // Keep the same trainer
                createdAt: Timestamp.now(),
            };
            return addDoc(collection(db, 'workouts'), newWorkoutData);
        });

        await Promise.all(clonePromises);
        return { success: true };

    } catch (error) {
        console.error("Error cloning workout:", error);
        return { success: false, message: "Ocorreu um erro ao salvar os treinos clonados." };
    }
  };


  const TabButton = ({ tab, label, Icon }: { tab: Tab, label: string, Icon: React.FC<{className?: string}> }) => (
    <button
        onClick={() => setActiveTab(tab)}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 ${activeTab === tab ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
    >
        <Icon className="w-5 h-5"/>
        <span>{label}</span>
    </button>
  );

  const renderContent = () => {
    if (isLoadingFeatures) {
        return <div className="text-center p-8">Carregando...</div>;
    }
    switch (activeTab) {
        case 'workouts': return <WorkoutsTab student={student} trainer={trainer} workouts={workouts} templates={workoutTemplates} onUpdate={fetchFeatureData} onCloneRequest={(workout) => setWorkoutToClone(workout)} />;
        case 'files': return <FilesTab student={student} files={studentFiles} onUpdate={fetchFeatureData} />;
        case 'progress': return <ProgressTab student={student} photos={progressPhotos} onUpdate={fetchFeatureData} />;
        case 'details':
        default:
            return <DetailsTab student={student} plans={plans} trainer={trainer} groups={groups} isEditing={isEditing} setIsEditing={setIsEditing} editableStudent={editableStudent} setEditableStudent={setEditableStudent} handleSave={handleSave} handleDelete={handleDelete} setPictureModalOpen={setPictureModalOpen} setPaymentModalOpen={setPaymentModalOpen} handleAddSession={handleAddSession} handleDeleteSession={handleDeleteSession} onUpdate={onUpdate} />;
    }
  };


  return (
    <>
    <Modal title={isEditing ? `Editando ${student.name}` : student.name} isOpen={true} onClose={onClose} size="xl">
        <div className="flex border-b">
            <TabButton tab="details" label="Detalhes" Icon={UserIcon} />
            <TabButton tab="workouts" label="Treinos" Icon={DumbbellIcon} />
            <TabButton tab="files" label="Arquivos" Icon={FileTextIcon} />
            <TabButton tab="progress" label="Progresso" Icon={ImageIcon} />
        </div>
        <div className="pt-4">
            {renderContent()}
        </div>
    </Modal>
    {isPaymentModalOpen && (
        <PaymentModal 
            isOpen={isPaymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            onConfirm={handleConfirmPayment}
            studentName={student.name}
            planName={plans.find(p => p.id === editableStudent.planId)?.name || ''}
            planPrice={plans.find(p => p.id === editableStudent.planId)?.price || 0}
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
    {workoutToClone && (
        <CloneWorkoutModal
            isOpen={!!workoutToClone}
            onClose={() => setWorkoutToClone(null)}
            workoutToClone={workoutToClone}
            students={allStudents}
            groups={groups}
            currentStudentId={student.id}
            onClone={handleCloneWorkout}
        />
    )}
    </>
  );
};


// --- TAB COMPONENTS ---

const DetailsTab: React.FC<any> = ({ student, plans, trainer, groups, isEditing, setIsEditing, editableStudent, setEditableStudent, handleSave, handleDelete, setPictureModalOpen, setPaymentModalOpen, handleAddSession, handleDeleteSession, onUpdate }) => {
    const [isSendingReminder, setIsSendingReminder] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        // @ts-ignore
        const inputValue = isCheckbox ? e.target.checked : value;
        setEditableStudent((prev: Student) => ({ ...prev, [name]: inputValue }));
    };

    const handleGroupToggle = (groupId: string) => {
        const currentGroupIds = editableStudent.groupIds || [];
        const newGroupIds = currentGroupIds.includes(groupId)
            ? currentGroupIds.filter((id: string) => id !== groupId)
            : [...currentGroupIds, groupId];
        setEditableStudent((prev: Student) => ({ ...prev, groupIds: newGroupIds }));
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
        const updatedSchedule = [...(editableStudent.schedule || [])];
        updatedSchedule[index] = { ...updatedSchedule[index], [field]: value };
        setEditableStudent((prev: Student) => ({ ...prev, schedule: updatedSchedule }));
    };

    const addScheduleItem = () => {
        const newScheduleItem = { day: 'monday', startTime: '', endTime: '' };
        setEditableStudent((prev: Student) => ({
            ...prev,
            schedule: [...(prev.schedule || []), newScheduleItem]
        }));
    };

    const removeScheduleItem = (index: number) => {
        setEditableStudent((prev: Student) => ({
            ...prev,
            schedule: (prev.schedule || []).filter((_, i) => i !== index)
        }));
    };
    
    const studentPlan = plans.find((p: Plan) => p.id === student.planId);
    const studentGroups = student.groupIds?.map((id: string) => groups.find((g: StudentGroup) => g.id === id)?.name).filter(Boolean) || [];
    const isPaymentDue = studentPlan?.type === 'duration' && student.paymentDueDate && new Date(student.paymentDueDate) < new Date();
    const areSessionsLow = studentPlan?.type === 'session' && (student.remainingSessions != null && student.remainingSessions <= 0);
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    const sessionTypeInfo: { [key: string]: { label: string; color: string; bg: string; } } = { regular: { label: 'Aula Normal', color: 'text-gray-500', bg: 'bg-gray-100' }, extra: { label: 'Aula Extra (Bônus)', color: 'text-blue-500', bg: 'bg-blue-100' }, absent: { label: 'Falta', color: 'text-red-500', bg: 'bg-red-100' }, };

    const dayMap: { [key: string]: string } = {
        sunday: 'Domingo', monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta',
        thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado',
    };
    const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const sortedSchedule = student.schedule ? [...student.schedule].sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)) : [];
    
    const remainingSessions = student.remainingSessions;
    let reminderSentMessage = null;
    if (remainingSessions && student.remindersSent && student.remindersSent[`sessions_${remainingSessions}`]) {
        const reminderDate = new Date(student.remindersSent[`sessions_${remainingSessions}`]).toLocaleDateString('pt-BR');
        reminderSentMessage = `Lembrete automático enviado em ${reminderDate}.`;
    }

    const handleSendManualReminder = async () => {
        if (!student.email) {
            alert("Este aluno não possui um e-mail cadastrado.");
            return;
        }

        const plan = plans.find((p: Plan) => p.id === student.planId);
        if (!plan) {
            alert("O aluno não possui um plano ativo para enviar um lembrete.");
            return;
        }

        let subject = "";
        let bodyMessage = "";
        let greeting = `<p>Olá ${student.name},</p>`;

        if (plan.type === 'duration' && student.paymentDueDate) {
            subject = "Lembrete de Vencimento do seu Plano";
            bodyMessage = `<p>Lembramos que seu plano "${plan.name}" vence no dia ${formatDate(student.paymentDueDate)}. Para continuar treinando sem interrupções, por favor, realize a renovação.</p>`;
        } else if (plan.type === 'session' && student.remainingSessions != null) {
            subject = "Lembrete sobre suas Aulas";
            const remaining = student.remainingSessions;
            if (remaining < 0) {
                const plural = Math.abs(remaining) !== 1;
                bodyMessage = `<p>Notamos que você utilizou ${Math.abs(remaining)} aula${plural ? 's' : ''} além do seu pacote. Fale comigo para regularizar e garantir seu próximo pacote de aulas!</p>`;
            } else {
                const plural = remaining !== 1;
                bodyMessage = `<p>Seu pacote de aulas "${plan.name}" está chegando ao fim. Atualmente, você tem ${remaining} aula${plural ? 's' : ''} restante${plural ? 's' : ''}. Fale comigo para garantir seu próximo pacote!</p>`;
            }
        } else {
            alert("Não foi possível gerar uma mensagem de lembrete para o plano atual deste aluno.");
            return;
        }
        
        const fullBody = `${greeting}${bodyMessage}<p>Qualquer dúvida, é só responder a este e-mail.</p>`;

        const confirmation = window.confirm(
            `Você está prestes a enviar um lembrete para ${student.name}. Deseja continuar?`
        );

        if (!confirmation) return;

        setIsSendingReminder(true);

        const htmlContent = generateEmailTemplate(subject, fullBody, trainer);

        const result = await sendEmail({
            recipients: [{ email: student.email, name: student.name }],
            subject,
            htmlContent,
            trainer,
        });

        setIsSendingReminder(false);

        if (result.success) {
            alert("Lembrete enviado com sucesso!");
        } else {
            alert(`Falha ao enviar o lembrete: ${result.error}`);
        }
    };


    return (
        isEditing ? (
            <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700">Nome</label><input type="text" name="name" value={editableStudent.name} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"/></div>
                <div><label className="block text-sm font-medium text-gray-700">Email</label><input type="email" name="email" value={editableStudent.email} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"/></div>
                <div><label className="block text-sm font-medium text-gray-700">Telefone</label><input type="tel" name="phone" value={editableStudent.phone} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"/></div>
                <div><label className="block text-sm font-medium text-gray-700">Data de Nascimento</label><input type="date" name="birthDate" value={editableStudent.birthDate ? new Date(editableStudent.birthDate).toISOString().split('T')[0] : ''} onChange={e => setEditableStudent((prev: Student) => ({...prev, birthDate: e.target.value ? new Date(e.target.value).toISOString() : null}))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"/></div>
                <div><label className="block text-sm font-medium text-gray-700">Plano</label><select name="planId" value={editableStudent.planId ?? ''} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"><option value="">Sem Plano</option>{plans.map((p: Plan) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div className="flex items-center"><input id="accessBlocked" name="accessBlocked" type="checkbox" checked={!!editableStudent.accessBlocked} onChange={handleInputChange} className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300 rounded" /><label htmlFor="accessBlocked" className="ml-2 block text-sm text-gray-900">Bloquear acesso do aluno ao portal</label></div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Grupos</label>
                    <div className="mt-2 p-3 border rounded-md grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50">
                        {groups.map((group: StudentGroup) => (
                           <label key={group.id} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editableStudent.groupIds?.includes(group.id)}
                                    onChange={() => handleGroupToggle(group.id)}
                                    className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-800">{group.name}</span>
                            </label>
                        ))}
                        {groups.length === 0 && <p className="text-sm text-gray-500 col-span-full">Nenhum grupo criado.</p>}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Horário Fixo</label>
                    <div className="mt-2 p-3 border rounded-md space-y-3 bg-gray-50">
                        {editableStudent.schedule?.map((item: DaySchedule, index: number) => (
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
                            onClick={(e) => {
                                e.stopPropagation();
                                addScheduleItem();
                            }}
                            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-brand-primary bg-blue-100 rounded-md hover:bg-blue-200"
                        >
                            <PlusIcon className="w-4 h-4" /> Adicionar Horário
                        </button>
                    </div>
                </div>
                <div className="flex justify-end gap-4"><button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button><button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">Salvar</button></div>
            </div>
        ) : (
            <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start"><div className="relative group flex-shrink-0">{student.profilePictureUrl ? (<img src={student.profilePictureUrl} alt={student.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"/>) : (<div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-md"><UserIcon className="w-12 h-12 text-gray-500"/></div>)}<button onClick={() => setPictureModalOpen(true)} className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full transition-opacity opacity-0 group-hover:opacity-100"><CameraIcon className="w-8 h-8 text-white"/></button></div><div className="flex-1 w-full"><div className="flex flex-col-reverse items-center sm:flex-row sm:justify-between sm:items-start w-full gap-4 sm:gap-0"><div className="text-center sm:text-left"><p><strong>Email:</strong> {student.email || 'N/A'}</p><p><strong>Telefone:</strong> {student.phone || 'N/A'}</p><p><strong>Início:</strong> {formatDate(student.startDate)}</p><p><strong>Nascimento:</strong> {student.birthDate ? formatDate(student.birthDate) : 'N/A'}</p> <div>
                <p className="font-semibold">Horário:</p>
                {sortedSchedule.length > 0 ? (
                    <ul className="pl-4 list-disc mt-1 space-y-1">
                        {sortedSchedule.map((item, index) => (
                            <li key={index} className="text-gray-700">
                                <span className="font-medium">{dayMap[item.day] || item.day}:</span> {item.startTime} às {item.endTime}
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-gray-600">Nenhum horário definido</p>}
            </div></div><div className="flex gap-2"><button onClick={() => setIsEditing(true)} className="px-3 py-1 text-sm font-medium text-white bg-brand-secondary rounded-md hover:bg-gray-700">Editar</button><button onClick={handleDelete} className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Excluir</button></div></div>{student.accessBlocked && (<div className="mt-2 text-center sm:text-left p-2 bg-red-100 text-red-800 rounded-md text-sm font-semibold">Acesso ao portal bloqueado.</div>)}</div></div>
            <div className="p-4 rounded-lg bg-gray-50 border">
                 <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><UsersIcon className="w-6 h-6 text-gray-500" /> Grupos</h3>
                 <div className="flex flex-wrap gap-2">
                    {studentGroups.length > 0 ? studentGroups.map(g => <span key={g} className="px-3 py-1 text-sm font-medium bg-cyan-100 text-cyan-800 rounded-full">{g}</span>) : <p className="text-sm text-gray-500">Nenhum grupo atribuído.</p>}
                 </div>
            </div>
            <div className={`p-4 rounded-lg ${(isPaymentDue || areSessionsLow) ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border`}>
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg">{studentPlan?.name || 'Sem plano'}</h3>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mt-1">
                                <span className={(isPaymentDue || areSessionsLow) ? 'text-red-600' : 'text-green-600'}>
                                    {(isPaymentDue || areSessionsLow) ? <ExclamationCircleIcon className="w-5 h-5 text-red-500" /> : <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                                    {studentPlan?.type === 'duration' && (student.paymentDueDate ? `Vencimento em ${formatDate(student.paymentDueDate)}` : 'Sem data de vencimento')}
                                    {studentPlan?.type === 'session' && (() => {const remaining = student.remainingSessions;if (remaining == null) return "Contagem de aulas não iniciada";if (remaining < 0) {const plural = Math.abs(remaining) > 1;return `${Math.abs(remaining)} aula${plural ? 's' : ''} devendo (a deduzir na renovação)`;}if (remaining === 0) return 'Nenhuma aula restante';const plural = remaining > 1;return `${remaining} aula${plural ? 's' : ''} restante${plural ? 's' : ''}`;})()}
                                    {!studentPlan && 'Aluno sem plano ativo'}
                                </span>
                            </div> 
                            {reminderSentMessage && (<p className="text-xs text-gray-500 mt-1 italic">{reminderSentMessage}</p>)} 
                        </div>
                    </div>
                    {student.planId && <button onClick={() => setPaymentModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Marcar como Pago/Renovar</button>}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-900 border-opacity-10 flex items-center gap-4">
                    <button
                        onClick={handleSendManualReminder}
                        disabled={isSendingReminder || !student.email || !studentPlan}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title={!student.email ? "Aluno sem e-mail cadastrado" : !studentPlan ? "Aluno sem plano ativo" : "Enviar lembrete de pagamento/renovação"}
                    >
                        <MailIcon className="w-5 h-5"/>
                        {isSendingReminder ? 'Enviando...' : 'Enviar Lembrete Manual'}
                    </button>
                    {!student.email && <p className="text-xs text-gray-500">O aluno não tem e-mail para receber lembretes.</p>}
                </div>
            </div>
            <div><div className="flex justify-between items-center mb-2"><h3 className="font-bold text-lg">Histórico de Aulas</h3><div className="flex gap-2"><button onClick={() => handleAddSession('regular')} className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent"><PlusIcon className="w-4 h-4" /> Aula de Hoje</button><button onClick={() => handleAddSession('extra')} title="Adicionar aula extra gratuita" className="px-3 py-1 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600">Extra</button><button onClick={() => handleAddSession('absent')} title="Marcar falta" className="px-3 py-1 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600">Falta</button></div></div><div className="border rounded-lg max-h-48 overflow-y-auto">{student.sessions.length > 0 ? (<ul className="divide-y">{student.sessions.sort((a: ClassSession,b: ClassSession) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((session: ClassSession) => {const sessionInfo = sessionTypeInfo[session.type] || { label: 'Desconhecido', color: 'text-gray-500', bg: 'bg-gray-100' };return (<li key={session.id} className={`p-3 flex justify-between items-center ${sessionInfo.bg}`}><div className="flex items-center gap-3"><CalendarIcon className={`w-5 h-5 ${sessionInfo.color}`} /><div><span className="font-medium">{new Date(session.date).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</span><span className={`ml-2 text-xs font-semibold ${sessionInfo.color}`}>({sessionInfo.label})</span></div></div><button onClick={() => handleDeleteSession(session.id)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-5 h-5" /></button></li>)})}</ul>) : (<p className="text-center text-gray-500 p-4">Nenhuma aula registrada.</p>)}</div></div>
            </div>
        )
    );
};

const WorkoutsTab: React.FC<{ student: Student; trainer: Trainer; workouts: Workout[]; templates: WorkoutTemplate[]; onUpdate: () => void; onCloneRequest: (workout: Workout) => void; }> = ({ student, trainer, workouts, templates, onUpdate, onCloneRequest }) => {
    const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
    const [creationMode, setCreationMode] = useState<'idle' | 'choice' | 'editing'>('idle');
    const [newWorkoutData, setNewWorkoutData] = useState<Workout | null>(null);

    const handleSaveWorkout = async (workout: Omit<Workout, 'id' | 'createdAt'> | Workout) => {
        try {
            if ('id' in workout && workout.id) {
                const workoutRef = doc(db, 'workouts', workout.id);
                const dataToSave = { ...workout };
                delete (dataToSave as any).id;
                await updateDoc(workoutRef, dataToSave);
            } else {
                await addDoc(collection(db, 'workouts'), {
                    ...workout,
                    studentId: student.id,
                    trainerId: student.trainerId,
                    createdAt: Timestamp.now(),
                });
            }
            onUpdate();
            setCreationMode('idle');
            setEditingWorkout(null);
            setNewWorkoutData(null);
        } catch (error) {
            console.error("Error saving workout:", error);
            alert("Não foi possível salvar o treino.");
        }
    };

    const handleDeleteWorkout = async (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir esta planilha de treino?")) {
            await deleteDoc(doc(db, "workouts", id));
            onUpdate();
        }
    };

    const handleSelectTemplate = (template: WorkoutTemplate) => {
        const workoutFromTemplate = {
            id: '',
            studentId: student.id,
            trainerId: trainer.id,
            title: template.title,
            exercises: template.exercises.map(ex => ({...ex, id: `${Date.now()}-${Math.random()}`})), // Give new IDs to exercises
            createdAt: new Date().toISOString()
        };
        setNewWorkoutData(workoutFromTemplate);
        setCreationMode('editing');
    };

    const handleCancelCreation = () => {
        setCreationMode('idle');
        setEditingWorkout(null);
        setNewWorkoutData(null);
    };
    
    if (creationMode === 'choice') {
        return (
            <div className="p-4">
                <h3 className="font-bold text-lg mb-4">Criar Nova Planilha</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => setCreationMode('editing')} className="p-6 border rounded-lg hover:bg-gray-50 text-center">
                        <h4 className="font-semibold text-brand-dark">Começar do Zero</h4>
                        <p className="text-sm text-gray-500">Crie uma planilha de treino em branco.</p>
                    </button>
                    <button onClick={() => setCreationMode('editing')} className="p-6 border rounded-lg hover:bg-gray-50 text-center" disabled={templates.length === 0}>
                        <h4 className="font-semibold text-brand-dark">Usar Modelo</h4>
                        <p className="text-sm text-gray-500">
                            {templates.length > 0 ? `Escolha um dos ${templates.length} modelos disponíveis.` : 'Nenhum modelo criado.'}
                        </p>
                    </button>
                </div>
                
                 {templates.length > 0 && (
                     <div className="mt-6">
                        <h4 className="font-semibold mb-2">Selecione um modelo para começar:</h4>
                         <div className="space-y-2 max-h-60 overflow-y-auto">
                         {templates.map(t => (
                             <button key={t.id} onClick={() => handleSelectTemplate(t)} className="w-full text-left p-3 border rounded-md hover:bg-blue-50">
                                 <p className="font-semibold">{t.title}</p>
                                 <p className="text-xs text-gray-500">{t.exercises.length} exercícios</p>
                             </button>
                         ))}
                         </div>
                     </div>
                 )}
                 <div className="text-right mt-4">
                     <button onClick={handleCancelCreation} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                        Cancelar
                    </button>
                 </div>
            </div>
        )
    }

    if (creationMode === 'editing' || editingWorkout) {
        return <WorkoutEditor 
            initialData={editingWorkout || newWorkoutData}
            onSave={handleSaveWorkout} 
            onCancel={handleCancelCreation} 
            trainerId={trainer.id}
            studentId={student.id}
            isTemplateMode={false}
        />
    }

    return (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Planilhas de Treino</h3>
                <button onClick={() => setCreationMode('choice')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">
                    <PlusIcon className="w-5 h-5" /> Nova Planilha
                </button>
            </div>
            <div className="space-y-3">
                {workouts.length > 0 ? workouts.map(w => (
                    <div key={w.id} className="p-4 border rounded-lg bg-white shadow-sm">
                        <div className="flex justify-between items-start">
                            <p className="font-bold text-lg text-brand-dark">{w.title}</p>
                            <div className="flex gap-3">
                                <button onClick={() => onCloneRequest(w)} className="text-gray-500 hover:text-green-600" title="Clonar treino para outro aluno"><CloneIcon className="w-5 h-5"/></button>
                                <button onClick={() => setEditingWorkout(w)} className="text-gray-500 hover:text-blue-600"><PencilIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDeleteWorkout(w.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                        <div className="mt-2">
                           <p className="text-sm text-gray-500">{w.exercises?.length || 0} exercícios</p>
                           {w.exercises.some(ex => ex.studentFeedback) && (
                               <div className="mt-2 text-sm text-blue-600 font-semibold bg-blue-50 p-2 rounded-md">
                                   <p>🔔 Um ou mais exercícios têm feedback do aluno!</p>
                               </div>
                           )}
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500 p-8">Nenhuma planilha de treino criada.</p>}
            </div>
        </div>
    );
};

const FilesTab: React.FC<{student: Student, files: StudentFile[], onUpdate: () => void}> = ({ student, files, onUpdate }) => {
    // This tab is now interactive, allowing file uploads.
    // We pass student and onUpdate to handle the upload logic.
    return (
        <div>
            <h3 className="font-bold text-lg mb-2">Arquivos do Aluno</h3>
             <div className="border rounded-lg max-h-96 overflow-y-auto">
                {files.length > 0 ? (
                    <ul className="divide-y">{files.map(f => (
                        <li key={f.id} className="p-3 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <FileTextIcon className="w-6 h-6 text-brand-primary" />
                                <div>
                                    <p className="font-medium">{f.fileName}</p>
                                    <p className="text-xs text-gray-500">Enviado em: {new Date(f.uploadedAt).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Abrir</a>
                        </li>
                    ))}</ul>
                ) : <p className="text-center text-gray-500 p-8">Nenhum arquivo encontrado.</p>}
            </div>
        </div>
    );
};


const ProgressTab: React.FC<{student: Student, photos: ProgressPhoto[], onUpdate: () => void}> = ({ student, photos, onUpdate }) => {
    const [feedback, setFeedback] = useState<{[key: string]: string}>({});
    const handleFeedbackChange = (id: string, text: string) => setFeedback(prev => ({...prev, [id]: text}));
    const handleSendFeedback = async (photo: ProgressPhoto) => {
        const newFeedback = feedback[photo.id];
        if (!newFeedback || !newFeedback.trim()) return;
        const photoRef = doc(db, 'progressPhotos', photo.id);
        await updateDoc(photoRef, { trainerFeedback: newFeedback });
        setFeedback(prev => ({...prev, [photo.id]: ''}));
        onUpdate();
    };
    return (
        <div>
            <h3 className="font-bold text-lg mb-2">Fotos de Progresso</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2">
                {photos.length > 0 ? photos.map(p => (
                    <div key={p.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                        <img src={p.photoUrl} alt="Progresso" className="w-full h-48 object-cover"/>
                        <div className="p-3">
                            <p className="text-xs text-gray-500">{new Date(p.uploadedAt).toLocaleString('pt-BR')}</p>
                            {p.studentNotes && <p className="text-sm mt-1 italic">"{p.studentNotes}"</p>}
                            <div className="mt-3">
                                {p.trainerFeedback ? (
                                    <div className="bg-green-50 p-2 rounded-md border border-green-200">
                                        <p className="text-sm font-semibold text-green-800">Seu Feedback:</p>
                                        <p className="text-sm text-green-700">{p.trainerFeedback}</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <input type="text" value={feedback[p.id] || ''} onChange={e => handleFeedbackChange(p.id, e.target.value)} placeholder="Escreva um feedback..." className="flex-1 text-sm border-gray-300 rounded-md shadow-sm"/>
                                        <button onClick={() => handleSendFeedback(p)} className="p-2 bg-brand-primary text-white rounded-md hover:bg-brand-accent"><SendIcon className="w-4 h-4"/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500 p-8 col-span-full">Nenhuma foto de progresso enviada.</p>}
            </div>
        </div>
    );
};


export default StudentDetailsModal;