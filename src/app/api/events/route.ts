import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, studioId, type, data, metadata } = body;

    // Validate required fields
    if (!gameId || !studioId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: gameId, studioId, type' },
        { status: 400 }
      );
    }

    // Validate API key from headers
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key' },
        { status: 401 }
      );
    }

    // TODO: Validate API key against database
    // For now, we'll accept any key starting with 'bg_'
    if (!apiKey.startsWith('bg_')) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 401 }
      );
    }

    // Create event object with proper structure
    const event = {
      gameId,
      studioId,
      type,
      data: data || {},
      metadata: {
        sdkVersion: metadata?.sdkVersion || '1.0.0',
        platform: metadata?.platform || 'unknown',
        timestamp: new Date().toISOString(),
        apiKey: apiKey.substring(0, 12) + '...', // Log partial key for debugging
        ...metadata
      },
      timestamp: new Date(),
      processed: false
    };

    // Store in Firebase
    const { db } = await import('@/lib/firebase-admin');
    const docRef = await db.collection('events').add(event);

    // Log for monitoring
    console.log(`Event received: ${type} for game ${gameId}`, {
      eventId: docRef.id,
      studioId,
      timestamp: event.timestamp
    });

    return NextResponse.json({
      success: true,
      eventId: docRef.id,
      message: 'Event received successfully'
    });

  } catch (error) {
    console.error('Error processing event:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const studioId = searchParams.get('studioId');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!studioId) {
      return NextResponse.json(
        { error: 'Missing studioId parameter' },
        { status: 400 }
      );
    }

    const { db } = await import('@/lib/firebase-admin');
    let query = db.collection('events').where('studioId', '==', studioId);

    if (gameId) {
      query = query.where('gameId', '==', gameId);
    }

    const snapshot = await query
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      events,
      count: events.length,
      hasMore: events.length === limit
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}