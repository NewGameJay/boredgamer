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
  const [questTemplates, setQuestTemplates] = useState<any>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
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

  // Load quest templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch('/api/quests/templates');
        const data = await response.json();
        if (data.success) {
          setQuestTemplates(data.templates);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };

    loadTemplates();
  }, []);

  // Load analytics
  const loadAnalytics = async (timeframe = '7d') => {
    if (!user?.id) return;

    setLoadingAnalytics(true);
    try {
      const response = await fetch(`/api/quests/analytics?studioId=${user.id}&timeframe=${timeframe}`);
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive"
      });
    } finally {
      setLoadingAnalytics(false);
    }
  };

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
          <TabsTrigger value="templates">Quest Templates</TabsTrigger>
          <TabsTrigger value="manage">Manage Quests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Quest Templates</CardTitle>
              <CardDescription>Start with pre-built quest templates for common game mechanics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(questTemplates).map(([category, templates]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-lg font-semibold capitalize">{category.replace('_', ' ')} Quests</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(templates as any[]).map((template) => (
                        <Card 
                          key={template.id} 
                          className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary ${
                            selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedTemplate(template.id)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <h4 className="font-semibold text-sm">{template.name}</h4>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  template.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                  template.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  template.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {template.difficulty}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{template.description}</p>
                              <div className="text-xs text-muted-foreground">
                                <div>Est. time: {template.estimatedTime}</div>
                                <div>Rewards: {template.rewards.map(r => r.type).join(', ')}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}

                {selectedTemplate && (
                  <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold">Create Quest from Template</h4>
                      <Button
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/quests/templates', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                templateId: selectedTemplate,
                                studioId: user.id,
                                customizations: {
                                  startDate: new Date().toISOString().slice(0, 16),
                                  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
                                }
                              })
                            });

                            const data = await response.json();
                            if (data.success) {
                              setFormData({
                                ...data.quest,
                                startDate: data.quest.startDate,
                                endDate: data.quest.endDate,
                                isTemplate: false
                              });
                              setActiveTab('create');
                              toast({
                                title: "Template Loaded",
                                description: "Quest template has been loaded. You can now customize and create it.",
                              });
                            }
                          } catch (error) {
                            console.error('Error loading template:', error);
                            toast({
                              title: "Error",
                              description: "Failed to load template",
                              variant: "destructive"
                            });
                          }
                        }}
                      >
                        Use This Template
                      </Button>
                    </div>
                  </div>
                )}
              </div>
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

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Quest Analytics</CardTitle>
              <CardDescription>Track quest performance and player engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <Button 
                    variant={loadingAnalytics ? "secondary" : "default"}
                    onClick={() => loadAnalytics('7d')}
                    disabled={loadingAnalytics}
                  >
                    {loadingAnalytics ? 'Loading...' : 'Last 7 Days'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => loadAnalytics('30d')}
                    disabled={loadingAnalytics}
                  >
                    Last 30 Days
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => loadAnalytics('90d')}
                    disabled={loadingAnalytics}
                  >
                    Last 90 Days
                  </Button>
                </div>

                {analytics && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{analytics.totalQuests}</div>
                        <div className="text-sm text-muted-foreground">Total Quests</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600">{analytics.activeQuests}</div>
                        <div className="text-sm text-muted-foreground">Active Quests</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{analytics.totalCompletions}</div>
                        <div className="text-sm text-muted-foreground">Total Completions</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{analytics.uniquePlayersEngaged}</div>
                        <div className="text-sm text-muted-foreground">Players Engaged</div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {analytics?.questCompletionRate && Object.keys(analytics.questCompletionRate).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Quest Completion Rates</h3>
                    <div className="space-y-2">
                      {Object.entries(analytics.questCompletionRate).map(([questId, data]: [string, any]) => (
                        <div key={questId} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <div className="font-medium">{data.questName}</div>
                            <div className="text-sm text-muted-foreground">
                              {data.completions} completions from {data.attempts} attempts
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{data.rate}%</div>
                            <div className="text-xs text-muted-foreground">completion rate</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analytics?.rewardDistribution && Object.keys(analytics.rewardDistribution).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Reward Distribution</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(analytics.rewardDistribution).map(([rewardType, data]: [string, any]) => (
                        <Card key={rewardType}>
                          <CardContent className="p-4">
                            <div className="text-lg font-bold">{data.total.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground capitalize">{rewardType} distributed</div>
                            <div className="text-xs text-muted-foreground">{data.count} awards</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {analytics?.timeToCompletion && Object.keys(analytics.timeToCompletion).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Average Time to Completion</h3>
                    <div className="space-y-2">
                      {Object.entries(analytics.timeToCompletion).map(([questId, data]: [string, any]) => (
                        <div key={questId} className="flex items-center justify-between p-3 border rounded">
                          <div className="font-medium">{data.questName}</div>
                          <div className="text-right">
                            <div className="text-lg font-bold">{data.averageHours}h</div>
                            <div className="text-xs text-muted-foreground">{data.completions} completions</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                <h3 className="text-lg font-semibold">2. React Integration</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto max-w-3xl whitespace-pre-wrap">
{`import { QuestTracker, BoredGamerSDK } from '@boredgamer/quest-react';

function GameUI() {
  const sdk = new BoredGamerSDK({
    apiKey: 'your-api-key',
    gameId: 'your-game-id',
    userId: 'player-123'
  });

  // Track quest-relevant events
  const handleEnemyKill = (enemyType, score) => {
    sdk.track('ENEMY_KILL', {
      enemyType,
      score,
      timestamp: Date.now()
    });
  };

  const handleLevelComplete = (level, time) => {
    sdk.track('LEVEL_COMPLETE', {
      level,
      completionTime: time,
      score: calculateScore(level, time)
    });
  };

  return (
    <div className="game-ui">
      {/* Your game UI */}
      <div className="hud">
        <QuestTracker
          apiKey="your-api-key"
          gameId="your-game-id"
          userId="player-123"
          options={{
            theme: 'dark',
            position: 'top-right',
            maxQuests: 5,
            showProgress: true,
            autoRefresh: true,
            onQuestComplete: (quest) => {
              showNotification(\`Quest Complete: \${quest.name}\`);
              playSound('quest-complete.mp3');
            },
            onRewardClaim: (reward) => {
              // Handle reward in your game
              if (reward.type === 'in_game') {
                grantItem(reward.itemId, reward.quantity);
              }
            }
          }}
        />
      </div>
    </div>
  );
}`}
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">3. Unity Integration</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto max-w-3xl whitespace-pre-wrap">
{`// QuestManager.cs
using UnityEngine;
using BoredGamer.Quests;

public class QuestManager : MonoBehaviour
{
    [SerializeField] private string apiKey = "your-api-key";
    [SerializeField] private string gameId = "your-game-id";
    [SerializeField] private GameObject questUIPrefab;

    private BoredGamerQuests questSystem;
    private GameObject questUI;

    void Start()
    {
        // Initialize quest system
        questSystem = new BoredGamerQuests(apiKey, gameId);
        questSystem.SetUserId(GetPlayerId());

        // Create quest UI
        questUI = Instantiate(questUIPrefab);
        var questTracker = questUI.GetComponent<QuestTracker>();
        questTracker.Initialize(questSystem);

        // Register event handlers
        questSystem.OnQuestComplete += HandleQuestComplete;
        questSystem.OnRewardAvailable += HandleRewardAvailable;
    }

    // Call this when player kills an enemy
    public void OnEnemyKilled(string enemyType, int score)
    {
        questSystem.TrackEvent("ENEMY_KILL", new {
            enemyType = enemyType,
            score = score,
            position = transform.position,
            timestamp = System.DateTime.UtcNow
        });
    }

    // Call this when player completes a level
    public void OnLevelComplete(int level, float time)
    {
        questSystem.TrackEvent("LEVEL_COMPLETE", new {
            level = level,
            completionTime = time,
            score = CalculateScore(level, time)
        });
    }

    private void HandleQuestComplete(Quest quest)
    {
        // Show completion animation
        ShowQuestCompleteAnimation(quest.name);

        // Play sound
        AudioSource.PlayClipAtPoint(questCompleteSound, Camera.main.transform.position);

        // Update UI
        UpdateQuestUI();
    }

    private void HandleRewardAvailable(QuestReward reward)
    {
        // Grant in-game rewards
        switch (reward.type)
        {
            case "coins":
                PlayerInventory.AddCoins(reward.amount);
                break;
            case "item":
                PlayerInventory.AddItem(reward.itemId, reward.quantity);
                break;
            case "xp":
                PlayerStats.AddExperience(reward.amount);
                break;
        }
    }
}`}
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">4. Unreal Engine Integration</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto max-w-3xl whitespace-pre-wrap">
{`// BoredGamerQuestSystem.h
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameInstanceSubsystem.h"
#include "Http.h"
#include "Json.h"
#include "BoredGamerQuestSystem.generated.h"

USTRUCT(BlueprintType)
struct FQuestData
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString QuestId;

    UPROPERTY(BlueprintReadOnly)
    FString Name;

    UPROPERTY(BlueprintReadOnly)
    FString Description;

    UPROPERTY(BlueprintReadOnly)
    float Progress;

    UPROPERTY(BlueprintReadOnly)
    bool bCompleted;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnQuestComplete, const FQuestData&, Quest);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnRewardGranted, const FString&, RewardType, int32, Amount);

UCLASS()
class YOURGAME_API UBoredGamerQuestSystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UFUNCTION(BlueprintCallable, Category = "BoredGamer")
    void InitializeQuests(const FString& ApiKey, const FString& GameId, const FString& UserId);

    UFUNCTION(BlueprintCallable, Category = "BoredGamer")
    void TrackEvent(const FString& EventType, const TSharedPtr<FJsonObject>& EventData);

    UFUNCTION(BlueprintCallable, Category = "BoredGamer")
    void RefreshQuests();

    UPROPERTY(BlueprintAssignable)
    FOnQuestComplete OnQuestComplete;

    UPROPERTY(BlueprintAssignable)
    FOnRewardGranted OnRewardGranted;

private:
    FString ApiKey;
    FString GameId;
    FString UserId;

    TArray<FQuestData> ActiveQuests;

    void SendEventToAPI(const FString& EventType, const TSharedPtr<FJsonObject>& EventData);
    void HandleQuestResponse(FHttpRequestPtr Request, FHttpResponsePtr Response, bool bSuccess);
    void ProcessQuestUpdate(const TSharedPtr<FJsonObject>& QuestJson);
};

// Usage in Blueprint:
// 1. Get subsystem: Get Game Instance Subsystem (BoredGamer Quest System)
// 2. Initialize: Initialize Quests (API Key, Game ID, User ID)
// 3. Track events: Track Event ("ENEMY_KILL", Event Data)
// 4. Bind to delegates for quest completion notifications`}
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">5. Web/JavaScript Integration</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto max-w-3xl whitespace-pre-wrap">
{`<!-- Include the SDK -->
<script src="https://cdn.boredgamer.com/sdk/boredgamer-sdk.js"></script>

<script>
// Initialize SDK
const sdk = new BoredGamerSDK({
  apiKey: 'your-api-key',
  gameId: 'your-game-id',
  userId: 'player-123'
});

// Load quest tracker widget
sdk.loadQuestTracker('quest-container', {
  theme: 'dark',
  position: 'sidebar',
  showProgress: true,
  onQuestComplete: (quest) => {
    // Show notification
    showToast(\`Quest Complete: \${quest.name}\`);

    // Play sound
    playSound('quest-complete.mp3');

    // Update game state
    if (quest.reward.type === 'coins') {
      addCoins(quest.reward.amount);
    }
  }
});

// Track game events
function onEnemyKilled(enemy) {
  sdk.track('ENEMY_KILL', {
    enemyType: enemy.type,
    level: enemy.level,
    score: enemy.points,
    weapon: player.currentWeapon
  });
}

function onLevelComplete(level, stats) {
  sdk.track('LEVEL_COMPLETE', {
    level: level,
    score: stats.score,
    time: stats.completionTime,
    deaths: stats.deaths,
    accuracy: stats.accuracy
  });
}

// Example game loop integration
gameLoop.on('enemy-killed', onEnemyKilled);
gameLoop.on('level-complete', onLevelComplete);
gameLoop.on('item-collected', (item) => {
  sdk.track('ITEM_COLLECT', {
    itemType: item.type,
    value: item.value,
    location: item.position
  });
});
</script>

<!-- Quest UI Container -->
<div id="quest-container"></div>`}
                </pre>
              </div>

              <div className="mt-6 p-4 bg-blue-500/10 rounded-lg">
                <h4 className="text-blue-400 font-medium mb-2">Integration Tips</h4>
                <ul className="text-sm text-slate-300 space-y-2">
                  <li>• Call track() immediately when events happen in your game</li>
                  <li>• Quest progress updates automatically based on tracked events</li>
                  <li>• Use meaningful event names that match your quest conditions</li>
                  <li>• Include relevant metadata (location, difficulty, etc.) in events</li>
                  <li>• Handle quest completion and rewards in your game's reward system</li>
                  <li>• Test with debug mode enabled to see event flow</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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