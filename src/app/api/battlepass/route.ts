
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import admin from '@/lib/firebase-admin';

const db = admin.firestore();

interface BattlePassTier {
  tier: number;
  xpRequired: number;
  freeRewards: Array<{
    type: 'coins' | 'items' | 'cosmetics' | 'experience';
    amount: number;
    metadata?: Record<string, any>;
  }>;
  premiumRewards: Array<{
    type: 'coins' | 'items' | 'cosmetics' | 'experience';
    amount: number;
    metadata?: Record<string, any>;
  }>;
}

interface BattlePass {
  id: string;
  name: string;
  description: string;
  season: number;
  startDate: string;
  endDate: string;
  maxTier: number;
  tiers: BattlePassTier[];
  isActive: boolean;
  premiumPrice: number;
  currency: string;
}

interface PlayerProgress {
  playerId: string;
  battlePassId: string;
  currentTier: number;
  totalXP: number;
  hasPremium: boolean;
  claimedRewards: {
    tier: number;
    type: 'free' | 'premium';
    timestamp: string;
  }[];
  purchaseDate?: string;
}

export async function GET(request: NextRequest) {
  try {
    const headersList = headers();
    const apiKey = headersList.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId');
    const season = url.searchParams.get('season');

    // Get current active battle pass
    let battlePassQuery = db.collection('battlepasses')
      .where('isActive', '==', true);
    
    if (season) {
      battlePassQuery = battlePassQuery.where('season', '==', parseInt(season));
    }

    const battlePassSnapshot = await battlePassQuery.limit(1).get();
    
    if (battlePassSnapshot.empty) {
      return NextResponse.json({ 
        battlePass: null,
        playerProgress: null,
        message: 'No active battle pass found'
      });
    }

    const battlePassDoc = battlePassSnapshot.docs[0];
    const battlePass = { id: battlePassDoc.id, ...battlePassDoc.data() } as BattlePass;

    let playerProgress: PlayerProgress | null = null;
    
    if (playerId) {
      const progressDoc = await db.collection('battlepass_progress')
        .where('playerId', '==', playerId)
        .where('battlePassId', '==', battlePass.id)
        .limit(1)
        .get();

      if (!progressDoc.empty) {
        playerProgress = progressDoc.docs[0].data() as PlayerProgress;
      } else {
        // Create initial progress for new player
        playerProgress = {
          playerId,
          battlePassId: battlePass.id,
          currentTier: 0,
          totalXP: 0,
          hasPremium: false,
          claimedRewards: []
        };

        await db.collection('battlepass_progress').add(playerProgress);
      }
    }

    return NextResponse.json({
      battlePass,
      playerProgress,
      analytics: {
        totalPlayers: await getTotalPlayers(battlePass.id),
        premiumPurchases: await getPremiumPurchases(battlePass.id),
        averageTier: await getAverageTier(battlePass.id)
      }
    });

  } catch (error) {
    console.error('Battle pass fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch battle pass' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const apiKey = headersList.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const body = await request.json();
    const { action, battlePassId, playerId, xpGain, tier, rewardType } = body;

    switch (action) {
      case 'add_xp':
        return await addXP(battlePassId, playerId, xpGain);
      
      case 'claim_reward':
        return await claimReward(battlePassId, playerId, tier, rewardType);
      
      case 'purchase_premium':
        return await purchasePremium(battlePassId, playerId);
      
      case 'create_battlepass':
        return await createBattlePass(body.battlePass);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Battle pass action error:', error);
    return NextResponse.json({ error: 'Failed to process battle pass action' }, { status: 500 });
  }
}

async function addXP(battlePassId: string, playerId: string, xpGain: number) {
  const progressRef = db.collection('battlepass_progress')
    .where('playerId', '==', playerId)
    .where('battlePassId', '==', battlePassId);
  
  const progressSnapshot = await progressRef.get();
  
  if (progressSnapshot.empty) {
    throw new Error('Player progress not found');
  }

  const progressDoc = progressSnapshot.docs[0];
  const currentProgress = progressDoc.data() as PlayerProgress;
  
  // Get battle pass tiers
  const battlePassDoc = await db.collection('battlepasses').doc(battlePassId).get();
  const battlePass = battlePassDoc.data() as BattlePass;
  
  const newTotalXP = currentProgress.totalXP + xpGain;
  let newTier = currentProgress.currentTier;
  
  // Calculate new tier based on XP
  for (let i = currentProgress.currentTier + 1; i <= battlePass.maxTier; i++) {
    const tierData = battlePass.tiers.find(t => t.tier === i);
    if (tierData && newTotalXP >= tierData.xpRequired) {
      newTier = i;
    } else {
      break;
    }
  }

  await progressDoc.ref.update({
    totalXP: newTotalXP,
    currentTier: newTier
  });

  return NextResponse.json({
    success: true,
    xpGained: xpGain,
    totalXP: newTotalXP,
    previousTier: currentProgress.currentTier,
    newTier,
    tierUp: newTier > currentProgress.currentTier
  });
}

async function claimReward(battlePassId: string, playerId: string, tier: number, rewardType: 'free' | 'premium') {
  const progressRef = db.collection('battlepass_progress')
    .where('playerId', '==', playerId)
    .where('battlePassId', '==', battlePassId);
  
  const progressSnapshot = await progressRef.get();
  
  if (progressSnapshot.empty) {
    throw new Error('Player progress not found');
  }

  const progressDoc = progressSnapshot.docs[0];
  const currentProgress = progressDoc.data() as PlayerProgress;

  // Check if player has reached the tier
  if (currentProgress.currentTier < tier) {
    return NextResponse.json({ error: 'Tier not reached' }, { status: 400 });
  }

  // Check if premium reward and player doesn't have premium
  if (rewardType === 'premium' && !currentProgress.hasPremium) {
    return NextResponse.json({ error: 'Premium battle pass required' }, { status: 400 });
  }

  // Check if reward already claimed
  const alreadyClaimed = currentProgress.claimedRewards.some(
    r => r.tier === tier && r.type === rewardType
  );

  if (alreadyClaimed) {
    return NextResponse.json({ error: 'Reward already claimed' }, { status: 400 });
  }

  // Get battle pass and reward details
  const battlePassDoc = await db.collection('battlepasses').doc(battlePassId).get();
  const battlePass = battlePassDoc.data() as BattlePass;
  const tierData = battlePass.tiers.find(t => t.tier === tier);

  if (!tierData) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const rewards = rewardType === 'free' ? tierData.freeRewards : tierData.premiumRewards;

  // Add claimed reward to progress
  const newClaimedReward = {
    tier,
    type: rewardType,
    timestamp: new Date().toISOString()
  };

  await progressDoc.ref.update({
    claimedRewards: [...currentProgress.claimedRewards, newClaimedReward]
  });

  return NextResponse.json({
    success: true,
    rewards,
    tier,
    type: rewardType
  });
}

async function purchasePremium(battlePassId: string, playerId: string) {
  const progressRef = db.collection('battlepass_progress')
    .where('playerId', '==', playerId)
    .where('battlePassId', '==', battlePassId);
  
  const progressSnapshot = await progressRef.get();
  
  if (progressSnapshot.empty) {
    throw new Error('Player progress not found');
  }

  const progressDoc = progressSnapshot.docs[0];
  const currentProgress = progressDoc.data() as PlayerProgress;

  if (currentProgress.hasPremium) {
    return NextResponse.json({ error: 'Premium already purchased' }, { status: 400 });
  }

  await progressDoc.ref.update({
    hasPremium: true,
    purchaseDate: new Date().toISOString()
  });

  return NextResponse.json({
    success: true,
    message: 'Premium battle pass purchased'
  });
}

async function createBattlePass(battlePassData: Omit<BattlePass, 'id'>) {
  // Deactivate current active battle pass
  const activeSnapshot = await db.collection('battlepasses')
    .where('isActive', '==', true)
    .get();

  const batch = db.batch();
  
  activeSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, { isActive: false });
  });

  // Create new battle pass
  const newBattlePassRef = db.collection('battlepasses').doc();
  batch.set(newBattlePassRef, {
    ...battlePassData,
    isActive: true
  });

  await batch.commit();

  return NextResponse.json({
    success: true,
    battlePassId: newBattlePassRef.id,
    message: 'Battle pass created successfully'
  });
}

async function getTotalPlayers(battlePassId: string): Promise<number> {
  const snapshot = await db.collection('battlepass_progress')
    .where('battlePassId', '==', battlePassId)
    .count()
    .get();
  
  return snapshot.data().count;
}

async function getPremiumPurchases(battlePassId: string): Promise<number> {
  const snapshot = await db.collection('battlepass_progress')
    .where('battlePassId', '==', battlePassId)
    .where('hasPremium', '==', true)
    .count()
    .get();
  
  return snapshot.data().count;
}

async function getAverageTier(battlePassId: string): Promise<number> {
  const snapshot = await db.collection('battlepass_progress')
    .where('battlePassId', '==', battlePassId)
    .get();
  
  if (snapshot.empty) return 0;
  
  const totalTiers = snapshot.docs.reduce((sum, doc) => {
    return sum + (doc.data().currentTier || 0);
  }, 0);
  
  return totalTiers / snapshot.docs.length;
}
