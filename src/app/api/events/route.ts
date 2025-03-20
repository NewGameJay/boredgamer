import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const runtime = 'edge';

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
      timestamp: serverTimestamp(),
      metadata: {
        sdkVersion: '1.0.0',
        apiVersion: 'v1'
      }
    };

    try {
      // Save to Firestore
      const docRef = await addDoc(collection(db, 'events'), event);
      return NextResponse.json({ 
        success: true, 
        event: { 
          type, 
          gameId,
          id: docRef.id 
        } 
      });
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
