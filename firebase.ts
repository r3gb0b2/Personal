import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// =================================================================================
// AÇÃO CRÍTICA NECESSÁRIA - LEIA COM ATENÇÃO
// =================================================================================
// A lista de alunos não carrega porque esta configuração está INCORRETA.
// Você precisa substituir TODOS os valores abaixo pelos dados do SEU projeto.
//
// COMO FAZER:
// 1. Abra o Console do Firebase: https://console.firebase.google.com/
// 2. Selecione o seu projeto (ex: "brunopersonal").
// 3. Clique no ícone de engrenagem (Configurações do projeto) ao lado de "Visão geral do projeto".
// 4. Na aba "Geral", role para baixo até a seção "Seus apps".
// 5. Encontre seu aplicativo da web e clique no ícone </> para ver a configuração.
// 6. Copie o objeto `firebaseConfig` completo e cole-o aqui, substituindo TUDO.
//
// Se você não fizer isso, NENHUMA função do Firebase (banco de dados, fotos) funcionará.
// =================================================================================
export const firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJECT_ID_AQUI",
  storageBucket: "SEU_PROJETO.appspot.com", // Você mencionou "brunopersonal", verifique se o nome completo está correto. Ex: brunopersonal.appspot.com
  messagingSenderId: "SEU_SENDER_ID_AQUI",
  appId: "SEU_APP_ID_AQUI",
  measurementId: "SEU_MEASUREMENT_ID_AQUI" // Opcional
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a Firestore instance and export it for use in other files
export const db = getFirestore(app);

// Get a Firebase Storage instance and export it
export const storage = getStorage(app);

/*
IMPORTANTE: Regras de Segurança do Firestore

Para que a aplicação funcione de forma segura, você deve configurar as Regras
de Segurança do Firestore no console do seu projeto Firebase. Para desenvolvimento,
você pode começar com regras que permitem leitura e escrita, mas isso NÃO É
SEGURO para uma aplicação em produção.

Exemplo para desenvolvimento inicial (inseguro):
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
*/

/*
IMPORTANTE: Regras de Segurança do Firebase Storage

Você também deve configurar as regras de segurança para o Firebase Storage.
Para a funcionalidade de upload de fotos funcionar, uma regra básica seria
permitir que usuários autenticados leiam e escrevam arquivos. Um ponto de
partida simples (mas inseguro) para desenvolvimento é:

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true; // Em produção, restrinja para "if request.auth != null"
    }
  }
}
*/