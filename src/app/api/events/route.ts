import { NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin with a check for edge runtime
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  // Handle newlines in private key for edge runtime
  privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

// Initialize only if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(firebaseAdminConfig)
  });
}

const db = getFirestore();

export const runtime = 'edge'; // Specify edge runtime

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

    // Create event document
    const event = {
      gameId,
      type,
      data,
      timestamp: new Date(),
      metadata: {
        sdkVersion: '1.0.0',
        apiVersion: 'v1'
      }
    };

    try {
      // Save to Firestore
      await db.collection('events').add(event);
      return NextResponse.json({ success: true, event: { type, gameId } });
    } catch (error: any) {
      console.error('Firestore error:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
