# 🚀 Configurando Funções de Nuvem com Configuração Global e Segura

Olá! Esta é a maneira correta e profissional de configurar o envio de e-mails: usando uma **configuração centralizada e segura** gerenciada pelo administrador.

## Por que este método é melhor?

1.  **Segurança Máxima:** A chave de API da Brevo nunca é armazenada no banco de dados ou no código. Ela fica em uma área segura de configuração do Firebase, inacessível para o aplicativo cliente.
2.  **Simplicidade:** O personal trainer não precisa mais se preocupar em encontrar e configurar chaves de API. O envio de e-mail simplesmente funciona.
3.  **Manutenção Fácil:** Se precisar trocar a chave ou o e-mail, você faz isso em um único lugar, sem precisar pedir a cada personal para atualizar suas configurações.

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

### Passo 2: Inicializar as Cloud Functions (Se ainda não fez)

Se a pasta `functions` ainda não existe no seu projeto:

1.  Abra o terminal na **pasta raiz do seu projeto**.
2.  Execute o comando:
    ```bash
    firebase init functions
    ```
3.  O assistente fará algumas perguntas:
    *   **"Please select an option:"** -> Selecione **"Use an existing project"**.
    *   Selecione seu projeto Firebase na lista.
    *   **"What language would you like to use..."** -> Selecione **TypeScript**.
    *   **"Do you want to use ESLint..."** -> Digite **`y`** (Sim).
    *   **"Do you want to install dependencies with npm now?"** -> Digite **`y`** (Sim).

---

### Passo 3: Adicionar o Código da Função

Agora, vamos garantir que os arquivos da sua função estejam corretos.

#### 1. Arquivo `functions/package.json`

Abra este arquivo e substitua **todo o seu conteúdo** pelo código abaixo. Ele define a versão correta do Node.js (20) e as dependências necessárias.

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
    "node": "20"
  },
  "main": "lib/index.js",
  "dependencies": {
    "cors": "^2.8.5",
    "firebase-admin": "^11.8.0",
    "firebase-functions": "^4.3.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.13",
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
  (request, response) => {
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
      if (
        !trainerId ||
        !recipients ||
        !subject ||
        !htmlContent
      ) {
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
          const errorBody = JSON.stringify(errorData);
          throw new Error(`Falha no envio: ${errorBody}`);
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
```

---

### Passo 4: Configurar Variáveis de Ambiente Seguras (MUITO IMPORTANTE)

Este é o passo crucial. Vamos dizer ao Firebase qual é a sua chave da Brevo e seu e-mail remetente sem colocá-los no código.

1.  Abra o terminal na **pasta raiz do seu projeto**.
2.  Execute o seguinte comando, **substituindo `SUA_CHAVE_API_DA_BREVO`** pela sua chave real:
    ```bash
    firebase functions:config:set brevo.key="SUA_CHAVE_API_DA_BREVO"
    ```
3.  Agora, execute o próximo comando, **substituindo `contato@suaacademia.com`** pelo e-mail que você quer que apareça como remetente:
    ```bash
    firebase functions:config:set brevo.sender="contato@suaacademia.com"
    ```

---

### Passo 5: Fazer Deploy da Função

Agora que o código e as configurações estão prontos, vamos enviar tudo para a nuvem.

1.  No terminal, na **pasta raiz do projeto**, execute:
    ```bash
    firebase deploy --only functions
    ```
    Isso pode levar alguns minutos. Aguarde a conclusão.

---

### Passo 6: Configuração Final na Aplicação

1.  Quando o deploy terminar, o terminal mostrará a **URL da sua função**. Será algo como:
    `Function URL (sendEmail): https://us-central1-SEU-PROJETO.cloudfunctions.net/sendEmail`

2.  **Copie essa URL completa.**

3.  Abra o arquivo `constants.ts` na sua aplicação.

4.  Encontre a linha `export const CLOUD_FUNCTION_URL = ...` e **cole a sua URL lá**, substituindo o valor de exemplo.

5.  **Pronto!** Salve o arquivo. Seu sistema de e-mails agora está robusto, seguro e deve funcionar perfeitamente.