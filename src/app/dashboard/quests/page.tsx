'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy, limit, onSnapshot, addDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import '@/app/dashboard/quests/quests.css';

interface QuestCondition {
  type: string;      // e.g., 'score', 'time', 'collection', 'achievement'
  operator: string;  // e.g., '>', '<', '=', 'contains'
  value: string;
  metadata?: Record<string, any>;
}

interface Quest {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  conditions: QuestCondition[];
  rewards: {
    type: string;
    amount: number;
    metadata?: Record<string, any>;
  }[];
  chainId?: string;  // For linked quests
  templateId?: string;  // For quest templates
  status: 'draft' | 'active' | 'completed' | 'archived';
  studioId: string;
  createdAt: string;
}

interface FormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  conditions: QuestCondition[];
  rewards: {
    type: string;
    amount: number;
    metadata?: Record<string, any>;
  }[];
  isTemplate: boolean;
  chainId?: string;
}

export default function QuestDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [manageTab, setManageTab] = useState('live');
  const [expandedQuest, setExpandedQuest] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [playerProgress, setPlayerProgress] = useState<Record<string, number>>({});
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: ''
  });
  const [activeTab, setActiveTab] = useState('create');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    conditions: [{ type: 'score', operator: '>', value: '' }],
    rewards: [{ type: 'points', amount: 0 }],
    isTemplate: false
  });
  const { toast } = useToast();

  // Filtered and sorted quests based on date
  const filteredQuests = useMemo(() => {
    const now = new Date();
    console.log('Current time:', now.toISOString());
    
    // First filter quests based on tab
    const filtered = quests.filter(quest => {
      const startDate = new Date(quest.startDate);
      const endDate = new Date(quest.endDate);
      
      console.log('Quest:', quest.name);
      console.log('Start date:', startDate.toISOString());
      console.log('End date:', endDate.toISOString());
      console.log('Current tab:', manageTab);

      // Convert dates to UTC to handle timezone consistently
      const questStart = startDate.getTime();
      const questEnd = endDate.getTime();
      const currentTime = now.getTime();

      switch (manageTab) {
        case 'previous':
          return questEnd < currentTime;
        case 'live':
          return questStart <= currentTime && questEnd >= currentTime;
        case 'upcoming':
          return questStart > currentTime;
        default:
          return true;
      }
    });

    // Then sort based on dates
    return filtered.sort((a, b) => {
      const aStart = new Date(a.startDate).getTime();
      const bStart = new Date(b.startDate).getTime();
      
      switch (manageTab) {
        case 'previous':
          // Sort by end date, most recent first
          return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
        case 'live':
          // Sort by end date, soonest ending first
          return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        case 'upcoming':
          // Sort by start date, soonest starting first
          return aStart - bStart;
        default:
          return 0;
      }
    });
  }, [quests, manageTab]);

  useEffect(() => {
    if (!user?.id) return;

    const questsRef = collection(db, 'quests');
    const q = query(
      questsRef, 
      where('studioId', '==', user.id)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const questsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure dates are in correct format
          startDate: data.startDate,
          endDate: data.endDate
        };
      }) as Quest[];
      console.log('Loaded quests:', questsData);
      setQuests(questsData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      console.error('No user found');
      return;
    }

    try {
      // Create a new quest document
      const questData: Omit<Quest, 'id'> = {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        conditions: formData.conditions.map(condition => ({
          type: condition.type,
          operator: condition.operator,
          value: condition.value,
          metadata: {}
        })),
        rewards: formData.rewards.map(reward => ({
          type: reward.type,
          amount: reward.amount,
          metadata: {}
        })),
        status: 'active',
        studioId: user.id,
        createdAt: new Date().toISOString(),
        ...(formData.isTemplate && { templateId: `template_${Date.now()}` }),
        ...(formData.chainId && { chainId: formData.chainId })
      };

      // Add to Firestore
      const questRef = collection(db, 'quests');
      await addDoc(questRef, questData);

      // Reset form
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        conditions: [{ type: 'score', operator: '>', value: '' }],
        rewards: [{ type: 'points', amount: 0 }],
        isTemplate: false
      });

      // Show success message
      toast({
        title: "Quest Created",
        description: "Your quest has been successfully created.",
        variant: "default"
      });

      // Switch to manage tab
      setActiveTab('manage');
    } catch (error) {
      console.error('Error creating quest:', error);
      toast({
        title: "Error",
        description: "Failed to create quest. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleConditionChange = (index: number, field: string, value: string) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = { ...formData.conditions[index], [field]: value };
    setFormData({ ...formData, conditions: newConditions });
  };

  const handleRewardChange = (index: number, field: string, value: string | number) => {
    const newRewards = [...formData.rewards];
    newRewards[index] = { ...formData.rewards[index], [field]: value };
    setFormData({ ...formData, rewards: newRewards });
  };

  const fetchPlayerProgress = async (questId: string, playerName: string) => {
    if (!playerName) return;

    const quest = quests.find(q => q.id === questId);
    if (!quest) return;

    // Get events for this player and quest
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('type', '==', quest.conditions[0].type),
      where('playerName', '==', playerName),
      where('timestamp', '>=', quest.startDate),
      where('timestamp', '<=', quest.endDate)
    );

    try {
      const snapshot = await getDocs(q);
      let totalProgress = 0;
      snapshot.forEach(doc => {
        const event = doc.data();
        totalProgress += event.data.score || 0;
      });

      setPlayerProgress(prev => ({
        ...prev,
        [questId]: totalProgress
      }));
    } catch (error) {
      console.error('Error fetching player progress:', error);
      toast({
        title: "Error",
        description: "Failed to fetch player progress",
        variant: "destructive"
      });
    }
  };

  // Quest management functions
  const handleUpdateQuest = async (questId: string, updates: Partial<Quest>) => {
    try {
      const questRef = doc(db, 'quests', questId);
      await setDoc(questRef, updates, { merge: true });
      toast({
        title: "Success",
        description: "Quest updated successfully",
      });
    } catch (error) {
      console.error('Error updating quest:', error);
      toast({
        title: "Error",
        description: "Failed to update quest",
        variant: "destructive"
      });
    }
  };

  const handleDeleteQuest = async (questId: string) => {
    try {
      await deleteDoc(doc(db, 'quests', questId));
      toast({
        title: "Success",
        description: "Quest deleted successfully",
      });
      setIsConfirmingDelete(false);
    } catch (error) {
      console.error('Error deleting quest:', error);
      toast({
        title: "Error",
        description: "Failed to delete quest",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Quest Dashboard</h1>
      <Tabs defaultValue="create" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">Create Quest</TabsTrigger>
          <TabsTrigger value="manage">Manage Quests</TabsTrigger>
          <TabsTrigger value="setup">Component Plugin</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Quest</CardTitle>
              <CardDescription>Define your quest parameters and conditions</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <div className="grid gap-4">
                    <div>
                      <label className="block mb-2">Quest Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input w-full"
                        placeholder="Enter quest name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="input w-full h-24"
                        placeholder="Describe the quest objectives and rewards"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Timing */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Quest Timing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2">Start Date</label>
                      <input
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="input w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block mb-2">End Date</label>
                      <input
                        type="datetime-local"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="input w-full"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Conditions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Quest Conditions</h3>
                  {formData.conditions.map((condition, index) => (
                    <div key={index} className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block mb-2">Tracked Metadata / Event</label>
                        <input
                          type="text"
                          placeholder="e.g., score, achievement, collection"
                          value={condition.type}
                          onChange={(e) => handleConditionChange(index, 'type', e.target.value)}
                          className="input w-full"
                        />
                      </div>
                      <div>
                        <label className="block mb-2">Operator</label>
                        <select
                          value={condition.operator}
                          onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
                          className="select w-full"
                        >
                          <option value=">">Greater than</option>
                          <option value=">=">Greater than or equal</option>
                          <option value="<">Less than</option>
                          <option value="<=">Less than or equal</option>
                          <option value="==">Equal to</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2">Value</label>
                        <input
                          type="text"
                          value={condition.value}
                          onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                          className="input w-full"
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        conditions: [...formData.conditions, { type: 'score', operator: '>', value: '' }]
                      });
                    }}
                  >
                    Add Condition
                  </Button>
                </div>

                {/* Rewards */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Quest Rewards</h3>
                  {formData.rewards.map((reward, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block mb-2">Reward Type</label>
                        <input
                          type="text"
                          placeholder="e.g., points, currency, item"
                          value={reward.type}
                          onChange={(e) => handleRewardChange(index, 'type', e.target.value)}
                          className="input w-full"
                        />
                      </div>
                      <div>
                        <label className="block mb-2">Amount</label>
                        <input
                          type="number"
                          value={reward.amount}
                          onChange={(e) => handleRewardChange(index, 'amount', parseInt(e.target.value))}
                          className="input w-full"
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        rewards: [...formData.rewards, { type: 'points', amount: 0 }]
                      });
                    }}
                  >
                    Add Reward
                  </Button>
                </div>

                {/* Template Option */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isTemplate}
                      onChange={(e) => setFormData({ ...formData, isTemplate: e.target.checked })}
                      className="checkbox"
                    />
                    <label>Save as Template</label>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                  <Button
                    type="submit"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Create Quest
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardContent>
              <Tabs value={manageTab} onValueChange={setManageTab}>
                <TabsList>
                  <TabsTrigger value="previous" className="px-6">Previous</TabsTrigger>
                  <TabsTrigger value="live" className="px-6">Live</TabsTrigger>
                  <TabsTrigger value="upcoming" className="px-6">Upcoming</TabsTrigger>
                </TabsList>

                {['previous', 'live', 'upcoming'].map((tab) => (
                  <TabsContent key={tab} value={tab}>
                    <div className="grid grid-cols-1 gap-3 mt-4">
                      {filteredQuests.map((quest) => (
                        <Card 
                          key={quest.id} 
                          className={`overflow-hidden transition-all duration-200 ${
                            expandedQuest === quest.id ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-muted-foreground/20'
                          }`}
                        >
                          <div 
                            className={`p-4 cursor-pointer transition-colors duration-200 quest-card ${
                              expandedQuest === quest.id ? 'bg-muted/50' : 'hover:bg-muted/30'
                            }`}
                            onClick={() => setExpandedQuest(expandedQuest === quest.id ? null : quest.id)}
                          >
                            <div className="grid grid-cols-5 gap-6 items-center text-sm">
                              <div className="space-y-1.5" style={{ display: 'flex', flexDirection: 'row', alignItems: 'end', gap: '1rem' }}>
                                <div className="font-semibold tracking-tight" style={{ fontSize: '20px', marginBottom: '0px' }}>{quest.name}</div>
                                <div className="text-xs text-muted-foreground line-clamp-1">{quest.description}</div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                              <div className="text-center space-y-1" style={{ display: 'flex', flexDirection: 'row' }}>
                                <div>{format(new Date(quest.startDate), 'MMMM d h:mm a')}</div>
                                <div style={{ margin: '0 1rem' }}>-</div>
                                <div>{format(new Date(quest.endDate), 'MMMM d h:mm a')}</div>

                              </div>
                              <div className="text-center space-y-1" style={{ display: 'flex', flexDirection: 'row' }}>
                                <div className="text-xs text-muted-foreground" style={{ margin: '0 .5rem' }}>Status:</div>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  quest.status === 'active' ? 'text-green-600 font-semibold' : 
                                  quest.status === 'completed' ? 'text-blue-600' : 
                                  'text-gray-600'
                                }`}>
                                  {quest.status === 'active' ? 'Active' : quest.status}
                                </span>
                              </div>
                              <div className="text-center space-y-1" style={{ display: 'flex', flexDirection: 'row' }}>
                                <div className="text-xs text-muted-foreground" style={{ margin: '0 .5rem' }}>Time Left:</div>
                                <div className="text-xs">
                                  {formatDistanceToNow(new Date(quest.endDate), { addSuffix: false })}
                                </div>
                              </div>
                              </div>
                            </div>
                          </div>

                          {expandedQuest === quest.id && (
                            <div className="px-4 pb-4 border-t bg-muted/30">
                              <div className="pt-4 space-y-4">
                                <div className="flex justify-between items-center mb-4" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', padding: '0 1rem .5rem 1rem' }}>
                                <div className="flex gap-4">
                                  <div className="flex-1">
                                    <label className="text-sm font-medium mb-2 block text-muted-foreground">
                                      Check Player Status
                                    </label>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        placeholder="Enter player name"
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                      />
                                      <Button 
                                        variant="secondary"
                                        style={{ marginLeft: '0.5rem' }}
                                        size="sm"
                                        onClick={() => fetchPlayerProgress(quest.id, playerName)}
                                      >
                                        Check
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                  <div className="flex gap-2" style={{ display: 'flex', alignItems: 'end' }}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedQuest(quest);
                                        setEditForm({
                                          ...editForm,
                                          startDate: quest.startDate,
                                          endDate: quest.endDate
                                        });
                                        setIsEditingDates(true);
                                      }}
                                    >
                                      Change Dates
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedQuest(quest);
                                        setEditForm({
                                          ...editForm,
                                          name: quest.name,
                                          description: quest.description
                                        });
                                        setIsEditingDetails(true);
                                      }}
                                      style={{ marginLeft: '0.5rem', marginRight: '0.5rem' }}
                                    >
                                      Edit Details
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedQuest(quest);
                                        setEditForm({ ...editForm, status: quest.status });
                                        setIsEditingStatus(true);
                                      }}
                                      style={{ marginRight: '0.5rem' }}
                                    >
                                      Change Status
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedQuest(quest);
                                        setIsConfirmingDelete(true);
                                      }}
                                    >
                                      Delete Quest
                                    </Button>
                                  </div>
                                </div>

                                {playerProgress[quest.id] !== undefined && (
                                  <div className="space-y-2 bg-background rounded-lg p-4 shadow-sm">
                                    <div className="flex justify-between text-sm">
                                      <span className="font-medium">Progress</span>
                                      <span className="text-muted-foreground">
                                        {playerProgress[quest.id]}/{quest.conditions[0].value}
                                      </span>
                                    </div>
                                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-primary transition-all duration-500 rounded-full"
                                        style={{ 
                                          width: `${Math.min(100, (playerProgress[quest.id] / parseInt(quest.conditions[0].value)) * 100)}%`
                                        }}
                                      />
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                      Target: {quest.conditions[0].value} {quest.conditions[0].type}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                    {filteredQuests.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No {tab} quests found
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup">
          <Card style={{ maxWidth: '1020px' }}>
            <CardHeader>
              <CardTitle>Quest Component Plugin</CardTitle>
              <CardDescription>Drop-in quest component for your game</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6" style={{ maxWidth: '1050px' }}>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">1. Install the Package</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto max-w-3xl">
                  npm install @boredgamer/quest-react # For React
                  npm install @boredgamer/quest-vue  # For Vue
                  npm install @boredgamer/quest-web  # For vanilla JS
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">2. Import and Use the Component</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto max-w-3xl whitespace-pre-wrap">
                  {`// React Example
import { QuestTracker } from '@boredgamer/quest-react';

function GameUI() {
  // Callback function for handling rewards
  const handleQuestReward = async (questId, reward) => {
    // Game-specific reward distribution logic
    await gameSystem.awardCurrency(reward.amount);
    // Or trigger achievement
    await gameSystem.unlockAchievement(reward.achievementId);
    // Or grant items
    await gameSystem.grantItems(reward.items);
  };

  // Track game events for quest progress
  const trackGameEvent = async (event) => {
    // Events are automatically tracked and matched to quest conditions
    await questTracker.trackEvent({
      type: event.type,           // e.g., 'kill_monster', 'complete_level'
      data: {
        score: event.score,
        playerName: event.playerName,
        metadata: {
          level: event.level,
          difficulty: event.difficulty,
          // Any other event-specific data
        }
      }
    });
  };

  // Example: Track event when player defeats a boss
  const onBossDefeated = async (bossData) => {
    await trackGameEvent({
      type: 'boss_defeated',
      score: bossData.score,
      playerName: currentPlayer.name,
      metadata: {
        bossId: bossData.id,
        timeToDefeat: bossData.time
      }
    });
  };

  return (
    <QuestTracker
      apiKey="your-api-key"
      gameId="your-game-id"
      options={{
        theme: 'dark',           // 'dark' or 'light'
        layout: 'sidebar',       // 'sidebar', 'overlay', or 'minimal'
        showProgress: true,      // Show progress bars
        showRewards: true,       // Show quest rewards
        showTimer: true,         // Show countdown for timed quests
        autoTrack: true,         // Automatically track quest progress
      }}
      onQuestComplete={handleQuestReward}  // Reward callback
      onEventTracked={(event) => {
        console.log('Event tracked:', event);
        // Optional: Additional game-specific logic when events are tracked
      }}
    />
  );
}`}
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">3. Configure Reward Types</h3>
                <p className="text-sm text-muted-foreground">
                  When creating quests, specify reward types that match your game's economy:
                </p>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto max-w-3xl whitespace-pre-wrap">
                  {`// Example reward configurations
{
  "rewards": {
    "currency": {
      "amount": 1000,
      "type": "gold"  // Your game's currency type
    },
    "items": [
      {
        "id": "rare_sword",
        "quantity": 1
      }
    ],
    "achievements": [
      "master_explorer"
    ]
  }
}`}
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">4. Cross-Game Progress Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  For quests that span multiple games, our SDK tracks progress across all integrated games:
                </p>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto max-w-3xl whitespace-pre-wrap">
                  {`// Progress is automatically synced
const questProgress = {
  "questId": "cross_game_quest",
  "progress": {
    "game1": { /* progress in game 1 */ },
    "game2": { /* progress in game 2 */ },
    "totalProgress": 75  // Combined progress
  }
}`}
                </pre>
                <p className="text-sm text-muted-foreground mt-2">
                  When a cross-game quest is completed, the reward callback is triggered in the game where the final progress was made.
                  Each game handles its own reward distribution while our system tracks the overall completion.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={isEditingDates} onOpenChange={setIsEditingDates}>
        <DialogContent className="sm:max-w-[400px] quest-modal">
          <DialogHeader className="pb-4">
            <DialogTitle>Change Quest Dates</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={editForm.startDate}
                onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={editForm.endDate}
                onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditingDates(false)}>Cancel</Button>
            <Button onClick={() => {
              if (selectedQuest) {
                handleUpdateQuest(selectedQuest.id, {
                  startDate: editForm.startDate,
                  endDate: editForm.endDate
                });
                setIsEditingDates(false);
              }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditingDetails} onOpenChange={setIsEditingDetails}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="pb-4">
            <DialogTitle>Edit Quest Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="name">Quest Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditingDetails(false)}>Cancel</Button>
            <Button onClick={() => {
              if (selectedQuest) {
                handleUpdateQuest(selectedQuest.id, {
                  name: editForm.name,
                  description: editForm.description
                });
                setIsEditingDetails(false);
              }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditingStatus} onOpenChange={setIsEditingStatus}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="pb-4">
            <DialogTitle>Change Quest Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditingStatus(false)}>Cancel</Button>
            <Button onClick={() => {
              if (selectedQuest) {
                handleUpdateQuest(selectedQuest.id, {
                  status: editForm.status as Quest['status']
                });
                setIsEditingStatus(false);
              }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="pb-4">
            <DialogTitle>Delete Quest</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this quest? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsConfirmingDelete(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedQuest && handleDeleteQuest(selectedQuest.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
