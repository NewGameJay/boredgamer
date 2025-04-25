import { NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';

export const runtime = 'edge';
const db = getFirestore(app);

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

    try {
      // Find studio by API key
      const studiosRef = collection(db, 'studios');
      const q = query(studiosRef, where('apiKey', '==', apiKey));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }

      const studio = querySnapshot.docs[0];
      const studioData = studio.data();

      // Verify game ID belongs to this studio
      if (studioData.gameId !== gameId) {
        return NextResponse.json(
          { error: 'Game ID does not match studio' },
          { status: 403 }
        );
      }

      // Create event document
      const event = {
        gameId,
        studioId: studio.id,
        type,
        data,
        timestamp: new Date(),
        metadata: {
          sdkVersion: '1.0.0',
          apiVersion: 'v1',
          platform: body.platform || 'unknown'
        }
      };

      // Add event to Firestore
      const eventsRef = collection(db, 'events');
      const docRef = await addDoc(eventsRef, event);

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

// Helper function to convert JavaScript values to Firestore field values
function convertToFirestoreFields(data: any): Record<string, any> {
  const fields: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = { doubleValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(item => convertToFirestoreValue(item))
        }
      };
    } else if (typeof value === 'object') {
      fields[key] = {
        mapValue: {
          fields: convertToFirestoreFields(value)
        }
      };
    }
  }
  
  return fields;
}

// Helper function to convert a single value to Firestore value
function convertToFirestoreValue(value: any): any {
  if (value === null) {
    return { nullValue: null };
  } else if (typeof value === 'string') {
    return { stringValue: value };
  } else if (typeof value === 'number') {
    return { doubleValue: value };
  } else if (typeof value === 'boolean') {
    return { booleanValue: value };
  } else if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(item => convertToFirestoreValue(item))
      }
    };
  } else if (typeof value === 'object') {
    return {
      mapValue: {
        fields: convertToFirestoreFields(value)
      }
    };
  }
  return { nullValue: null };
}
