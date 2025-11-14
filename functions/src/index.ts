import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Creates a branded, responsive HTML email template for cloud functions.
 * @param title The main heading of the email.
 * @param bodyContent The main paragraph content of the email. Can contain HTML.
 * @param trainer The trainer's data for personalization.
 * @returns A full HTML string for the email body.
 */
const generateEmailTemplate = (
  title: string,
  bodyContent: string,
  trainer: admin.firestore.DocumentData
): string => {
  const trainerName = trainer.fullName || trainer.username;
  const footerLinks = [];
  if (trainer.whatsapp) {
    footerLinks.push(
      `<a href="https://wa.me/${trainer.whatsapp}"
      style="color: #4c9aff; text-decoration: none; margin: 0 10px;">
      WhatsApp</a>`
    );
  }
  if (trainer.instagram) {
    footerLinks.push(
      `<a href="https://instagram.com/${trainer.instagram}"
      style="color: #4c9aff; text-decoration: none; margin: 0 10px;">
      Instagram</a>`
    );
  }

  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
          body { margin: 0; padding: 0; background-color: #f4f5f7;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
            Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji',
            'Segoe UI Emoji', 'Segoe UI Symbol'; }
          .container { max-width: 600px; margin: 40px auto;
            background-color: #ffffff; border: 1px solid #dfe1e6;
            border-radius: 8px; overflow: hidden; }
          .header { background-color: #091e42; color: #ffffff;
            padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .body-content { padding: 32px; color: #172b4d; line-height: 1.6; }
          .body-content p { margin: 0 0 16px; }
          .footer { background-color: #f4f5f7; padding: 24px;
            text-align: center; font-size: 12px; color: #505f79; }
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
              <p>Esta é uma mensagem automática.
              Para dúvidas, responda a este e-mail.</p>
              ${footerLinks.length > 0 ?
      `<p>${footerLinks.join(" &bull; ")}</p>` : ""}
          </div>
      </div>
  </body>
  </html>
  `;
};

/**
 * Checks daily for students with low session counts and sends reminders.
 * This function is scheduled to run every day at 9:00 AM São Paulo time.
 */
export const sendLowSessionReminders = functions.pubsub
  .schedule("every day 09:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    functions.logger.info("Starting low session reminder check.");

    const brevoConfigRef = db.doc("settings/brevoConfig");
    const brevoConfigSnap = await brevoConfigRef.get();

    if (!brevoConfigSnap.exists || !brevoConfigSnap.data()) {
      functions.logger.error(
        "Brevo config not found in Firestore at 'settings/brevoConfig'."
      );
      return null;
    }

    const {apiKey, senderEmail} = brevoConfigSnap.data() as
      {apiKey?: string, senderEmail?: string};

    if (!apiKey || !senderEmail) {
      functions.logger.error(
        "Brevo API key or sender email is not configured in Firestore."
      );
      return null;
    }

    const plansSnap = await db
      .collection("plans")
      .where("type", "==", "session")
      .get();
    const planIds = plansSnap.docs.map((doc) => doc.id);

    if (planIds.length === 0) {
      functions.logger.info("No session-based plans found. Exiting.");
      return null;
    }

    const studentsSnap = await db
      .collection("students")
      .where("planId", "in", planIds)
      .where("remainingSessions", "in", [1, 2, 3])
      .get();

    if (studentsSnap.empty) {
      functions.logger.info("No students with low sessions found.");
      return null;
    }

    const trainerIds =
      new Set(studentsSnap.docs.map((d) => d.data().trainerId).filter(Boolean));

    const trainerSnaps = await Promise.all(
      Array.from(trainerIds).map((id) => db.collection("trainers").doc(id).get())
    );

    const trainerDataMap = new Map<string, admin.firestore.DocumentData>();
    trainerSnaps.forEach((snap) => {
      const data = snap.data();
      if (snap.exists && data) {
        trainerDataMap.set(snap.id, data);
      }
    });

    const emailPromises = studentsSnap.docs.map(async (studentDoc) => {
      const student = studentDoc.data();
      const remaining = student.remainingSessions;
      const reminderKey = `sessions_${remaining}`;

      if (student.remindersSent?.[reminderKey]) {
        return;
      }
      if (!student.email || !student.trainerId) {
        return;
      }

      const trainer = trainerDataMap.get(student.trainerId);
      if (!trainer) {
        return;
      }

      const subject = "Suas aulas de personal estão acabando!";
      const bodyContent = `
        <p>Olá ${student.name},</p>
        <p>Este é um lembrete de que seu pacote de aulas está no fim.
        Restam <strong>${remaining} aula${remaining > 1 ? "s" : ""}
        </strong>.</p>
        <p>Fale com seu personal para renovar o plano e não interromper
        seus treinos.</p>
      `;
      const htmlContent = generateEmailTemplate(subject, bodyContent, trainer);
      const trainerName = trainer.fullName || trainer.username;

      const payload = {
        sender: {email: senderEmail, name: trainerName},
        to: [{email: student.email, name: student.name}],
        replyTo: {
          email: trainer.contactEmail || senderEmail,
          name: trainerName,
        },
        subject,
        htmlContent,
      };

      try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": apiKey,
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          functions.logger.info(`Reminder sent to ${student.name}.`);
          const updateData = {
            [`remindersSent.${reminderKey}`]: new Date().toISOString(),
          };
          await studentDoc.ref.update(updateData);
        } else {
          const errorData = await response.json();
          functions.logger.error(
            `Failed to send email to ${student.name}`, errorData
          );
        }
      } catch (error) {
        functions.logger.error(
          `System error sending email to ${student.name}`, error
        );
      }
    });

    await Promise.all(emailPromises);
    functions.logger.info("Reminder check finished.");
    return null;
  });
