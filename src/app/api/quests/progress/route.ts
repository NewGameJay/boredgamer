
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';

interface QuestProgressRequest {
  questId: string;
  playerName: string;
  eventType: string;
  eventData: any;
  studioId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: QuestProgressRequest = await request.json();
    const { questId, playerName, eventType, eventData, studioId } = body;

    if (!questId || !playerName || !eventType || !studioId) {
      return NextResponse.json({ 
        error: 'Missing required fields: questId, playerName, eventType, studioId' 
      }, { status: 400 });
    }

    // Get the quest details
    const questRef = doc(db, 'quests', questId);
    const questDoc = await getDoc(questRef);
    
    if (!questDoc.exists()) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    const quest = { id: questDoc.id, ...questDoc.data() };

    // Check if quest is active and within time bounds
    const now = new Date();
    const questStart = new Date(quest.startDate);
    const questEnd = new Date(quest.endDate);

    if (quest.status !== 'active' || now < questStart || now > questEnd) {
      return NextResponse.json({ 
        error: 'Quest is not currently active',
        questStatus: quest.status,
        questStart: quest.startDate,
        questEnd: quest.endDate
      }, { status: 400 });
    }

    // Get player's current progress for this quest
    const progressRef = collection(db, 'quest_progress');
    const progressQuery = query(
      progressRef,
      where('questId', '==', questId),
      where('playerName', '==', playerName)
    );
    
    const progressSnapshot = await getDocs(progressQuery);
    let currentProgress = progressSnapshot.empty ? 
      { questId, playerName, progress: {}, completed: false, startedAt: now.toISOString() } :
      progressSnapshot.docs[0].data();

    // Evaluate quest conditions against the event
    let progressMade = false;
    const updatedProgress = { ...currentProgress.progress };

    quest.conditions.forEach((condition, index) => {
      if (condition.type === eventType) {
        const conditionKey = `condition_${index}`;
        const currentValue = updatedProgress[conditionKey] || 0;
        
        // Update progress based on condition type
        let newValue = currentValue;
        
        switch (condition.operator) {
          case '>':
          case '>=':
          case '<':
          case '<=':
            // For numerical conditions, add the event value
            newValue += parseFloat(eventData.value || eventData.score || 1);
            break;
          case '==':
            // For equality conditions, check if value matches
            if (eventData.value === condition.value || eventData[condition.type] === condition.value) {
              newValue = parseFloat(condition.value);
            }
            break;
        }

        if (newValue !== currentValue) {
          updatedProgress[conditionKey] = newValue;
          progressMade = true;
        }
      }
    });

    // Check if quest is completed
    const isCompleted = quest.conditions.every((condition, index) => {
      const conditionKey = `condition_${index}`;
      const currentValue = updatedProgress[conditionKey] || 0;
      const targetValue = parseFloat(condition.value);

      switch (condition.operator) {
        case '>': return currentValue > targetValue;
        case '>=': return currentValue >= targetValue;
        case '<': return currentValue < targetValue;
        case '<=': return currentValue <= targetValue;
        case '==': return currentValue === targetValue;
        default: return false;
      }
    });

    // Update progress in database
    if (progressMade || isCompleted) {
      const progressData = {
        ...currentProgress,
        progress: updatedProgress,
        completed: isCompleted,
        lastUpdated: now.toISOString(),
        ...(isCompleted && !currentProgress.completed && { completedAt: now.toISOString() })
      };

      if (progressSnapshot.empty) {
        await addDoc(progressRef, progressData);
      } else {
        await updateDoc(progressSnapshot.docs[0].ref, progressData);
      }

      // If quest just completed, distribute rewards
      if (isCompleted && !currentProgress.completed) {
        await distributeQuestRewards(quest, playerName, studioId);
        
        // Log quest completion event
        await addDoc(collection(db, 'events'), {
          type: 'quest_completed',
          playerName,
          studioId,
          timestamp: now.toISOString(),
          data: {
            questId,
            questName: quest.name,
            rewards: quest.rewards,
            timeTaken: new Date(now).getTime() - new Date(currentProgress.startedAt || now).getTime()
          }
        });
      } else if (progressMade) {
        // Log progress event
        await addDoc(collection(db, 'events'), {
          type: 'quest_progress',
          playerName,
          studioId,
          timestamp: now.toISOString(),
          data: {
            questId,
            questName: quest.name,
            progress: updatedProgress,
            percentComplete: calculateProgressPercentage(quest.conditions, updatedProgress)
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      progressMade,
      completed: isCompleted,
      progress: updatedProgress,
      rewards: isCompleted && !currentProgress.completed ? quest.rewards : null
    });

  } catch (error) {
    console.error('Error processing quest progress:', error);
    return NextResponse.json(
      { error: 'Failed to process quest progress' },
      { status: 500 }
    );
  }
}

async function distributeQuestRewards(quest: any, playerName: string, studioId: string) {
  // Log reward distribution events
  for (const reward of quest.rewards) {
    await addDoc(collection(db, 'events'), {
      type: 'reward_distributed',
      playerName,
      studioId,
      timestamp: new Date().toISOString(),
      data: {
        questId: quest.id,
        questName: quest.name,
        rewardType: reward.type,
        rewardAmount: reward.amount,
        rewardMetadata: reward.metadata || {}
      }
    });
  }
}

function calculateProgressPercentage(conditions: any[], progress: any): number {
  const totalConditions = conditions.length;
  let completedConditions = 0;

  conditions.forEach((condition, index) => {
    const conditionKey = `condition_${index}`;
    const currentValue = progress[conditionKey] || 0;
    const targetValue = parseFloat(condition.value);

    switch (condition.operator) {
      case '>':
      case '>=':
        if (currentValue >= targetValue) completedConditions++;
        break;
      case '<':
      case '<=':
        if (currentValue <= targetValue) completedConditions++;
        break;
      case '==':
        if (currentValue === targetValue) completedConditions++;
        break;
    }
  });

  return (completedConditions / totalConditions) * 100;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const questId = searchParams.get('questId');
  const playerName = searchParams.get('playerName');
  const studioId = searchParams.get('studioId');

  if (!questId || !playerName || !studioId) {
    return NextResponse.json({ 
      error: 'Missing required parameters: questId, playerName, studioId' 
    }, { status: 400 });
  }

  try {
    // Get player's progress for the quest
    const progressRef = collection(db, 'quest_progress');
    const progressQuery = query(
      progressRef,
      where('questId', '==', questId),
      where('playerName', '==', playerName)
    );
    
    const progressSnapshot = await getDocs(progressQuery);
    
    if (progressSnapshot.empty) {
      return NextResponse.json({
        questId,
        playerName,
        progress: {},
        completed: false,
        percentComplete: 0
      });
    }

    const progressData = progressSnapshot.docs[0].data();
    
    // Get quest to calculate percentage
    const questRef = doc(db, 'quests', questId);
    const questDoc = await getDoc(questRef);
    
    if (!questDoc.exists()) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    const quest = questDoc.data();
    const percentComplete = calculateProgressPercentage(quest.conditions, progressData.progress);

    return NextResponse.json({
      ...progressData,
      percentComplete
    });

  } catch (error) {
    console.error('Error fetching quest progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quest progress' },
      { status: 500 }
    );
  }
}
