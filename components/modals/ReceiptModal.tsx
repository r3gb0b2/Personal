import React, { useState, useRef } from 'react';
import { Payment, Student } from '../../types';
import Modal from './Modal';
import { PrintIcon, DownloadIcon } from '../icons';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  student: Student | null;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, payment, student }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePrint = () => {
    const printContents = receiptRef.current?.innerHTML;
    if (printContents) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); 
    }
  };

  const handleDownloadPdf = async () => {
    const element = receiptRef.current;
    if (!element) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(element, {
          scale: 2, // Higher scale for better quality
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: [canvas.width, canvas.height] // Set pdf size to canvas size
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = `comprovante_${payment.studentName.replace(/\s+/g, '_')}_${new Date(payment.paymentDate).toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF.");
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <Modal title="Comprovante" isOpen={isOpen} onClose={onClose} size="md">
      <div className="space-y-6">
          {/* This div is the source for both printing and PDF generation */}
          <div ref={receiptRef}>
            <div id="receipt-content" className="p-6 border rounded-lg bg-white text-black">
                <h2 className="text-2xl font-bold text-center mb-6 text-brand-dark">Comprovante de Pagamento</h2>
                <div className="space-y-3">
                    <p><strong>Recebido de:</strong> {payment.studentName}</p>
                    {student?.email && <p><strong>Email:</strong> {student.email}</p>}
                    <div className="border-t my-4"></div>
                    <p><strong>Data do Pagamento:</strong> {new Date(payment.paymentDate).toLocaleDateString('pt-BR')}</p>
                    <p><strong>Forma de Pagamento:</strong> {payment.paymentMethod}</p>
                     <div className="border-t my-4"></div>
                    <p><strong>Serviço:</strong> Plano - {payment.planName}</p>
                    <div className="text-right mt-6 bg-gray-100 p-4 rounded-md">
                        <p className="text-xl font-bold text-brand-dark">TOTAL: R$ {payment.amount.toFixed(2)}</p>
                    </div>
                    <p className="text-xs text-center text-gray-500 pt-8">
                        Comprovante gerado pelo sistema Dashboard do Personal.
                    </p>
                </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
              <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                  <PrintIcon className="w-5 h-5"/> Imprimir
              </button>
              <button 
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent disabled:bg-gray-400"
              >
                  <DownloadIcon className="w-5 h-5"/> 
                  {isDownloading ? 'Baixando...' : 'Baixar PDF'}
              </button>
          </div>
      </div>
    </Modal>
  );
};

export default ReceiptModal;