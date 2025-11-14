import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import cors from "cors";

admin.initializeApp();
const db = admin.firestore();

// Configura o CORS para permitir requisições da origem do seu app
const corsHandler = cors({origin: true});

// Define a função de nuvem
export const sendEmail = functions.https.onRequest((request, response) => {
  // Envolve a lógica da função com o handler do CORS
  corsHandler(request, response, async () => {
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    const {trainerId, recipients, subject, htmlContent} = request.body;

    if (!trainerId || !recipients || !subject || !htmlContent) {
      response.status(400).json({
        error: "Dados incompletos na requisição.",
      });
      return;
    }

    try {
      // 1. Buscar as configurações (e a API Key) do personal no Firestore
      const settingsRef = db.collection("trainerSettings").doc(trainerId);
      const settingsSnap = await settingsRef.get();

      if (!settingsSnap.exists) {
        response.status(404).json({
          error: "Configurações do personal não encontradas.",
        });
        return;
      }
      const trainerRef = db.collection("trainers").doc(trainerId);
      const trainerSnap = await trainerRef.get();
      const trainerData = trainerSnap.data();

      const settings = settingsSnap.data();
      if (!settings) {
        response.status(404).json({
          error: "Dados de configurações do personal não encontrados.",
        });
        return;
      }

      const apiKey = settings.brevoApiKey;
      const trainerName =
        trainerData?.fullName ||
        trainerData?.username ||
        "Personal Trainer";
      const sender = {
        email: settings.senderEmail,
        name: trainerName,
      };
      const replyTo = {
        email: settings.replyToEmail,
        name: trainerName,
      };

      if (!apiKey || !sender.email || !replyTo.email) {
        response.status(400).json({
          error: "Configurações de e-mail incompletas " +
            "no perfil do personal.",
        });
        return;
      }

      // 2. Montar e enviar a requisição para a API da Brevo
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
        throw new Error("Falha ao enviar e-mail pela Brevo.");
      }

      // 3. Retornar sucesso
      response.status(200).json({success: true});
    } catch (error) {
      functions.logger.error("Error in sendEmail function:", error);
      if (error instanceof Error) {
        response.status(500).json({error: error.message});
      } else {
        response.status(500).json({error: "Ocorreu um erro interno."});
      }
    }
  });
});
