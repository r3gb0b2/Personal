import { CLOUD_FUNCTION_URL } from '../constants';

interface EmailRecipient {
    email: string;
    name?: string;
}

export interface EmailPayload {
    trainerId: string;
    recipients: EmailRecipient[];
    subject: string;
    htmlContent: string;
}

/**
 * Envia um payload de e-mail para uma Firebase Cloud Function que, por sua vez,
 * processará o envio através de um serviço como a Brevo.
 * @param payload Os dados do e-mail a serem enviados.
 * @returns Um objeto indicando sucesso ou falha.
 */
export const sendEmail = async (payload: EmailPayload): Promise<{ success: boolean; error?: string }> => {
    // Verifica se a URL da função foi configurada pelo usuário.
    if (CLOUD_FUNCTION_URL.includes('your-project-id') || !CLOUD_FUNCTION_URL) {
        const errorMessage = "A URL da Cloud Function não foi configurada. Siga as instruções em cloud_functions_setup.md e atualize a constante CLOUD_FUNCTION_URL em constants.ts";
        console.error(errorMessage);
        return { success: false, error: errorMessage };
    }
    
    try {
        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            // Se a função retornar um erro (ex: 4xx, 5xx), ele será capturado aqui.
            throw new Error(result.error || `A Cloud Function retornou um status de erro: ${response.status}`);
        }

        return { success: true };

    } catch (error) {
        console.error('Error calling sendEmail Cloud Function:', error);
        return { success: false, error: error instanceof Error ? error.message : "Erro de comunicação com a Cloud Function." };
    }
};