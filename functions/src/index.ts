import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Checks daily for students with low session counts and sends reminders.
 * This function is scheduled to run every day at 9:00 AM São Paulo time.
 */
export const sendLowSessionReminders = functions.pubsub
  .schedule("every day 09:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    functions.logger.info("Starting low session reminder check.");

    // Brevo configuration is now retrieved from the Admin Panel settings
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
        return; // Reminder already sent for this threshold
      }
      if (!student.email || !student.trainerId) {
        return; // Cannot send email without an address or trainer
      }

      const trainer = trainerDataMap.get(student.trainerId);
      if (!trainer) {
        return; // Trainer not found
      }

      const trainerName = trainer.fullName || trainer.username;
      const subject = "Suas aulas de personal estão acabando!";
      const htmlContent = `
        <p>Olá ${student.name},</p>
        <p>Este é um lembrete de que seu pacote de aulas está no fim.</p>
        <p>Restam <strong>${remaining} aula${remaining > 1 ? "s" : ""}
        </strong>.</p>
        <p>Fale com seu personal para renovar o plano e não interromper
        seus treinos.</p>
        <p>Abraços,<br/>${trainerName}</p>
      `.trim();

      const payload = {
        sender: {email: senderEmail, name: trainerName},
        to: [{email: student.email, name: student.name}],
        replyTo: {email: trainer.contactEmail || senderEmail, name: trainerName},
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
