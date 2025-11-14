import React, { useState, useMemo } from 'react';
import { Student, Trainer, TrainerSettings } from '../../types';
import Modal from './Modal';
import { sendEmail, EmailPayload } from '../../services/emailService';
import { MailIcon, ExclamationCircleIcon } from '../icons';

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

  const isEmailConfigured = useMemo(() => 
    !!(trainerSettings.brevoApiKey && trainerSettings.senderEmail && trainerSettings.replyToEmail),
    [trainerSettings]
  );

  const recipients = useMemo(() => students.filter(s => s.email).map(s => ({ email: s.email, name: s.name })), [students]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      alert("Assunto e mensagem são obrigatórios.");
      return;
    }

    if (!isEmailConfigured) {
        setErrorMessage("As configurações de e-mail (API Key, Remetente, Resposta) não foram encontradas. Por favor, configure-as em 'Meu Perfil'.");
        setStatus('error');
        return;
    }
    
    setStatus('sending');
    setErrorMessage('');

    if (recipients.length === 0) {
        setErrorMessage("Nenhum aluno com e-mail cadastrado para enviar.");
        setStatus('error');
        return;
    }

    try {
        const htmlContent = `<p>${message.replace(/\n/g, '<br>')}</p><p>Qualquer dúvida, é só responder a este e-mail.</p><p>Abraços,<br/>${trainer.fullName || trainer.username}</p>`;

        const payload: EmailPayload = {
            trainerId: trainer.id,
            recipients,
            subject,
            htmlContent,
        };

        const result = await sendEmail(payload);

        if (result.success) {
            setStatus('success');
            setTimeout(() => {
                onClose();
                // Reset state for next time
                setSubject('');
                setMessage('');
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

  const renderContent = () => {
    if (!isEmailConfigured) {
        return (
            <div className="text-center p-4">
                <ExclamationCircleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-brand-dark mb-2">Configuração Necessária</h3>
                <p className="text-gray-600">
                    Para enviar e-mails em massa, primeiro você precisa configurar sua chave da API da Brevo e seus e-mails de remetente/resposta na tela <strong>"Meu Perfil"</strong>.
                </p>
                <div className="mt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent">
                        Entendi, fechar
                    </button>
                </div>
            </div>
        )
    }

    if (status === 'success') {
        return (
            <div className="text-center p-8">
                <h3 className="text-2xl font-bold text-green-600">E-mails enviados com sucesso!</h3>
            </div>
        );
    }
    
    return (
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
            <button type="submit" disabled={status === 'sending' || recipients.length === 0} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-accent disabled:bg-gray-400">
                <MailIcon className="w-5 h-5"/>
                {status === 'sending' ? 'Enviando...' : `Enviar para ${recipients.length} Aluno(s)`}
            </button>
            </div>
        </form>
    )
  }

  return (
    <Modal title="Enviar E-mail para Todos os Alunos" isOpen={isOpen} onClose={onClose}>
        {renderContent()}
    </Modal>
  );
};

export default BulkEmailModal;