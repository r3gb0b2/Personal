
// Fix: Use the v1 compatibility layer for firebase-functions.
// The existing code is written for Cloud Functions v1 (e.g., uses functions.config()).
// Newer versions of the firebase-functions SDK default to v2, causing type errors
// and breaking changes. Importing from "firebase-functions/v1" ensures
// that the v1 function signatures, types, and features are used.
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import cors from "cors";

admin.initializeApp();

const corsHandler = cors({origin: true});

export const sendEmail = functions.https.onRequest(
    (request: functions.https.Request, response: functions.Response) => {
      corsHandler(request, response, async () => {
        if (request.method !== "POST") {
          response.status(405).send("Method Not Allowed");
          return;
        }

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

        const {
          trainerId,
          recipients,
          subject,
          htmlContent,
        } = request.body;
        if (!trainerId || !recipients || !subject || !htmlContent) {
          response.status(400).json({error: "Dados incompletos na requisição."});
          return;
        }

        try {
          const trainerRef = admin.firestore().collection("trainers").doc(trainerId);
          const trainerSnap = await trainerRef.get();

          if (!trainerSnap.exists) {
            response.status(404).json({error: "Personal não encontrado."});
            return;
          }
          const trainerData = trainerSnap.data() || {};
          const trainerName =
            trainerData.fullName || trainerData.username || "Personal Trainer";

          const sender = {
            email: globalSenderEmail,
            name: trainerName,
          };

          const replyTo = {
            email: trainerData.contactEmail || globalSenderEmail,
            name: trainerName,
          };

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
            const errMessage = "Falha no envio: " + JSON.stringify(errorData);
            throw new Error(errMessage);
          }

          response.status(200).json({success: true});
        } catch (error) {
          functions.logger.error("Error in sendEmail function:", error);
          const message = error instanceof Error ?
            error.message : "Ocorreu um erro interno.";
          response.status(500).json({error: message});
        }
      });
    },
);
