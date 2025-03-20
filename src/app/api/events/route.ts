import { NextResponse } from 'next/server';

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
      timestamp: new Date().toISOString(),
      metadata: {
        sdkVersion: '1.0.0',
        apiVersion: 'v1'
      }
    };

    try {
      // Send directly to Firestore REST API
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const response = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/events`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            fields: {
              gameId: { stringValue: event.gameId },
              type: { stringValue: event.type },
              data: { mapValue: { fields: convertToFirestoreFields(event.data) } },
              timestamp: { timestampValue: event.timestamp },
              metadata: { mapValue: { fields: convertToFirestoreFields(event.metadata) } }
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to save event');
      }

      const result = await response.json();
      const docId = result.name.split('/').pop();

      return NextResponse.json({ 
        success: true, 
        event: { 
          type, 
          gameId,
          id: docId
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
