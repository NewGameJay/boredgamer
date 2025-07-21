
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import admin from '@/lib/firebase-admin';

const db = admin.firestore();

interface XPSource {
  activity: string;
  baseXP: number;
  multiplier?: number;
  dailyLimit?: number;
  cooldown?: number; // minutes
}

const XP_SOURCES: Record<string, XPSource> = {
  'match_completion': { activity: 'Match Completion', baseXP: 100 },
  'match_win': { activity: 'Match Victory', baseXP: 200 },
  'kill': { activity: 'Elimination', baseXP: 25, dailyLimit: 1000 },
  'objective_completed': { activity: 'Objective Complete', baseXP: 150 },
  'daily_login': { activity: 'Daily Login', baseXP: 50, cooldown: 1440 }, // 24 hours
  'quest_completed': { activity: 'Quest Completed', baseXP: 300 },
  'achievement_unlocked': { activity: 'Achievement Unlocked', baseXP: 500 },
  'weekly_challenge': { activity: 'Weekly Challenge', baseXP: 1000, cooldown: 10080 }, // 1 week
  'tournament_participation': { activity: 'Tournament Entry', baseXP: 400 },
  'tournament_win': { activity: 'Tournament Victory', baseXP: 2000 },
  'social_share': { activity: 'Social Share', baseXP: 75, dailyLimit: 300 },
  'friend_referral': { activity: 'Friend Referral', baseXP: 800 },
  'premium_boost': { activity: 'Premium XP Boost', baseXP: 0, multiplier: 1.5 }
};

export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const apiKey = headersList.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      playerId, 
      activity, 
      metadata = {},
      skipLimits = false,
      customXP 
    } = body;

    if (!playerId || !activity) {
      return NextResponse.json({ 
        error: 'playerId and activity are required' 
      }, { status: 400 });
    }

    const xpSource = XP_SOURCES[activity];
    if (!xpSource && !customXP) {
      return NextResponse.json({ 
        error: 'Invalid activity type' 
      }, { status: 400 });
    }

    // Get current active battle pass
    const battlePassSnapshot = await db.collection('battlepasses')
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (battlePassSnapshot.empty) {
      return NextResponse.json({ 
        error: 'No active battle pass found' 
      }, { status: 404 });
    }

    const battlePass = battlePassSnapshot.docs[0];
    const battlePassId = battlePass.id;

    // Get player progress
    const progressSnapshot = await db.collection('battlepass_progress')
      .where('playerId', '==', playerId)
      .where('battlePassId', '==', battlePassId)
      .limit(1)
      .get();

    let playerProgress;
    let progressRef;

    if (progressSnapshot.empty) {
      // Create new progress
      progressRef = db.collection('battlepass_progress').doc();
      playerProgress = {
        playerId,
        battlePassId,
        currentTier: 0,
        totalXP: 0,
        hasPremium: false,
        claimedRewards: []
      };
      await progressRef.set(playerProgress);
    } else {
      progressRef = progressSnapshot.docs[0].ref;
      playerProgress = progressSnapshot.docs[0].data();
    }

    // Check cooldowns and limits if not skipped
    if (!skipLimits && xpSource) {
      const limitCheck = await checkXPLimits(playerId, activity, xpSource);
      if (!limitCheck.allowed) {
        return NextResponse.json({
          success: false,
          error: limitCheck.reason,
          nextAvailable: limitCheck.nextAvailable
        });
      }
    }

    // Calculate XP gain
    let xpGain = customXP || xpSource?.baseXP || 0;
    
    // Apply multipliers
    if (playerProgress.hasPremium && xpSource?.multiplier) {
      xpGain = Math.floor(xpGain * xpSource.multiplier);
    }

    // Apply any event multipliers from metadata
    if (metadata.eventMultiplier) {
      xpGain = Math.floor(xpGain * metadata.eventMultiplier);
    }

    // Record XP gain
    await recordXPGain(playerId, activity, xpGain, metadata);

    // Update player progress
    const newTotalXP = playerProgress.totalXP + xpGain;
    const battlePassData = battlePass.data();
    let newTier = playerProgress.currentTier;

    // Calculate tier progression
    for (let i = playerProgress.currentTier + 1; i <= battlePassData.maxTier; i++) {
      const tierData = battlePassData.tiers.find((t: any) => t.tier === i);
      if (tierData && newTotalXP >= tierData.xpRequired) {
        newTier = i;
      } else {
        break;
      }
    }

    await progressRef.update({
      totalXP: newTotalXP,
      currentTier: newTier
    });

    // Calculate XP needed for next tier
    let xpToNextTier = 0;
    if (newTier < battlePassData.maxTier) {
      const nextTierData = battlePassData.tiers.find((t: any) => t.tier === newTier + 1);
      if (nextTierData) {
        xpToNextTier = nextTierData.xpRequired - newTotalXP;
      }
    }

    return NextResponse.json({
      success: true,
      xpGained: xpGain,
      totalXP: newTotalXP,
      previousTier: playerProgress.currentTier,
      currentTier: newTier,
      tierUp: newTier > playerProgress.currentTier,
      xpToNextTier,
      activity: xpSource?.activity || activity,
      hasPremium: playerProgress.hasPremium
    });

  } catch (error) {
    console.error('XP grant error:', error);
    return NextResponse.json({ error: 'Failed to grant XP' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId');
    const timeframe = url.searchParams.get('timeframe') || '7d';

    if (!playerId) {
      return NextResponse.json({ error: 'playerId required' }, { status: 400 });
    }

    // Get XP history
    const timeframeDays = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    const xpHistorySnapshot = await db.collection('xp_history')
      .where('playerId', '==', playerId)
      .where('timestamp', '>=', startDate.toISOString())
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const xpHistory = xpHistorySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate daily totals
    const dailyTotals: Record<string, number> = {};
    xpHistory.forEach(record => {
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      dailyTotals[date] = (dailyTotals[date] || 0) + record.xpGained;
    });

    // Get activity breakdown
    const activityBreakdown: Record<string, { count: number; totalXP: number }> = {};
    xpHistory.forEach(record => {
      if (!activityBreakdown[record.activity]) {
        activityBreakdown[record.activity] = { count: 0, totalXP: 0 };
      }
      activityBreakdown[record.activity].count++;
      activityBreakdown[record.activity].totalXP += record.xpGained;
    });

    return NextResponse.json({
      xpHistory,
      dailyTotals,
      activityBreakdown,
      totalXP: Object.values(dailyTotals).reduce((sum, xp) => sum + xp, 0),
      availableActivities: Object.keys(XP_SOURCES).map(key => ({
        id: key,
        ...XP_SOURCES[key]
      }))
    });

  } catch (error) {
    console.error('XP history fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch XP history' }, { status: 500 });
  }
}

