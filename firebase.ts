import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your app's Firebase project configuration
// You can get this from the Firebase Console of your project.
const firebaseConfig = {
  apiKey: "AIzaSyDsi6VpfhLQW8UWgAp5c4TRV7vqOkDyauU",
  authDomain: "stingressos-e0a5f.firebaseapp.com",
  projectId: "stingressos-e0a5f",
  storageBucket: "stingressos-e0a5f.appspot.com",
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

/*
IMPORTANT: Firebase Storage Security Rules

You must also configure security rules for Firebase Storage. For this feature,
a basic rule would be to allow authenticated users to read and write to their
own folder. A simple (but insecure) starting point for development is:

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
*/