
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studioId = searchParams.get('studioId');
    const leaderboardId = searchParams.get('leaderboardId');
    const timeframe = searchParams.get('timeframe') || 'all';

    if (!studioId) {
      return NextResponse.json({ error: 'Studio ID required' }, { status: 400 });
    }

    // Calculate date range
    let startDate = null;
    const now = new Date();
    
    switch (timeframe) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    // Build query
    let query = db.collection('leaderboard_entries').where('studioId', '==', studioId);
    
    if (leaderboardId) {
      query = query.where('leaderboardId', '==', leaderboardId);
    }
    
    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }

    const snapshot = await query.get();
    const entries = snapshot.docs.map(doc => doc.data());

    // Calculate analytics
    const totalEntries = entries.length;
    const uniquePlayers = new Set(entries.map(entry => entry.playerName)).size;
    const avgScore = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + (entry.score || 0), 0) / entries.length 
      : 0;

    // Score distribution
    const scoreRanges = [
      { range: '0-100', count: 0 },
      { range: '101-500', count: 0 },
      { range: '501-1000', count: 0 },
      { range: '1001-5000', count: 0 },
      { range: '5000+', count: 0 }
    ];

    entries.forEach(entry => {
      const score = entry.score || 0;
      if (score <= 100) scoreRanges[0].count++;
      else if (score <= 500) scoreRanges[1].count++;
      else if (score <= 1000) scoreRanges[2].count++;
      else if (score <= 5000) scoreRanges[3].count++;
      else scoreRanges[4].count++;
    });

    // Activity over time (daily buckets for last 30 days)
    const activityData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const dayEntries = entries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= date && entryDate < nextDate;
      });

      activityData.push({
        date: date.toISOString().split('T')[0],
        submissions: dayEntries.length,
        uniquePlayers: new Set(dayEntries.map(e => e.playerName)).size
      });
    }

    // Top performers
    const playerScores = new Map();
    entries.forEach(entry => {
      const player = entry.playerName;
      if (!playerScores.has(player) || playerScores.get(player) < entry.score) {
        playerScores.set(player, entry.score);
      }
    });

    const topPerformers = Array.from(playerScores.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([playerName, score], index) => ({
        rank: index + 1,
        playerName,
        score
      }));

    return NextResponse.json({
      analytics: {
        totalEntries,
        uniquePlayers,
        avgScore: Math.round(avgScore),
        scoreDistribution: scoreRanges,
        activityOverTime: activityData,
        topPerformers,
        timeframe
      }
    });

  } catch (error) {
    console.error('Error fetching leaderboard analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
