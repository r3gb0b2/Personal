import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// Runs every day at 9:00 AM São Paulo time.
export const sendLowSessionReminders = functions.pubsub
  .schedule("every day 09:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    functions.logger.info("Checking for low session reminders.");

    // This is a workaround for a typing issue with functions.config().
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = functions.config() as any;
    const apiKey = config.brevo?.key;
    const sender = config.brevo?.sender;

    if (!apiKey || !sender) {
      functions.logger.error("Brevo config not found in functions settings.");
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
      functions.logger.info("No students with low sessions found. Exiting.");
      return null;
    }

    const trainerIds = new Set<string>();
    studentsSnap.docs.forEach((doc) => {
      const student = doc.data();
      if (student.trainerId) {
        trainerIds.add(student.trainerId);
      }
    });

    const trainerPromises = Array.from(trainerIds).map((id) =>
      db.collection("trainers").doc(id).get()
    );
    const trainerSnaps = await Promise.all(trainerPromises);
    const trainers = new Map<string, admin.firestore.DocumentData>();
    trainerSnaps.forEach((snap) => {
      const data = snap.data();
      if (snap.exists && data) {
        trainers.set(snap.id, data);
      }
    });

    const emailPromises = studentsSnap.docs.map(async (studentDoc) => {
      const student = studentDoc.data();
      const remaining = student.remainingSessions;
      const reminderKey = `sessions_${remaining}`;

      if (student.remindersSent && student.remindersSent[reminderKey]) {
        const msg = `Reminder for ${student.name} (${remaining}) sent.`;
        functions.logger.info(msg);
        return;
      }

      if (!student.email) {
        functions.logger.warn(`Student ${student.name} has no email.`);
        return;
      }

      const trainer = trainers.get(student.trainerId);
      if (!trainer) {
        functions.logger.warn(`Trainer for ${student.name} not found.`);
        return;
      }

      const trainerName = trainer.fullName || trainer.username;
      const subject = "Suas aulas de personal estão acabando!";
      const htmlContent = `
        <p>Olá ${student.name},</p>
        <p>Este é um lembrete de que seu pacote de aulas está no fim.</p>
        <p>
          Restam <strong>${remaining} aula${remaining > 1 ? "s" : ""}</strong>.
        </p>
        <p>Fale com seu personal para renovar o plano e não parar.</p>
        <p>Abraços,<br/>${trainerName}</p>
      `.trim();

      const payload = {
        sender: {email: sender, name: trainerName},
        to: [{email: student.email, name: student.name}],
        replyTo: {email: trainer.contactEmail || sender, name: trainerName},
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
          await studentDoc.ref.update({
            [`remindersSent.${reminderKey}`]: new Date().toISOString(),
          });
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
