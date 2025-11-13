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
IMPORTANTE: Nova Coleção 'trainers'

Para o novo sistema de múltiplos personais, você PRECISA criar manualmente os
primeiros registros na sua coleção do Firestore.

1. Vá para o Firestore Database no seu Console do Firebase.
2. Crie uma nova coleção chamada "trainers".
3. Adicione um novo documento com ID automático.
4. Adicione os campos:
   - `username` (string): bruno
   - `password` (string): 12345
5. Você poderá criar outros personais pela interface de Admin (login: admin/admin).
*/


/*
IMPORTANTE: Regras de Segurança do Firestore ATUALIZADAS

Com o novo sistema, as regras de segurança precisam ser mais robustas para garantir
que um personal não possa ver os dados de outro.

Exemplo de regras para o sistema multi-personal (MAIS SEGURO):
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Trainers só podem ler e escrever seus próprios documentos
    match /students/{studentId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.trainerId;
    }
    match /plans/{planId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.trainerId;
    }
     match /payments/{paymentId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.trainerId;
    }

    // A coleção de trainers pode ser gerenciada pelo admin (requer lógica adicional)
    // Para simplificar, começamos permitindo a leitura por qualquer um logado.
    match /trainers/{trainerId} {
       allow read: if request.auth != null;
       allow create: if true; // Permite que o admin crie novos trainers
    }
  }
}

NOTA: Estas regras usam `request.auth.uid`, que funciona com o Firebase Authentication.
Como estamos usando um sistema de login customizado, a validação de segurança
ocorre principalmente na aplicação. Para um ambiente de produção real, a integração
com Firebase Authentication é altamente recomendada.
*/

/*
IMPORTANTE: Regras de Segurança do Firebase Storage

As regras de storage também precisam garantir que um personal só acesse as fotos
dos seus próprios alunos.

service firebase.storage {
  match /b/{bucket}/o {
    // O caminho das fotos é /profile_pictures/{student_id}/{fileName}
    // A regra deve verificar se o personal logado é o dono do aluno.
    // Isso requer uma estrutura mais complexa e, idealmente, Firebase Auth.
    // Por enquanto, uma regra simples para desenvolvimento é:
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
*/