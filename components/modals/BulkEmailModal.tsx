import React, { useState } from 'react';
import { Student, Trainer, TrainerSettings } from '../../types';
import Modal from './Modal';
import { sendEmail, EmailParams } from '../../../services/emailService';
import { MailIcon } from '../icons';

interface BulkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  trainer: Trainer;
  trainerSettings: TrainerSettings;
}

const BulkEmailModal: React.FC<BulkEmailModalProps> = ({ isOpen, onClose, students, trainer, trainerSettings }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      alert("Assunto e mensagem são obrigatórios.");
      return;
    }

    if (!trainerSettings?.brevoApiKey || !trainerSettings?.senderEmail || !trainerSettings?.replyToEmail) {
        setErrorMessage("As configurações de e-mail (API Key, Remetente, Resposta) não foram encontradas. Por favor, configure-as em 'Meu Perfil'.");
        setStatus('error');
        return;
    }
    
    setStatus('sending');
    setErrorMessage('');

    const recipients = students.filter(s => s.email).map(s => ({ email: s.email, name: s.name }));

    if (recipients.length === 0) {
        setErrorMessage("Nenhum aluno com e-mail cadastrado para enviar.");
        setStatus('error');
        return;
    }

    try {
        const emailParams: EmailParams = {
            apiKey: trainerSettings.brevoApiKey,
            to: recipients,
            sender: { email: trainerSettings.senderEmail, name: trainer.fullName || trainer.username },
            replyTo: { email: trainerSettings.replyToEmail, name: trainer.fullName || trainer.username },
            subject,
            htmlContent: `<p>${message.replace(/\n/g, '<br>')}</p><p>Qualquer dúvida, é só responder a este e-mail.</p><p>Abraços,<br/>${trainer.fullName || trainer.username}</p>`,
        };

        const result = await sendEmail(emailParams);

        if (result.success) {
            setStatus('success');
            setTimeout(() => {
                onClose();
                setStatus('idle');
            }, 2000);
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error("Failed to send bulk email:", error);
        setErrorMessage(error instanceof Error ? error.message : "Ocorreu um erro desconhecido.");
        setStatus('error');
    }
  };

  return (
    <Modal title="Enviar E-mail para Todos os Alunos" isOpen={isOpen} onClose={onClose}>
      {status === 'success' ? (
        <div className="text-center p-8">
            <h3 className="text-2xl font-bold text-green-600">E-mails enviados com sucesso!</h3>
        </div>
      ) : (
        <form onSubmit={handleSend} className="space-y-4">
            <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Assunto</label>
            <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                required
            />
            </div>
            <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">Mensagem</label>
            <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                required
            />
            <p className="text-xs text-gray-500 mt-1">A sua assinatura será adicionada automaticamente.</p>
            </div>

            {status === 'error' && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{errorMessage}</p>
            )}

            <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} disabled={status === 'sending'} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                Cancelar
            </button>
            <button type="submit" disabled={status === 'sending'} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent disabled:bg-gray-400">
                <MailIcon className="w-5 h-5"/>
                {status === 'sending' ? 'Enviando...' : `Enviar para ${students.length} Aluno(s)`}
            </button>
            </div>
        </form>
      )}
    </Modal>
  );
};

export default BulkEmailModal;
