/**
 * NOTE: This email service is designed to be run in a secure, server-side environment
 * like a Firebase Cloud Function. Running this code directly on the client-side
 * will expose your Brevo API key, which is a significant security risk.
 *
 * For development purposes, this will work, but for a production application,
 * you MUST move this logic to a backend service.
 */

interface EmailRecipient {
    email: string;
    name?: string;
}

export interface EmailParams {
    apiKey: string;
    sender: EmailRecipient;
    to: EmailRecipient[];
    replyTo: EmailRecipient;
    subject: string;
    htmlContent: string;
}

export const sendEmail = async (params: EmailParams): Promise<{ success: boolean; error?: string }> => {
    const { apiKey, sender, to, replyTo, subject, htmlContent } = params;

    const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

    if (!apiKey) {
        return { success: false, error: "Brevo API Key is missing." };
    }

    try {
        const response = await fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender,
                to,
                replyTo,
                subject,
                htmlContent,
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Brevo API Error:', errorData);
            throw new Error(errorData.message || 'Failed to send email via Brevo API');
        }

        return { success: true };

    } catch (error) {
        console.error('Error in sendEmail service:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
};
