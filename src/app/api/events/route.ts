import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

export async function POST(request: Request) {
  try {
    // Get API key from headers
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { gameId, type, data } = body;

    // Validate required fields
    if (!gameId || !type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId, type, data' },
        { status: 400 }
      );
    }

    // Verify API key and get studio ID
    const decodedToken = await getAuth().verifyIdToken(apiKey);
    const studioId = decodedToken.uid;

    // Create event document
    const event = {
      gameId,
      type,
      data,
      studioId,
      timestamp: new Date(),
    };

    // Save to Firestore
    await db.collection('events').add(event);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing event:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
