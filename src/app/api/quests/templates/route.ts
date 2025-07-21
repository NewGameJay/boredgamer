
import { NextRequest, NextResponse } from 'next/server';

const QUEST_TEMPLATES = {
  daily_login: {
    name: "Daily Login Streak",
    description: "Log in to the game daily to maintain your streak",
    conditions: [
      { type: "login", operator: ">=", value: "1" }
    ],
    rewards: [
      { type: "coins", amount: 100 },
      { type: "experience", amount: 50 }
    ],
    category: "engagement",
    difficulty: "easy",
    estimatedTime: "1 minute"
  },
  score_challenge: {
    name: "Score Master",
    description: "Achieve a high score in any game mode",
    conditions: [
      { type: "score", operator: ">", value: "10000" }
    ],
    rewards: [
      { type: "coins", amount: 500 },
      { type: "achievement", amount: 1, metadata: { achievementId: "score_master" } }
    ],
    category: "skill",
    difficulty: "medium",
    estimatedTime: "30 minutes"
  },
  level_completion: {
    name: "Level Mastery",
    description: "Complete specific levels with excellence",
    conditions: [
      { type: "level_completed", operator: ">=", value: "5" }
    ],
    rewards: [
      { type: "experience", amount: 200 },
      { type: "items", amount: 1, metadata: { itemId: "rare_weapon" } }
    ],
    category: "progression",
    difficulty: "medium",
    estimatedTime: "2 hours"
  },
  collection_quest: {
    name: "Collector's Pride",
    description: "Collect rare items scattered throughout the game",
    conditions: [
      { type: "item_collected", operator: ">=", value: "10" }
    ],
    rewards: [
      { type: "coins", amount: 1000 },
      { type: "items", amount: 1, metadata: { itemId: "collector_badge" } }
    ],
    category: "exploration",
    difficulty: "hard",
    estimatedTime: "5 hours"
  },
  boss_defeat: {
    name: "Boss Slayer",
    description: "Defeat powerful bosses to prove your might",
    conditions: [
      { type: "boss_defeated", operator: ">=", value: "3" }
    ],
    rewards: [
      { type: "experience", amount: 500 },
      { type: "coins", amount: 2000 },
      { type: "achievement", amount: 1, metadata: { achievementId: "boss_slayer" } }
    ],
    category: "combat",
    difficulty: "hard",
    estimatedTime: "3 hours"
  },
  social_quest: {
    name: "Team Player",
    description: "Play and win matches with friends",
    conditions: [
      { type: "multiplayer_win", operator: ">=", value: "5" }
    ],
    rewards: [
      { type: "coins", amount: 750 },
      { type: "social_points", amount: 100 }
    ],
    category: "social",
    difficulty: "medium",
    estimatedTime: "2 hours"
  },
  speed_run: {
    name: "Speed Demon",
    description: "Complete challenges within time limits",
    conditions: [
      { type: "speed_completion", operator: "<=", value: "300" }
    ],
    rewards: [
      { type: "coins", amount: 1500 },
      { type: "achievement", amount: 1, metadata: { achievementId: "speed_demon" } }
    ],
    category: "challenge",
    difficulty: "hard",
    estimatedTime: "1 hour"
  },
  exploration_quest: {
    name: "World Explorer",
    description: "Discover hidden areas and secrets",
    conditions: [
      { type: "area_discovered", operator: ">=", value: "10" }
    ],
    rewards: [
      { type: "experience", amount: 300 },
      { type: "coins", amount: 800 },
      { type: "items", amount: 1, metadata: { itemId: "explorer_compass" } }
    ],
    category: "exploration",
    difficulty: "medium",
    estimatedTime: "4 hours"
  },
  achievement_hunter: {
    name: "Achievement Hunter",
    description: "Unlock multiple achievements across the game",
    conditions: [
      { type: "achievement_unlocked", operator: ">=", value: "15" }
    ],
    rewards: [
      { type: "coins", amount: 2500 },
      { type: "experience", amount: 1000 },
      { type: "achievement", amount: 1, metadata: { achievementId: "achievement_hunter" } }
    ],
    category: "meta",
    difficulty: "very_hard",
    estimatedTime: "10 hours"
  },
  tutorial_completion: {
    name: "Quick Learner",
    description: "Complete the game tutorial and basic training",
    conditions: [
      { type: "tutorial_completed", operator: "==", value: "1" }
    ],
    rewards: [
      { type: "coins", amount: 200 },
      { type: "experience", amount: 100 },
      { type: "items", amount: 1, metadata: { itemId: "starter_pack" } }
    ],
    category: "onboarding",
    difficulty: "easy",
    estimatedTime: "15 minutes"
  }
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const difficulty = searchParams.get('difficulty');

  let templates = { ...QUEST_TEMPLATES };

  // Filter by category if specified
  if (category) {
    templates = Object.fromEntries(
      Object.entries(templates).filter(([_, template]) => template.category === category)
    );
  }

  // Filter by difficulty if specified
  if (difficulty) {
    templates = Object.fromEntries(
      Object.entries(templates).filter(([_, template]) => template.difficulty === difficulty)
    );
  }

  const categorizedTemplates = {
    engagement: [],
    skill: [],
    progression: [],
    exploration: [],
    combat: [],
    social: [],
    challenge: [],
    meta: [],
    onboarding: []
  };

  Object.entries(templates).forEach(([key, template]) => {
    categorizedTemplates[template.category].push({
      id: key,
      ...template
    });
  });

  return NextResponse.json({
    success: true,
    templates: categorizedTemplates,
    total: Object.keys(templates).length,
    categories: Object.keys(categorizedTemplates),
    difficulties: ['easy', 'medium', 'hard', 'very_hard']
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, customizations, studioId } = body;

    if (!templateId || !studioId) {
      return NextResponse.json({ 
        error: 'Template ID and Studio ID are required' 
      }, { status: 400 });
    }

    const template = QUEST_TEMPLATES[templateId];
    if (!template) {
      return NextResponse.json({ 
        error: 'Template not found' 
      }, { status: 404 });
    }

    // Apply customizations to template
    const customizedQuest = {
      ...template,
      ...(customizations || {}),
      templateId,
      studioId,
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    // Apply customizations to conditions if provided
    if (customizations?.conditions) {
      customizedQuest.conditions = customizations.conditions;
    }

    // Apply customizations to rewards if provided
    if (customizations?.rewards) {
      customizedQuest.rewards = customizations.rewards;
    }

    return NextResponse.json({
      success: true,
      quest: customizedQuest,
      message: 'Quest created from template successfully'
    });

  } catch (error) {
    console.error('Error creating quest from template:', error);
    return NextResponse.json(
      { error: 'Failed to create quest from template' },
      { status: 500 }
    );
  }
}
