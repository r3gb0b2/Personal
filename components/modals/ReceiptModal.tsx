import React from 'react';
import { Payment, Student } from '../../types';
import Modal from './Modal';
import { PrintIcon } from '../icons';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  student: Student | null;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, payment, student }) => {

  const handlePrint = () => {
    const printContents = document.getElementById('receipt-content')?.innerHTML;
    const originalContents = document.body.innerHTML;
    if (printContents) {
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      // We reload to make sure all scripts and event listeners are back
      window.location.reload(); 
    }
  };

  const receiptContent = (
    <div className="space-y-6">
        <div id="receipt-content" className="p-4 border rounded-lg bg-white text-black">
            <h2 className="text-2xl font-bold text-center mb-4">Comprovante de Pagamento</h2>
            <div className="space-y-2">
                <p><strong>Recebido de:</strong> {payment.studentName}</p>
                {student && <p><strong>Email:</strong> {student.email}</p>}
                <hr className="my-2"/>
                <p><strong>Data do Pagamento:</strong> {new Date(payment.paymentDate).toLocaleDateString('pt-BR')}</p>
                <p><strong>Forma de Pagamento:</strong> {payment.paymentMethod}</p>
                <hr className="my-2"/>
                <p><strong>Serviço:</strong> Plano - {payment.planName}</p>
                <div className="text-right mt-4">
                    <p className="text-xl font-bold">TOTAL: R$ {payment.amount.toFixed(2)}</p>
                </div>
                <p className="text-xs text-center text-gray-500 mt-6">
                    Comprovante gerado pelo sistema Dashboard do Personal.
                </p>
            </div>
        </div>
        <div className="flex justify-end">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">
                <PrintIcon className="w-5 h-5"/> Imprimir
            </button>
        </div>
    </div>
  );

  return (
    <Modal title="Comprovante" isOpen={isOpen} onClose={onClose} size="md">
        {receiptContent}
    </Modal>
  );
};

export default ReceiptModal;