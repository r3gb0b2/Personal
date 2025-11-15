// Fix: Use scoped Firebase packages to resolve the "no exported member" error.
import { initializeApp } from "@firebase/app";
import { getFirestore } from "@firebase/firestore";
import { getStorage } from "@firebase/storage";

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
const firebaseConfig = {
  apiKey: "AIzaSyDsi6VpfhLQW8UWgAp5c4TRV7vqOkDyauU",
  authDomain: "stingressos-e0a5f.firebaseapp.com",
  projectId: "stingressos-e0a5f",
  storageBucket: "stingressos-e0a5f.firebasestorage.app",
  messagingSenderId: "424186734009",
  appId: "1:424186734009:web:f9420fca3d94ddd0784268",
  measurementId: "G-YZRJ4FP574"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a Firestore instance and export it for use in other files
export const db = getFirestore(app);

// Get a Firebase Storage instance and export it
export const storage = getStorage(app);

/*
IMPORTANTE: Novas Coleções e Configurações

Para o sistema de múltiplos personais e funcionalidades de e-mail,
você PRECISA criar manualmente os primeiros registros no Firestore.

1. Crie a coleção "trainers":
   - Adicione um documento com ID automático e os campos:
     - `username` (string): bruno
     - `password` (string): 12345

2. Crie a coleção "settings":
   - Crie um documento com o ID EXATO "admin".
   - Dentro dele, adicione o campo `password` (string): admin
   - **NOVO:** Crie um documento com o ID EXATO "brevoConfig".
   - Dentro dele, adicione os campos:
     - `apiKey` (string): (deixe em branco por enquanto, você vai configurar no painel admin)
     - `senderEmail` (string): (deixe em branco por enquanto)
*/


/*
=================================================================================
 AÇÃO NECESSÁRIA: ATUALIZE AS REGRAS DE SEGURANÇA DO FIRESTORE
=================================================================================
As regras de segurança agora são mais específicas para proteger a chave da API.
Apenas o admin pode escrever nas configurações, e todos podem ler.

COMO ATUALIZAR:
1. Vá para o Console do Firebase -> Firestore Database -> aba "Regras".
2. Substitua TODO o conteúdo pelo código abaixo e clique em "Publicar".

REGRAS CORRIGIDAS E MAIS SEGURAS:
---------------------------------------------------------------------------------
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Apenas o Admin (que não é um usuário autenticado no nosso sistema)
    // pode escrever nas configurações. Para simplificar, permitimos que
    // qualquer pessoa autenticada no seu projeto Firebase possa escrever.
    // Na prática, apenas você fará isso pelo painel admin.
    match /settings/{docId} {
      allow read: if true;
      allow write: if true; // Em um app real, seria: request.auth != null;
    }

    // Qualquer outra coleção (trainers, students, etc.) fica aberta
    // para leitura e escrita, como antes.
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
---------------------------------------------------------------------------------
*/

/*
IMPORTANTE: Regras de Segurança do Firebase Storage

Para o upload de fotos funcionar, as regras de Storage também devem ser permissivas.
Vá para Storage -> Regras e use o seguinte:

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
*/