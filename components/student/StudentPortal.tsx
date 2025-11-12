
import React from 'react';
import { Student, Plan, Payment } from '../../types';
import { UserIcon, LogoutIcon, CalendarIcon, DollarSignIcon, BriefcaseIcon, CheckCircleIcon, ExclamationCircleIcon } from '../icons';

interface StudentPortalProps {
    studentData: {
        student: Student;
        payments: Payment[];
    };
    plans: Plan[];
    onLogout: () => void;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ studentData, plans, onLogout }) => {
    const { student, payments } = studentData;

    const getPlan = (planId: string | null) => plans.find(p => p.id === planId);
    const studentPlan = getPlan(student.planId);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getStatusInfo = () => {
        if (!studentPlan) return { text: 'Aluno sem plano ativo', Icon: ExclamationCircleIcon, color: 'text-red-600' };

        if (studentPlan.type === 'duration') {
            if (!student.paymentDueDate) return { text: 'Status do plano não definido', Icon: ExclamationCircleIcon, color: 'text-yellow-600' };
            const isExpired = new Date(student.paymentDueDate) < new Date();
            return {
                text: `Seu plano vence em ${formatDate(student.paymentDueDate)}`,
                Icon: isExpired ? ExclamationCircleIcon : CheckCircleIcon,
                color: isExpired ? 'text-red-600' : 'text-green-600'
            };
        }
        if (studentPlan.type === 'session') {
            const remaining = student.remainingSessions;
            if (remaining == null) return { text: "Contagem de aulas não iniciada", Icon: ExclamationCircleIcon, color: 'text-yellow-600' };
            if (remaining < 0) {
                 const plural = Math.abs(remaining) > 1;
                return { text: `Você deve ${Math.abs(remaining)} aula${plural ? 's' : ''} (será deduzido na renovação)`, Icon: ExclamationCircleIcon, color: 'text-red-600' };
            }
            if (remaining === 0) return { text: 'Você não tem mais aulas restantes', Icon: ExclamationCircleIcon, color: 'text-red-600' };
            const plural = remaining > 1;
            return { text: `Você tem ${remaining} aula${plural ? 's' : ''} restante${plural ? 's' : ''}`, Icon: CheckCircleIcon, color: 'text-green-600' };
        }
        return { text: 'Status indisponível', Icon: ExclamationCircleIcon, color: 'text-gray-600' };
    };

    const status = getStatusInfo();
    
    const sessionTypeInfo = {
        regular: { label: 'Aula Normal' },
        extra: { label: 'Aula Extra (Bônus)' },
        absent: { label: 'Falta' },
    };

    return (
        <>
            <div className="bg-brand-dark">
                <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Portal do Aluno</h1>
                    <button onClick={onLogout} className="flex items-center gap-2 text-white hover:text-red-400 transition-colors">
                        <LogoutIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Sair</span>
                    </button>
                </header>
            </div>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="mb-8 p-6 bg-white rounded-lg shadow-md flex flex-col sm:flex-row items-center gap-6">
                    {student.profilePictureUrl ? (
                        <img src={student.profilePictureUrl} alt={student.name} className="w-24 h-24 rounded-full object-cover border-4 border-brand-accent"/>
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-brand-accent">
                            <UserIcon className="w-12 h-12 text-gray-500"/>
                        </div>
                    )}
                    <div className="text-center sm:text-left">
                        <h2 className="text-3xl font-bold text-brand-dark">{student.name}</h2>
                        <p className="text-gray-600">{student.email}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-8">
                        {/* Plan Status Card */}
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-xl font-bold text-brand-dark mb-4 flex items-center gap-2"><BriefcaseIcon className="w-6 h-6"/> Plano Atual</h3>
                            <div className="bg-gray-50 p-4 rounded-md">
                                <p className="font-semibold text-lg">{studentPlan?.name || 'Nenhum plano'}</p>
                                <div className={`flex items-center gap-2 mt-2 font-medium ${status.color}`}>
                                    <status.Icon className="w-5 h-5" />
                                    <span>{status.text}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment History Card */}
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-xl font-bold text-brand-dark mb-4 flex items-center gap-2"><DollarSignIcon className="w-6 h-6"/> Histórico de Pagamentos</h3>
                            <div className="max-h-80 overflow-y-auto">
                                {payments.length > 0 ? (
                                    <ul className="divide-y divide-gray-200">
                                        {payments.map(payment => (
                                            <li key={payment.id} className="py-3">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium">{payment.planName}</p>
                                                        <p className="text-sm text-gray-500">{formatDate(payment.paymentDate)} - {payment.paymentMethod}</p>
                                                    </div>
                                                    <p className="font-semibold text-green-600">R$ {payment.amount.toFixed(2)}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-center text-gray-500 py-4">Nenhum pagamento registrado.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Column */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                         <h3 className="text-xl font-bold text-brand-dark mb-4 flex items-center gap-2"><CalendarIcon className="w-6 h-6"/> Histórico de Aulas</h3>
                         <div className="max-h-[34rem] overflow-y-auto">
                            {student.sessions.length > 0 ? (
                                <ul className="space-y-3">
                                    {student.sessions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(session => (
                                        <li key={session.id} className="p-3 bg-gray-50 rounded-md flex items-center gap-3">
                                            <CalendarIcon className="w-5 h-5 text-brand-primary"/>
                                            <div>
                                                <p className="font-medium">{new Date(session.date).toLocaleString('pt-BR', {dateStyle: 'long', timeStyle: 'short'})}</p>
                                                <p className="text-sm text-gray-600">{sessionTypeInfo[session.type]?.label || 'Aula'}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-gray-500 py-4">Nenhuma aula registrada ainda.</p>
                            )}
                         </div>
                    </div>
                </div>
            </main>
        </>
    );
};

export default StudentPortal;
