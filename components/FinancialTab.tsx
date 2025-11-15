import React, { useState, useMemo } from 'react';
import { Student, Payment, Plan, Invoice, InvoiceStatus } from '../types';
import { DollarSignIcon } from './icons';

interface FinancialTabProps {
  student: Student;
  payments: Payment[];
  plans: Plan[];
}

const KpiCard: React.FC<{ title: string, value: string, colorClass: string }> = ({ title, value, colorClass }) => (
    <div className={`p-4 rounded-lg shadow-sm border-l-4 ${colorClass}`}>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
);

const FinancialTab: React.FC<FinancialTabProps> = ({ student, payments, plans }) => {
  type Period = 'this_month' | 'last_3_months' | 'this_year' | 'all';
  const [period, setPeriod] = useState<Period>('this_month');

  const allInvoices = useMemo((): Invoice[] => {
    const invoices: Invoice[] = [];
    
    payments.forEach(p => {
      invoices.push({
        id: p.id,
        description: `Pagamento - ${p.planName}`,
        amount: p.amount,
        dueDate: p.paymentDate,
        paidDate: p.paymentDate,
        status: 'Paga',
      });
    });

    const studentPlan = plans.find(p => p.id === student.planId);
    if (studentPlan && studentPlan.type === 'duration' && student.paymentDueDate) {
      const dueDate = new Date(student.paymentDueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const status: InvoiceStatus = dueDate < today ? 'Vencida' : 'Em Aberto';
      invoices.push({
        id: `pending-${student.id}`,
        description: `Mensalidade - ${studentPlan.name}`,
        amount: studentPlan.price,
        dueDate: student.paymentDueDate,
        paidDate: null,
        status: status,
      });
    }

    return invoices.sort((a, b) => {
      const timeA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const timeB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return timeB - timeA;
    });
  }, [student, payments, plans]);

  const filteredInvoices = useMemo(() => {
    const now = new Date();
    if (period === 'all') return allInvoices;

    const getStartDate = () => {
      const startDate = new Date(now);
      switch (period) {
        case 'this_month':
          startDate.setDate(1);
          break;
        case 'last_3_months':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'this_year':
          startDate.setMonth(0);
          startDate.setDate(1);
          break;
      }
      startDate.setHours(0, 0, 0, 0);
      return startDate;
    };
    const periodStart = getStartDate();

    return allInvoices.filter(invoice => {
      const dateToCompare = new Date(invoice.paidDate || invoice.dueDate);
      return dateToCompare >= periodStart;
    });
  }, [allInvoices, period]);

  const kpis = useMemo(() => {
    const now = new Date();
    const recebimentoNoPeriodo = filteredInvoices
      .filter(inv => inv.status === 'Paga')
      .reduce((sum, inv) => sum + inv.amount, 0);

    const emAbertoNoPeriodo = filteredInvoices
      .filter(inv => inv.status === 'Em Aberto' || inv.status === 'Vencida')
      .reduce((sum, inv) => sum + inv.amount, 0);

    const recebidosNoAno = allInvoices
      .filter(inv => inv.status === 'Paga' && inv.paidDate && new Date(inv.paidDate).getFullYear() === now.getFullYear())
      .reduce((sum, inv) => sum + inv.amount, 0);

    const totalVencido = allInvoices
      .filter(inv => inv.status === 'Vencida')
      .reduce((sum, inv) => sum + inv.amount, 0);

    return { recebimentoNoPeriodo, emAbertoNoPeriodo, recebidosNoAno, totalVencido };
  }, [filteredInvoices, allInvoices]);

  const paidInvoices = filteredInvoices.filter(inv => inv.status === 'Paga');
  const openOrOverdueInvoices = filteredInvoices.filter(inv => inv.status !== 'Paga');

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const statusColors: { [key in InvoiceStatus]: string } = {
    'Paga': 'bg-green-100 text-green-800',
    'Em Aberto': 'bg-blue-100 text-blue-800',
    'Vencida': 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto p-1">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg flex items-center gap-2"><DollarSignIcon className="w-6 h-6"/> Painel Financeiro</h3>
        <div>
          <label htmlFor="period-filter" className="text-sm font-medium text-gray-700 mr-2">Filtrar por:</label>
          <select
            id="period-filter"