async function checkXPLimits(playerId: string, activity: string, xpSource: XPSource) {
  const now = new Date();
  
  // Check cooldown
  if (xpSource.cooldown) {
    const cooldownStart = new Date(now.getTime() - (xpSource.cooldown * 60 * 1000));
    
    const recentActivity = await db.collection('xp_history')
      .where('playerId', '==', playerId)
      .where('activity', '==', activity)
      .where('timestamp', '>=', cooldownStart.toISOString())
      .limit(1)
      .get();

    if (!recentActivity.empty) {
      const lastActivity = new Date(recentActivity.docs[0].data().timestamp);
      const nextAvailable = new Date(lastActivity.getTime() + (xpSource.cooldown * 60 * 1000));
      
      return {
        allowed: false,
        reason: 'Activity on cooldown',
        nextAvailable: nextAvailable.toISOString()
      };
    }
  }

  // Check daily limit
  if (xpSource.dailyLimit) {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    
    const todaySnapshot = await db.collection('xp_history')
      .where('playerId', '==', playerId)
      .where('activity', '==', activity)
      .where('timestamp', '>=', dayStart.toISOString())
      .get();

    const todayXP = todaySnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().xpGained || 0);
    }, 0);

    if (todayXP >= xpSource.dailyLimit) {
      const tomorrow = new Date(dayStart);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      return {
        allowed: false,
        reason: 'Daily limit reached',
        nextAvailable: tomorrow.toISOString()
      };
    }
  }

  return { allowed: true };
}

async function recordXPGain(playerId: string, activity: string, xpGained: number, metadata: any) {
  await db.collection('xp_history').add({
    playerId,
    activity,
    xpGained,
    metadata,
    timestamp: new Date().toISOString()
  });
}
