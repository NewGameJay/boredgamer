import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // Get API key from headers
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      const response = NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { gameId, type, data } = body;

    // Validate required fields
    if (!gameId || !type || !data) {
      const response = NextResponse.json(
        { error: 'Missing required fields: gameId, type, data' },
        { status: 400 }
      );
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
      return response;
    }

    try {
      // Find studio by API key
      const studiosRef = adminDb.collection('studios');
      const querySnapshot = await studiosRef.where('apiKey', '==', apiKey).get();

      if (querySnapshot.empty) {
        const response = NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
        return response;
      }

      const studio = querySnapshot.docs[0];
      const studioData = studio.data();

      // Verify game ID belongs to this studio
      if (studioData.gameId !== gameId) {
        const response = NextResponse.json(
          { error: 'Game ID does not match studio' },
          { status: 403 }
        );
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
        return response;
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
      const eventsRef = adminDb.collection('events');
      const docRef = await eventsRef.add(event);

      const response = NextResponse.json({ 
        success: true, 
        event: { 
          type, 
          gameId,
          id: docRef.id
        } 
      });
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
      return response;
    } catch (error: any) {
      console.error('Firestore error:', error);
      const response = NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
      return response;
    }
  } catch (error: any) {
    console.error('API error:', error);
    const response = NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
    return response;
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
