import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your app's Firebase project configuration
// You can get this from the Firebase Console of your project.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a Firestore instance and export it for use in other files
export const db = getFirestore(app);

/*
IMPORTANT: Firestore Security Rules

For this application to function correctly and securely, you must set up 
Firestore Security Rules in your Firebase project console. For development, 
you can start with rules that allow all reads and writes, but this is NOT 
secure for a production application.

Example for initial development (insecure):
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}

For production, you should implement Firebase Authentication and write rules
that restrict data access to authenticated users only.
*/
