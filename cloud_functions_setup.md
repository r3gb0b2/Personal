# 🚀 Configurando Funções de Nuvem para Envio de E-mails (O Jeito Certo e Seguro)

Olá! Você notou que os e-mails não estavam funcionando e sugeriu o uso de uma "function", e você está absolutamente correto! Essa é a solução profissional para o problema.

## Por que precisamos disso?

1.  **Segurança:** Enviar e-mails diretamente do navegador expõe sua chave de API da Brevo. Qualquer pessoa com conhecimento técnico poderia roubá-la e usá-la. Com uma Cloud Function, sua chave fica segura no servidor.
2.  **Restrições do Navegador (CORS):** A maioria dos serviços de API, como a Brevo, bloqueia solicitações diretas de navegadores por segurança. A Cloud Function age como um intermediário seguro, que tem permissão para fazer essas chamadas.

Este guia irá orientá-lo passo a passo para configurar e implantar essa função no seu projeto Firebase.

---

### Passo 1: Preparar seu Ambiente

Você precisará do **Firebase CLI** (Command Line Interface). Se ainda não o tiver, instale-o globalmente:

```bash
npm install -g firebase-tools
```

Depois, faça login na sua conta do Google associada ao Firebase:

```bash
firebase login
```

---

### Passo 2: Inicializar as Cloud Functions no seu Projeto

1.  Abra o terminal na **pasta raiz do seu projeto** (a mesma onde está o arquivo `index.html`).
2.  Execute o seguinte comando para iniciar o setup das funções:

    ```bash
    firebase init functions
    ```

3.  O assistente fará algumas perguntas:
    *   **"Please select an option:"** -> Use as setas do teclado e selecione **"Use an existing project"**.
    *   Selecione o seu projeto Firebase na lista (ex: `stingressos-e0a5f`).
    *   **"What language would you like to use..."** -> Selecione **TypeScript**.
    *   **"Do you want to use ESLint..."** -> Digite **`y`** (Sim).
    *   **"File functions/package.json already exists. Overwrite?"** -> Se aparecer, digite **`n`** (Não).
    *   **"File functions/tsconfig.json already exists. Overwrite?"** -> Se aparecer, digite **`n`** (Não).
    *   **"Do you want to install dependencies with npm now?"** -> Digite **`y`** (Sim).

Isso criará uma nova pasta chamada `functions` no seu projeto.

---

### Passo 3: Adicionar o Código da Função

Agora, vamos substituir os arquivos de exemplo pelos nossos.

#### 1. Arquivo `functions/package.json`

Abra este arquivo e substitua **todo o seu conteúdo** pelo código abaixo. Isso adiciona as dependências que nossa função precisa (`cors` e `node-fetch`).

```json
{
  "name": "functions",
  "scripts": {
    "lint": "eslint --ext .js,.ts .",
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "main": "lib/index.js",
  "dependencies": {
    "cors": "^2.8.5",
    "firebase-admin": "^11.8.0",
    "firebase-functions": "^4.3.1",
    "node-fetch": "^2.6.11"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^5.12.0",
    "@typescript-eslint/parser": "^5.12.0",
    "eslint": "^8.9.0",
    "eslint-config-google": "^0.14.0",
    "eslint-plugin-import": "^2.25.4",
    "typescript": "^4.9.0"
  },
  "private": true
}
```

#### 2. Arquivo `functions/src/index.ts`

Este é o coração da nossa função. Abra este arquivo e substitua **todo o seu conteúdo** pelo código abaixo.

```typescript
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
import * as cors from "cors";

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
      const apiKey = settings?.brevoApiKey;
      const trainerName =
        trainerData?.fullName || trainerData?.username || "Personal Trainer";
      const sender = {
        email: settings?.senderEmail,
        name: trainerName,
      };
      const replyTo = {
        email: settings?.replyToEmail,
        name: trainerName,
      };

      if (!apiKey || !sender.email || !replyTo.email) {
        response.status(400).json({
          error: "Configurações de e-mail incompletas no perfil do personal.",
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
```

---

### Passo 4: Instalar Dependências e Fazer Deploy

1.  Navegue para a pasta `functions` no seu terminal:
    ```bash
    cd functions
    ```
2.  Instale as novas dependências que adicionamos ao `package.json`:
    ```bash
    npm install
    ```
3.  Volte para a pasta raiz do projeto:
    ```bash
    cd ..
    ```
4.  Agora, o grande momento! Faça o deploy da sua função para a nuvem do Firebase:
    ```bash
    firebase deploy --only functions
    ```
    Isso pode levar alguns minutos. Aguarde até o processo ser concluído.

---

### Passo 5: Configuração Final na Aplicação

1.  Quando o deploy terminar, o terminal mostrará a **URL da sua função**. Será algo como:
    `Function URL (sendEmail): https://us-central1-SEU-PROJETO.cloudfunctions.net/sendEmail`

2.  **Copie essa URL completa.**

3.  Abra o arquivo `constants.ts` na sua aplicação.

4.  Encontre a linha que diz `export const CLOUD_FUNCTION_URL = ...` e **cole a sua URL lá**, substituindo o valor de exemplo.

5.  **Pronto!** Salve o arquivo. A partir de agora, sua aplicação usará a Cloud Function segura para enviar e-mails.

Seu sistema de e-mails agora está robusto, seguro e deve funcionar perfeitamente!
