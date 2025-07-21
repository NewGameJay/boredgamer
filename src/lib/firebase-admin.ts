import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let app: any;

try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountJson) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not set, using default app');
    // For development, create a minimal app
    if (!getApps().length) {
      app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project'
      });
    } else {
      app = getApps()[0];
    }
  } else {
    const serviceAccount = JSON.parse(serviceAccountJson);

    if (!getApps().length) {
      app = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    } else {
      app = getApps()[0];
    }
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  // For development, create a basic app
  if (!getApps().length) {
    app = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project'
    });
  } else {
    app = getApps()[0];
  }
}

export const auth = getAuth(app);
export const firestore = getFirestore(app);

const admin = {
  auth,
  firestore,
  app
};

export default admin;

// Helper function to verify tokens
export async function verifyIdToken(idToken: string) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return { success: true, user: decodedToken };
  } catch (error) {
    console.error('Token verification failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}