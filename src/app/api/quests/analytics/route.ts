
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studioId = searchParams.get('studioId');
  const questId = searchParams.get('questId');
  const timeframe = searchParams.get('timeframe') || '7d'; // 7d, 30d, 90d

  if (!studioId) {
    return NextResponse.json({ error: 'Studio ID is required' }, { status: 400 });
  }

  try {
    const now = new Date();
    const daysAgo = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

    // Get quest analytics
    const questsRef = collection(db, 'quests');
    let questQuery = query(
      questsRef,
      where('studioId', '==', studioId)
    );

    if (questId) {
      questQuery = query(questQuery, where('id', '==', questId));
    }

    const questSnapshot = await getDocs(questQuery);
    const quests = questSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get quest completion events
    const eventsRef = collection(db, 'events');
    const completionQuery = query(
      eventsRef,
      where('type', '==', 'quest_completed'),
      where('studioId', '==', studioId),
      where('timestamp', '>=', startDate.toISOString()),
      orderBy('timestamp', 'desc')
    );

    const completionSnapshot = await getDocs(completionQuery);
    const completions = completionSnapshot.docs.map(doc => doc.data());

    // Get quest progress events
    const progressQuery = query(
      eventsRef,
      where('type', '==', 'quest_progress'),
      where('studioId', '==', studioId),
      where('timestamp', '>=', startDate.toISOString())
    );

    const progressSnapshot = await getDocs(progressQuery);
    const progressEvents = progressSnapshot.docs.map(doc => doc.data());

    // Calculate analytics
    const analytics = {
      totalQuests: quests.length,
      activeQuests: quests.filter(q => q.status === 'active').length,
      completedQuests: quests.filter(q => q.status === 'completed').length,
      totalCompletions: completions.length,
      uniquePlayersEngaged: new Set(progressEvents.map(e => e.playerName)).size,
      questCompletionRate: {},
      popularQuests: {},
      playerEngagement: {},
      timeToCompletion: {},
      rewardDistribution: {}
    };

    // Calculate completion rates per quest
    quests.forEach(quest => {
      const questCompletions = completions.filter(c => c.data?.questId === quest.id);
      const questProgress = progressEvents.filter(p => p.data?.questId === quest.id);
      const uniqueAttempts = new Set(questProgress.map(p => p.playerName)).size;
      
      analytics.questCompletionRate[quest.id] = {
        questName: quest.name,
        attempts: uniqueAttempts,
        completions: questCompletions.length,
        rate: uniqueAttempts > 0 ? (questCompletions.length / uniqueAttempts * 100).toFixed(2) : 0
      };

      analytics.popularQuests[quest.id] = {
        questName: quest.name,
        engagement: uniqueAttempts,
        completions: questCompletions.length
      };

      // Calculate average time to completion
      const completionTimes = questCompletions.map(completion => {
        const progressForPlayer = questProgress.filter(p => 
          p.playerName === completion.playerName && 
          p.data?.questId === quest.id
        );
        
        if (progressForPlayer.length > 0) {
          const startTime = new Date(progressForPlayer[0].timestamp).getTime();
          const endTime = new Date(completion.timestamp).getTime();
          return (endTime - startTime) / (1000 * 60 * 60); // hours
        }
        return null;
      }).filter(time => time !== null);

      if (completionTimes.length > 0) {
        analytics.timeToCompletion[quest.id] = {
          questName: quest.name,
          averageHours: (completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length).toFixed(2),
          completions: completionTimes.length
        };
      }
    });

    // Calculate reward distribution
    const rewardEvents = completions.filter(c => c.data?.rewards);
    rewardEvents.forEach(event => {
      event.data.rewards.forEach(reward => {
        if (!analytics.rewardDistribution[reward.type]) {
          analytics.rewardDistribution[reward.type] = { total: 0, count: 0 };
        }
        analytics.rewardDistribution[reward.type].total += reward.amount;
        analytics.rewardDistribution[reward.type].count += 1;
      });
    });

    return NextResponse.json({
      success: true,
      analytics,
      timeframe,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching quest analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quest analytics' },
      { status: 500 }
    );
  }
}
