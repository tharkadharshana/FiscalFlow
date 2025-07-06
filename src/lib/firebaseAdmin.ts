import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    try {
      // This works in Cloud Functions where GOOGLE_APPLICATION_CREDENTIALS is set automatically
      // For local dev, you must have the service account key file and set the env var
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } catch (e) {
      console.error('Could not initialize Firebase Admin SDK. Make sure GOOGLE_APPLICATION_CREDENTIALS is set for local development.', e);
    }
}

const db = admin.firestore();
const authAdmin = admin.auth();

export { db, authAdmin };
