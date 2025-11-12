import React, { useState, useMemo } from 'react';
import { Payment, Student } from '../../types';
import Modal from './Modal';
import { PrintIcon, TrashIcon } from '../icons';
import ReceiptModal from './ReceiptModal';

interface FinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  payments: Payment[];
  students: Student[];
  onDeletePayment: (paymentId: string) => Promise<void>;
}

type FilterPeriod = 'all' | 'this_month' | 'last_month' | 'this_year';

const FinancialReportModal: React.FC<FinancialReportModalProps> = ({ isOpen, onClose, payments, students, onDeletePayment }) => {
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>('this_month');
  const [studentFilter, setStudentFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const filteredPayments = useMemo(() => {
    const now = new Date();
    
    let tempPayments = [...payments];

    // Filter by student first
    if (studentFilter !== 'all') {
        tempPayments = tempPayments.filter(p => p.studentId === studentFilter);
    }
    
    // Then filter by period
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const firstDayThisYear = new Date(now.getFullYear(), 0, 1);

    switch (periodFilter) {
      case 'this_month':
        return tempPayments.filter(p => new Date(p.paymentDate) >= firstDayThisMonth);
      case 'last_month':
        return tempPayments.filter(p => {
            const paymentDate = new Date(p.paymentDate);
            return paymentDate >= firstDayLastMonth && paymentDate <= lastDayLastMonth;
        });
      case 'this_year':
          return tempPayments.filter(p => new Date(p.paymentDate) >= firstDayThisYear);
      case 'all':
      default:
        return tempPayments;
    }
  }, [payments, periodFilter, studentFilter]);
  
  const totalRevenue = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [filteredPayments]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR');

  const studentMap = useMemo(() => {
    return new Map(students.map(s => [s.id, s]));
  }, [students]);

  return (
    <>
        <Modal title="Relatório Financeiro" isOpen={isOpen} onClose={onClose} size="xl">
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <label htmlFor="period-filter" className="text-sm font-medium text-gray-700 mr-2">Período:</label>
                        <select id="period-filter" value={periodFilter} onChange={e => setPeriodFilter(e.target.value as FilterPeriod)} className="border-gray-300 rounded-md shadow-sm">
                            <option value="this_month">Este Mês</option>
                            <option value="last_month">Mês Passado</option>
                            <option value="this_year">Este Ano</option>
                            <option value="all">Tudo</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="student-filter" className="text-sm font-medium text-gray-700 mr-2">Aluno:</label>
                        <select id="student-filter" value={studentFilter} onChange={e => setStudentFilter(e.target.value)} className="border-gray-300 rounded-md shadow-sm">
                            <option value="all">Todos os Alunos</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-gray-600">Total Arrecadado no Período</p>
                    <p className="text-2xl font-bold text-green-600">R$ {totalRevenue.toFixed(2)}</p>
                </div>
            </div>
            <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left">
                <thead className="bg-brand-light sticky top-0">
                <tr>
                    <th className="p-3 font-semibold">Data</th>
                    <th className="p-3 font-semibold">Aluno</th>
                    <th className="p-3 font-semibold">Plano</th>
                    <th className="p-3 font-semibold">Método</th>
                    <th className="p-3 font-semibold text-right">Valor</th>
                    <th className="p-3 font-semibold text-center">Ações</th>
                </tr>
                </thead>
                <tbody>
                {filteredPayments.length > 0 ? filteredPayments.map(payment => (
                    <tr key={payment.id} className="border-t">
                    <td className="p-3">{formatDate(payment.paymentDate)}</td>
                    <td className="p-3">{payment.studentName}</td>
                    <td className="p-3 text-gray-600">{payment.planName}</td>
                    <td className="p-3 text-gray-600">{payment.paymentMethod}</td>
                    <td className="p-3 text-right font-medium">R$ {payment.amount.toFixed(2)}</td>
                    <td className="p-3 text-center">
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setSelectedPayment(payment)} className="text-gray-500 hover:text-brand-primary" title="Ver Comprovante">
                                <PrintIcon className="w-5 h-5"/>
                            </button>
                            <button onClick={() => onDeletePayment(payment.id)} className="text-gray-500 hover:text-red-600" title="Excluir Lançamento">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </td>
                    </tr>
                )) : (
                    <tr>
                        <td colSpan={6} className="text-center p-8 text-gray-500">Nenhum pagamento registrado neste período.</td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        </div>
        </Modal>
        {selectedPayment && (
            <ReceiptModal 
                isOpen={!!selectedPayment}
                onClose={() => setSelectedPayment(null)}
                payment={selectedPayment}
                student={studentMap.get(selectedPayment.studentId) ?? null}
            />
        )}
    </>
  );
};

export default FinancialReportModal;