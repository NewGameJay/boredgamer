
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let app;

try {
  // Check if Firebase Admin is already initialized
  if (getApps().length === 0) {
    // Initialize Firebase Admin
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } else {
    app = getApps()[0];
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  throw new Error('Failed to initialize Firebase Admin SDK');
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export { app };

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
