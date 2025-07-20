
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      gameId, 
      studioId, 
      type = 'score', 
      scoreFormula, 
      resetSchedule,
      communityGating 
    } = body;

    // Validate required fields
    if (!name || !gameId || !studioId) {
      return Response.json(
        { error: 'Missing required fields: name, gameId, studioId' },
        { status: 400 }
      );
    }

    // Create leaderboard configuration
    const leaderboard = {
      name,
      gameId,
      studioId,
      type,
      scoreFormula: scoreFormula || 'data.score', // Default to simple score field
      resetSchedule: resetSchedule || 'never', // never, daily, weekly, monthly
      communityGating: communityGating || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      entries: [] // Start with empty leaderboard
    };

    const { db } = await import('@/lib/firebase-admin');
    const docRef = await db.collection('leaderboards').add(leaderboard);

    // Create config.leaderboard event for BrightMatter processing
    await db.collection('events').add({
      gameId,
      studioId,
      type: 'config.leaderboard.created',
      data: {
        leaderboardId: docRef.id,
        ...leaderboard
      },
      timestamp: new Date(),
      processed: false,
      metadata: {
        source: 'api',
        action: 'create'
      }
    });

    return Response.json({
      success: true,
      leaderboardId: docRef.id,
      leaderboard: { id: docRef.id, ...leaderboard }
    });

  } catch (error) {
    console.error('Error creating leaderboard:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const studioId = searchParams.get('studioId');
    const leaderboardId = searchParams.get('leaderboardId');

    if (!studioId) {
      return Response.json(
        { error: 'Missing studioId parameter' },
        { status: 400 }
      );
    }

    const { db } = await import('@/lib/firebase-admin');
    
    if (leaderboardId) {
      // Get specific leaderboard with entries
      const doc = await db.collection('leaderboards').doc(leaderboardId).get();
      
      if (!doc.exists) {
        return Response.json(
          { error: 'Leaderboard not found' },
          { status: 404 }
        );
      }

      const leaderboard = { id: doc.id, ...doc.data() };
      
      // Get leaderboard entries (top 100)
      const entriesSnapshot = await db.collection('leaderboard_entries')
        .where('leaderboardId', '==', leaderboardId)
        .orderBy('score', 'desc')
        .limit(100)
        .get();

      const entries = entriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return Response.json({
        leaderboard,
        entries,
        totalEntries: entries.length
      });
    } else {
      // Get all leaderboards for studio
      let query = db.collection('leaderboards').where('studioId', '==', studioId);
      
      if (gameId) {
        query = query.where('gameId', '==', gameId);
      }

      const snapshot = await query.get();
      const leaderboards = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return Response.json({
        leaderboards,
        count: leaderboards.length
      });
    }

  } catch (error) {
    console.error('Error fetching leaderboards:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
