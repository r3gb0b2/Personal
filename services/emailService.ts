
import { db } from '../firebase';
// FIX: Changed firebase import path to use the scoped package '@firebase/firestore' to maintain consistency with the fix in `firebase.ts` and resolve potential module loading issues.
import { doc, getDoc } from '@firebase/firestore';
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
 * Creates a branded, responsive HTML email template.
 * @param title The main heading of the email.
 * @param bodyContent The main paragraph content of the email. Can contain HTML.
 * @param trainer The trainer's data for personalization.
 * @returns A full HTML string for the email body.
 */
export const generateEmailTemplate = (title: string, bodyContent: string, trainer: Trainer): string => {
    const trainerName = trainer.fullName || trainer.username;
    const footerLinks = [];
    if (trainer.whatsapp) {
        footerLinks.push(`<a href="https://wa.me/${trainer.whatsapp}" style="color: #4c9aff; text-decoration: none; margin: 0 10px;">WhatsApp</a>`);
    }
    if (trainer.instagram) {
        footerLinks.push(`<a href="https://instagram.com/${trainer.instagram}" style="color: #4c9aff; text-decoration: none; margin: 0 10px;">Instagram</a>`);
    }

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #dfe1e6; border-radius: 8px; overflow: hidden; }
            .header { background-color: #091e42; color: #ffffff; padding: 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .body-content { padding: 32px; color: #172b4d; line-height: 1.6; }
            .body-content p { margin: 0 0 16px; }
            .footer { background-color: #f4f5f7; padding: 24px; text-align: center; font-size: 12px; color: #505f79; }
            .footer a { color: #0052cc; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${trainerName}</h1>
            </div>
            <div class="body-content">
                <h2>${title}</h2>
                ${bodyContent}
            </div>
            <div class="footer">
                <p>Esta é uma mensagem automática. Para dúvidas, responda a este e-mail.</p>
                ${footerLinks.length > 0 ? `<p>${footerLinks.join(' &bull; ')}</p>` : ''}
            </div>
        </div>
    </body>
    </html>
    `;
};


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
