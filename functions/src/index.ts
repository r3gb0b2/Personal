// Fix: Use namespace import for firebase-functions to ensure correct type inference for request, response, config, and logger.
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";

admin.initializeApp();

const corsHandler = cors({origin: true});

export const sendEmail = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    // 1. Get API Key and Global Sender from secure environment configuration
    const apiKey = functions.config().brevo?.key;
    const globalSenderEmail = functions.config().brevo?.sender;

    if (!apiKey || !globalSenderEmail) {
      functions.logger.error(
          "Brevo API key or sender email is not configured in Firebase.",
      );
      response.status(500).json({
        error: "A configuração de e-mail do servidor está incompleta.",
      });
      return;
    }

    const {trainerId, recipients, subject, htmlContent} = request.body;
    if (!trainerId || !recipients || !subject || !htmlContent) {
      response.status(400).json({error: "Dados incompletos na requisição."});
      return;
    }

    try {
      // 2. Fetch trainer's data for name and contact email for Reply-To
      const trainerRef = admin.firestore().collection("trainers").doc(trainerId);
      const trainerSnap = await trainerRef.get();

      if (!trainerSnap.exists) {
        response.status(404).json({error: "Personal não encontrado."});
        return;
      }
      const trainerData = trainerSnap.data() || {};
      const trainerName = trainerData.fullName ||
        trainerData.username ||
        "Personal Trainer";

      // The email will be sent FROM the global sender
      const sender = {
        email: globalSenderEmail,
        name: trainerName,
      };

      // Replies will go TO the trainer's contact email, or global if not set
      const replyTo = {
        email: trainerData.contactEmail || globalSenderEmail,
        name: trainerName,
      };

      // 3. Mount and send the request to the Brevo API
      const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender,
          to: recipients,
          replyTo,
          subject,
          htmlContent,
        }),
      });

      if (!brevoResponse.ok) {
        const errorData = await brevoResponse.json();
        functions.logger.error("Brevo API Error:", errorData);
        throw new Error(`Falha no envio via Brevo: ${JSON.stringify(errorData)}`);
      }

      // 4. Return success
      response.status(200).json({success: true});
    } catch (error) {
      functions.logger.error("Error in sendEmail function:", error);
      const message = error instanceof Error ?
        error.message : "Ocorreu um erro interno.";
      response.status(500).json({error: message});
    }
  });
});
