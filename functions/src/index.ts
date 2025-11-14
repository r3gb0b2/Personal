import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// This function runs every day at 9:00 AM São Paulo time.
export const sendLowSessionReminders = functions.pubsub
  .schedule("every day 09:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    functions.logger.info(
      "Starting check for low session reminders."
    );

    // This is a known workaround for a typing issue with functions.config().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = functions.config() as any;
    const apiKey = config.brevo?.key;
    const globalSenderEmail = config.brevo?.sender;

    if (!apiKey || !globalSenderEmail) {
      functions.logger.error(
        "Brevo API key or sender email are not configured in functions."
      );
      return null;
    }

    const plansSnapshot = await db
      .collection("plans")
      .where("type", "==", "session")
      .get();
    const sessionPlanIds = plansSnapshot.docs.map((doc) => doc.id);

    if (sessionPlanIds.length === 0) {
      functions.logger.info("No session-based plans found. Exiting.");
      return null;
    }

    const studentsSnapshot = await db
      .collection("students")
      .where("planId", "in", sessionPlanIds)
      .where("remainingSessions", "in", [1, 2, 3])
      .get();

    if (studentsSnapshot.empty) {
      functions.logger.info("No students with low sessions found. Exiting.");
      return null;
    }

    const trainersToFetch = new Set<string>();
    studentsSnapshot.docs.forEach((doc) => {
      const student = doc.data();
      if (student.trainerId) {
        trainersToFetch.add(student.trainerId);
      }
    });

    const trainerPromises = Array.from(trainersToFetch).map((id) =>
      db.collection("trainers").doc(id).get()
    );
    const trainerSnaps = await Promise.all(trainerPromises);
    const trainerDataMap = new Map<string, admin.firestore.DocumentData>();
    trainerSnaps.forEach((snap) => {
      const data = snap.data();
      if (snap.exists && data) {
        trainerDataMap.set(snap.id, data);
      }
    });

    const emailPromises = studentsSnapshot.docs.map(async (studentDoc) => {
      const student = studentDoc.data();
      const remaining = student.remainingSessions;
      const reminderKey = `sessions_${remaining}`;

      if (student.remindersSent && student.remindersSent[reminderKey]) {
        functions.logger.info(
          `Reminder for ${student.name} (${remaining} sessions) already sent.`
        );
        return;
      }

      if (!student.email) {
        functions.logger.warn(`Student ${student.name} has no email.`);
        return;
      }

      const trainer = trainerDataMap.get(student.trainerId);
      if (!trainer) {
        functions.logger.warn(
          `Trainer for student ${student.name} not found.`
        );
        return;
      }

      const trainerName = trainer.fullName || trainer.username;
      const subject = "Suas aulas de personal estão acabando!";
      const htmlContent = [
        `<p>Olá ${student.name},</p>`,
        "<p>Tudo bem? Este é um lembrete amigável de que seu pacote de ",
        "aulas está chegando ao fim.</p>",
        `<p>Atualmente, você tem <strong>${remaining} aula`,
        `${remaining > 1 ? "s" : ""} restante`,
        `${remaining > 1 ? "s" : ""}</strong>.</p>`,
        "<p>Para não interromper sua rotina de treinos, fale com seu ",
        "personal para garantir a renovação do seu plano.</p>",
        "<p>Qualquer dúvida, é só responder a este e-mail.</p>",
        `<p>Abraços,<br/>${trainerName}</p>`,
      ].join("");

      const emailPayload = {
        sender: {email: globalSenderEmail, name: trainerName},
        to: [{email: student.email, name: student.name}],
        replyTo: {
          email: trainer.contactEmail || globalSenderEmail,
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
          body: JSON.stringify(emailPayload),
        });

        if (response.ok) {
          functions.logger.info(
            `Reminder email sent to ${student.name}.`
          );
          await studentDoc.ref.update({
            [`remindersSent.${reminderKey}`]: new Date().toISOString(),
          });
        } else {
          const errorData = await response.json();
          functions.logger.error(
            `Failed to send email to ${student.name}`,
            errorData
          );
        }
      } catch (error) {
        functions.logger.error(
          `System error sending email to ${student.name}`,
          error
        );
      }
    });

    await Promise.all(emailPromises);
    functions.logger.info("Reminder check finished.");
    return null;
  });
