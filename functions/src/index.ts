import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// Função Agendada para rodar todos os dias às 9:00, horário de São Paulo
export const sendLowSessionReminders = functions.pubsub
  .schedule("every day 09:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async (context) => {
    functions.logger.info("Iniciando verificação de lembretes de poucas aulas.");

    // Fix: The 'config' function on the 'functions' object was not being correctly
    // typed, leading to a TypeScript error. Casting 'functions.config()' to 'any'
    // bypasses the incorrect type definition and allows accessing configuration.
    const config = functions.config() as any;
    const apiKey = config.brevo?.key;
    const globalSenderEmail = config.brevo?.sender;

    if (!apiKey || !globalSenderEmail) {
      functions.logger.error(
        // Fix: Corrected typo in error message.
        "A chave da API ou e-mail remetente da Brevo não estão configurados."
      );
      return null;
    }

    // 1. Buscar todos os planos do tipo 'session'
    const plansSnapshot = await db
      .collection("plans")
      .where("type", "==", "session")
      .get();
    const sessionPlanIds = plansSnapshot.docs.map((doc) => doc.id);

    if (sessionPlanIds.length === 0) {
      functions.logger.info("Nenhum plano por sessão encontrado. Encerrando.");
      return null;
    }

    // 2. Buscar alunos que têm esses planos e poucas aulas restantes (1, 2 ou 3)
    const studentsSnapshot = await db
      .collection("students")
      .where("planId", "in", sessionPlanIds)
      .where("remainingSessions", "in", [1, 2, 3])
      .get();

    if (studentsSnapshot.empty) {
      functions.logger.info("Nenhum aluno com poucas aulas. Encerrando.");
      return null;
    }

    // Agrupar alunos por personal para buscar dados do personal uma vez só
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
      if (snap.exists) {
        trainerDataMap.set(snap.id, snap.data()!);
      }
    });


    // 3. Iterar e enviar e-mails
    const emailPromises = studentsSnapshot.docs.map(async (studentDoc) => {
      const student = studentDoc.data();
      const studentId = studentDoc.id;
      const remaining = student.remainingSessions;
      const reminderKey = `sessions_${remaining}`;

      // Verificar se o lembrete para esta contagem específica já foi enviado
      if (student.remindersSent && student.remindersSent[reminderKey]) {
        functions.logger.info(`Lembrete para ${student.name} (${remaining} aulas) já enviado.`);
        return;
      }

      if (!student.email) {
        functions.logger.warn(`Aluno ${student.name} não possui e-mail.`);
        return;
      }
      
      const trainer = trainerDataMap.get(student.trainerId);
      if (!trainer) {
          functions.logger.warn(`Personal do aluno ${student.name} não encontrado.`);
          return;
      }
      
      const trainerName = trainer.fullName || trainer.username;

      // Montar e-mail
      const subject = `Suas aulas de personal estão acabando!`;
      const htmlContent = `
        <p>Olá ${student.name},</p>
        <p>Tudo bem? Este é um lembrete amigável de que seu pacote de aulas está chegando ao fim.</p>
        <p>Atualmente, você tem <strong>${remaining} aula${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}</strong>.</p>
        <p>Para não interromper sua rotina de treinos, fale com seu personal para garantir a renovação do seu plano.</p>
        <p>Qualquer dúvida, é só responder a este e-mail.</p>
        <p>Abraços,<br/>${trainerName}</p>
      `;

      const emailPayload = {
        sender: {email: globalSenderEmail, name: trainerName},
        to: [{email: student.email, name: student.name}],
        replyTo: {email: trainer.contactEmail || globalSenderEmail, name: trainerName},
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
          functions.logger.info(`Email de lembrete enviado para ${student.name}.`);
          // Marcar lembrete como enviado no Firestore
          await studentDoc.ref.update({
            [`remindersSent.${reminderKey}`]: new Date().toISOString(),
          });
        } else {
          const errorData = await response.json();
          functions.logger.error(`Falha ao enviar e-mail para ${student.name}`, errorData);
        }
      } catch (error) {
        functions.logger.error(`Erro de sistema ao enviar e-mail para ${student.name}`, error);
      }
    });

    await Promise.all(emailPromises);
    functions.logger.info("Verificação de lembretes concluída.");
    return null;
  });