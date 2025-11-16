import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Payment, Student, Plan } from '../../types';
import { PrintIcon, TrashIcon, ExclamationCircleIcon } from '../icons';
import ReceiptModal from './ReceiptModal';
import * as ChartJS from 'chart.js';

interface FinancialReportProps {
  onBack: () => void;
  payments: Payment[];
  students: Student[];
  onDeletePayment: (paymentId: string) => Promise<void>;
  plans: Plan[]; // Added plans to calculate MRR
}

type FilterPeriod = 'all' | 'this_month' | 'last_month' | 'this_year';

const BarChart: React.FC<{ labels: string[], data: number[], title: string }> = ({ labels, data, title }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any | null>(null);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                chartInstance.current = new ChartJS.Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: title,
                            data: data,
                            backgroundColor: 'rgba(0, 82, 204, 0.6)',
                            borderColor: 'rgba(0, 82, 204, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { display: false },
                            title: { display: true, text: title, font: { size: 16 } }
                        },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            }
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [labels, data, title]);

    return <canvas ref={chartRef}></canvas>;
};


const FinancialReportView: React.FC<FinancialReportProps> = ({ onBack, payments, students, onDeletePayment, plans }) => {
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>('this_month');
  const [studentFilter, setStudentFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const monthlyRevenueData = useMemo(() => {
    const months: string[] = [];
    const revenues: number[] = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString('pt-BR', { month: 'short' });
        const year = d.getFullYear().toString().slice(-2);
        months.push(`${monthName}/${year}`);
        
        const firstDay = d;
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        
        const monthRevenue = payments
            .filter(p => {
                const pDate = new Date(p.paymentDate);
                return pDate >= firstDay && pDate <= lastDay;
            })
            .reduce((sum, p) => sum + p.amount, 0);
            
        revenues.push(monthRevenue);
    }
    return { labels: months, data: revenues };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    let result = [...payments];
    const now = new Date();

    if (periodFilter !== 'all') {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1);

      result = result.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        if (periodFilter === 'this_month') return paymentDate >= firstDayOfMonth;
        if (periodFilter === 'last_month') return paymentDate >= firstDayOfLastMonth && paymentDate < firstDayOfMonth;
        if (periodFilter === 'this_year') return paymentDate >= firstDayOfYear;
        return true;
      });
    }

    if (studentFilter !== 'all') {
      result = result.filter(p => p.studentId === studentFilter);
    }

    return result;
  }, [payments, periodFilter, studentFilter]);

  const totalRevenue = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  const handlePrintReceipt = (payment: Payment) => {
    setSelectedPayment(payment);
  };
  
  const selectedStudentForReceipt = useMemo(() => {
      if (!selectedPayment) return null;
      return students.find(s => s.id === selectedPayment.studentId) || null;
  }, [selectedPayment, students]);
  
  const mrr = useMemo(() => {
    return students
      .filter(s => {
        const plan = s.planId ? plans.find(p => p.id === s.planId) : null;
        return plan && plan.type === 'duration' && s.paymentDueDate && new Date(s.paymentDueDate) > new Date();
      })
      .reduce((sum, s) => {
        const plan = plans.find(p => p.id === s.planId)!;
        const monthlyValue = (plan.price / (plan.durationInDays || 30)) * 30;
        return sum + monthlyValue;
      }, 0);
  }, [students, plans]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-brand-dark">Controle Financeiro</h2>
            <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Voltar</button>
        </div>
        
        <div className="mb-6 p-4 bg-gray-50 border rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg shadow-sm">
                <BarChart labels={monthlyRevenueData.labels} data={monthlyRevenueData.data} title="Receita nos Últimos 12 Meses" />
            </div>
             <div className="p-4 bg-white rounded-lg shadow-sm flex flex-col justify-center">
                <h3 className="text-lg font-bold text-brand-dark mb-4">Métricas Chave</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                        <span className="text-gray-600">Receita Mensal Recorrente (MRR):</span>
                        <span className="font-bold text-xl text-green-600">R$ {mrr.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500">Estimativa com base em planos de duração ativos. Não inclui pacotes de aula.</p>
                     <div className="flex justify-between items-baseline pt-2 border-t">
                        <span className="text-gray-600">Total Recebido no Período:</span>
                        <span className="font-bold text-xl text-brand-dark">R$ {totalRevenue.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>


      <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Histórico de Lançamentos</h3>
        <div className="flex gap-4">
          <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value as FilterPeriod)} className="border-gray-300 rounded-md shadow-sm">
            <option value="this_month">Este Mês</option>
            <option value="last_month">Mês Passado</option>
            <option value="this_year">Este Ano</option>
            <option value="all">Todos</option>
          </select>
          <select value={studentFilter} onChange={e => setStudentFilter(e.target.value)} className="border-gray-300 rounded-md shadow-sm">
            <option value="all">Todos os Alunos</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div className="border rounded-lg max-h-96 overflow-y-auto">
        {filteredPayments.length > 0 ? (
          <table className="w-full text-left">
            <thead className="bg-brand-light">
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
              {filteredPayments.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{new Date(p.paymentDate).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">{p.studentName}</td>
                  <td className="p-3">{p.planName}</td>
                  <td className="p-3">{p.paymentMethod}</td>
                  <td className="p-3 text-right font-medium">R$ {p.amount.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-4">
                        <button onClick={() => handlePrintReceipt(p)} className="text-gray-500 hover:text-brand-primary" title="Gerar Comprovante">
                            <PrintIcon className="w-5 h-5" />
                        </button>
                         <button onClick={() => onDeletePayment(p.id)} className="text-gray-500 hover:text-red-600" title="Excluir Lançamento">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center p-8 text-gray-500">
             <ExclamationCircleIcon className="w-12 h-12 mx-auto text-gray-300 mb-2"/>
            Nenhum lançamento financeiro encontrado para os filtros selecionados.
          </div>
        )}
      </div>

       {selectedPayment && (
        <ReceiptModal
          isOpen={!!selectedPayment}
          onClose={() => setSelectedPayment(null)}
          payment={selectedPayment}
          student={selectedStudentForReceipt}
        />
      )}
    </div>
  );
};

export default FinancialReportView;