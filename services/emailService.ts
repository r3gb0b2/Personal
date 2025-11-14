import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Trainer } from '../types';

interface EmailRecipient {
    email: string;
    name?: string;
}

export interface EmailPayload {
    recipients: EmailRecipient[];
    subject: string;
    htmlContent: string;
    trainer: Trainer;
}

interface BrevoConfig {
    apiKey: string;
    senderEmail: string;
}

/**
 * Busca a configuração segura da API da Brevo no Firestore.
 * @returns A configuração da API ou null se não encontrada.
 */
const getBrevoConfig = async (): Promise<BrevoConfig | null> => {
    try {
        const configRef = doc(db, 'settings', 'brevoConfig');
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
            return configSnap.data() as BrevoConfig;
        }
        console.error("Documento de configuração da Brevo ('settings/brevoConfig') não encontrado no Firestore.");
        return null;
    } catch (error) {
        console.error("Erro ao buscar configuração da Brevo:", error);
        return null;
    }
};


/**
 * Envia um e-mail diretamente para a API da Brevo usando a configuração global.
 * @param payload Os dados do e-mail a serem enviados.
 * @returns Um objeto indicando sucesso ou falha.
 */
export const sendEmail = async (payload: EmailPayload): Promise<{ success: boolean; error?: string }> => {
    const config = await getBrevoConfig();

    if (!config || !config.apiKey || !config.senderEmail) {
        const errorMessage = "A configuração de e-mail (API Key/Remetente) não foi encontrada no painel de admin. Por favor, configure-a.";
        return { success: false, error: errorMessage };
    }

    const { recipients, subject, htmlContent, trainer } = payload;
    
    const sender = {
        email: config.senderEmail,
        name: trainer.fullName || trainer.username || "Personal Trainer",
    };

    const replyTo = {
        email: trainer.contactEmail || config.senderEmail,
        name: trainer.fullName || trainer.username,
    };

    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': config.apiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender,
                to: recipients,
                replyTo,
                subject,
                htmlContent,
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Brevo API Error:", errorData);
            throw new Error(errorData.message || `A API da Brevo retornou um erro: ${response.status}`);
        }

        return { success: true };

    } catch (error) {
        console.error('Erro ao enviar e-mail via Brevo:', error);
        return { success: false, error: error instanceof Error ? error.message : "Erro de comunicação com a API de e-mail." };
    }
};
