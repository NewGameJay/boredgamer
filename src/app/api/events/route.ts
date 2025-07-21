import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { app } from '@/lib/firebase';

const db = getFirestore(app);

interface GameEvent {
  gameId: string;
  studioId: string;
  userId: string;
  type: string;
  data: any;
  timestamp?: any;
  metadata?: {
    sdkVersion?: string;
    platform?: string;
    sessionId?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const event: GameEvent = await request.json();

    // Validate required fields
    if (!event.gameId || !event.studioId || !event.userId || !event.type) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: gameId, studioId, userId, type' 
      }, { status: 400 });
    }

    // Add timestamp and processing metadata
    const eventData = {
      ...event,
      timestamp: serverTimestamp(),
      processed: false,
      receivedAt: new Date().toISOString(),
      metadata: {
        sdkVersion: '1.0.0',
        platform: 'web',
        ...event.metadata
      }
    };

    // Store event in Firestore
    const eventsRef = collection(db, 'events');
    const docRef = await addDoc(eventsRef, eventData);

    // Process event for quests, leaderboards, etc.
    await processEventForCampaigns(eventData);

    return NextResponse.json({ 
      success: true, 
      eventId: docRef.id,
      timestamp: eventData.receivedAt
    });

  } catch (error) {
    console.error('Error storing event:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to store event' 
    }, { status: 500 });
  }
}

async function processEventForCampaigns(event: GameEvent) {
  try {
    // Find relevant campaigns (quests, leaderboards, etc.)
    const campaignsRef = collection(db, 'campaigns');
    const q = query(
      campaignsRef, 
      where('gameId', '==', event.gameId),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);

    for (const doc of snapshot.docs) {
      const campaign = doc.data();

      switch (campaign.type) {
        case 'quest':
          await processQuestEvent(doc.id, campaign, event);
          break;
        case 'leaderboard':
          await processLeaderboardEvent(doc.id, campaign, event);
          break;
        case 'tournament':
          await processTournamentEvent(doc.id, campaign, event);
          break;
        case 'battlepass':
          await processBattlePassEvent(doc.id, campaign, event);
          break;
      }
    }
  } catch (error) {
    console.error('Error processing event for campaigns:', error);
  }
}

async function processQuestEvent(campaignId: string, campaign: any, event: GameEvent) {
  // Check if event matches quest conditions
  const conditions = campaign.conditions || [];

  for (const condition of conditions) {
    if (condition.eventType === event.type) {
      // Update quest progress
      await updateQuestProgress(campaignId, event.userId, condition, event.data);
    }
  }
}

async function processLeaderboardEvent(campaignId: string, campaign: any, event: GameEvent) {
  const scoringConfig = campaign.scoringMetadata;

  if (scoringConfig && scoringConfig.eventType === event.type) {
    const score = extractScoreFromEvent(event.data, scoringConfig);
    if (score !== null) {
      await updateLeaderboardScore(campaignId, event.userId, score);
    }
  }
}

async function processTournamentEvent(campaignId: string, campaign: any, event: GameEvent) {
  // Similar to leaderboard but with tournament-specific logic
  await processLeaderboardEvent(campaignId, campaign, event);
}

async function processBattlePassEvent(campaignId: string, campaign: any, event: GameEvent) {
  const xpSources = campaign.xpSources || [];

  for (const source of xpSources) {
    if (source.eventType === event.type) {
      const xp = calculateXP(event.data, source);
      if (xp > 0) {
        await updateBattlePassXP(campaignId, event.userId, xp);
      }
    }
  }
}

async function updateQuestProgress(campaignId: string, userId: string, condition: any, eventData: any) {
  // Implementation for quest progress tracking
  // This would update the user_progress collection
}

async function updateLeaderboardScore(campaignId: string, userId: string, score: number) {
  // Implementation for leaderboard score updates
  // This would update the leaderboard_entries collection
}

async function updateBattlePassXP(campaignId: string, userId: string, xp: number) {
  // Implementation for battle pass XP updates
  // This would update the battlepass_progress collection
}

function extractScoreFromEvent(data: any, config: any): number | null {
  try {
    const value = config.dataField.split('.').reduce((obj: any, key: string) => obj?.[key], data);
    return typeof value === 'number' ? value : null;
  } catch {
    return null;
  }
}

function calculateXP(data: any, source: any): number {
  const baseValue = source.field ? 
    source.field.split('.').reduce((obj: any, key: string) => obj?.[key], data) : 1;

  return (typeof baseValue === 'number' ? baseValue : 1) * source.xpValue;
}