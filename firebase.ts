import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ATENÇÃO: Substitua TODOS os valores abaixo pelos do seu projeto Firebase.
// Vá no Console do Firebase > Configurações do Projeto para obter seus dados.
// Estes são apenas exemplos e NÃO funcionarão para o upload de fotos.
export const firebaseConfig = {
  apiKey: "AIzaSyDsi6VpfhLQW8UWgAp5c4TRV7vqOkDyauU", // O SEU apiKey
  authDomain: "brunopersonal.firebaseapp.com",
  projectId: "brunopersonal",
  storageBucket: "brunopersonal.appspot.com",
  messagingSenderId: "424186734009", // O SEU messagingSenderId
  appId: "1:424186734009:web:f9420fca3d94ddd0784268", // O SEU appId
  measurementId: "G-YZRJ4FP574" // Opcional
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