import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for missing config values and provide a better error message.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  if (process.env.NODE_ENV !== 'production') {
      console.error(`
  ********************************************************************************
  * FIREBASE CONFIGURATION ERROR                                                 *
  *------------------------------------------------------------------------------*
  * Your Firebase environment variables are missing or incomplete.               *
  * Please check your .env.local file and ensure all NEXT_PUBLIC_FIREBASE_*      *
  * variables are set correctly.                                                 *
  ********************************************************************************
  `);
  }
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
