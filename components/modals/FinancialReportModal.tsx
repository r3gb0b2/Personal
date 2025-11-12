
import React, { useState, useMemo } from 'react';
import { Payment } from '../../types';
import Modal from './Modal';

interface FinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  payments: Payment[];
}

type FilterPeriod = 'all' | 'this_month' | 'last_month' | 'this_year';

const FinancialReportModal: React.FC<FinancialReportModalProps> = ({ isOpen, onClose, payments }) => {
  const [filter, setFilter] = useState<FilterPeriod>('this_month');

  const filteredPayments = useMemo(() => {
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const firstDayThisYear = new Date(now.getFullYear(), 0, 1);

    switch (filter) {
      case 'this_month':
        return payments.filter(p => new Date(p.paymentDate) >= firstDayThisMonth);
      case 'last_month':
        return payments.filter(p => {
            const paymentDate = new Date(p.paymentDate);
            return paymentDate >= firstDayLastMonth && paymentDate <= lastDayLastMonth;
        });
      case 'this_year':
          return payments.filter(p => new Date(p.paymentDate) >= firstDayThisYear);
      case 'all':
      default:
        return payments;
    }
  }, [payments, filter]);
  
  const totalRevenue = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [filteredPayments]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR');

  return (
    <Modal title="Relatório Financeiro" isOpen={isOpen} onClose={onClose} size="xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
                <label htmlFor="period-filter" className="text-sm font-medium text-gray-700 mr-2">Filtrar período:</label>
                <select id="period-filter" value={filter} onChange={e => setFilter(e.target.value as FilterPeriod)} className="border-gray-300 rounded-md shadow-sm">
                    <option value="this_month">Este Mês</option>
                    <option value="last_month">Mês Passado</option>
                    <option value="this_year">Este Ano</option>
                    <option value="all">Tudo</option>
                </select>
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
                </tr>
              )) : (
                <tr>
                    <td colSpan={5} className="text-center p-8 text-gray-500">Nenhum pagamento registrado neste período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

export default FinancialReportModal;
