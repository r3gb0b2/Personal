
import React, { useState } from 'react';
import { PaymentMethod } from '../../types';
import Modal from './Modal';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => void;
  studentName: string;
  planName: string;
  planPrice: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onConfirm, studentName, planName, planPrice }) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Pix');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(paymentMethod);
  };

  return (
    <Modal title="Registrar Pagamento" isOpen={isOpen} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <p><strong>Aluno:</strong> {studentName}</p>
            <p><strong>Plano:</strong> {planName}</p>
            <p className="text-2xl font-bold mt-2">Valor: R$ {planPrice.toFixed(2)}</p>
        </div>
        <div>
          <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">Forma de Pagamento</label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
          >
            <option>Pix</option>
            <option>Dinheiro</option>
            <option>Cartão de Crédito</option>
            <option>Transferência</option>
          </select>
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Confirmar Pagamento</button>
        </div>
      </form>
    </Modal>
  );
};

export default PaymentModal;
