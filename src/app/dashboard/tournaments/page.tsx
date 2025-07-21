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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy, limit, onSnapshot, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import '@/app/dashboard/tournaments/tournaments.css';
import '@/app/dashboard/quests/quests.css';
import BracketVisualization from '@/components/tournaments/BracketVisualization';

interface Studio {
  id: string;
  uid: string;
  name: string;
  // Add other studio properties as needed
}

interface User {
  uid: string;
  email?: string;
  displayName?: string;
}

interface TournamentRule {
  type: string;      // e.g., 'elimination', 'round-robin', 'swiss'
  rounds: number;
  playersPerMatch: number;
  advancementCriteria?: {
    type: string;    // e.g., 'top_n', 'score_threshold'
    value: number;
  };
}

interface Tournament {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  rules: TournamentRule[];
  prizes: {
    rank: number;
    reward: {
      type: string;
      amount: number;
      metadata?: Record<string, any>;
    };
  }[];
  status: 'draft' | 'registration' | 'active' | 'completed' | 'archived';
  studioId: string;
  createdAt: string;
  maxParticipants: number;
  currentParticipants: number;
  gameMode?: string;
  region?: string;
}

interface FormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  rules: TournamentRule[];
  prizes: {
    rank: number;
    reward: {
      type: string;
      amount: number;
      metadata?: Record<string, any>;
    };
  }[];
  maxParticipants: number;
  gameMode: string;
  region: string;
  isTemplate: boolean;
  formula: string;
  variables: string;
  scoreCalculation: string;
  rewards: {
    type: string;
    amount: number;
    metadata?: Record<string, any>;
  }[];
}

export default function TournamentDashboard() {
  const router = useRouter();
  const { user } = useAuth() as { user: Studio | null };
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('create');
  const [manageTab, setManageTab] = useState('edit');
  const [fields, setFields] = useState<Array<{ id: string; value: string; required: boolean }>>([{ id: '1', value: '', required: false }]);
  const [customPointsEnabled, setCustomPointsEnabled] = useState(false);

  const addField = () => {
    setFields([...fields, { id: Date.now().toString(), value: '', required: false }]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const toggleRequired = (id: string) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, required: !field.required } : field
    ));
  };

  const handleRewardChange = (index: number, field: string, value: string | number) => {
    const newRewards = [...formData.rewards];
    newRewards[index] = { ...formData.rewards[index], [field]: value };
    setFormData({ ...formData, rewards: newRewards });
  };

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    rules: [{ type: 'elimination', rounds: 1, playersPerMatch: 2 }],
    prizes: [{ rank: 1, reward: { type: 'points', amount: 1000 } }],
    maxParticipants: 32,
    gameMode: 'standard',
    region: 'global',
    isTemplate: false,
    formula: '',
    variables: '',
    scoreCalculation: 'highest',
    rewards: [{ type: 'points', amount: 0 }]
  });
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
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
  const { toast } = useToast();

  // Filtered and sorted tournaments based on date
  const filteredTournaments = useMemo(() => {
    if (!tournaments) return [];

    const now = new Date();
    return tournaments.filter(tournament => {
      const startDate = new Date(tournament.startDate);
      const endDate = new Date(tournament.endDate);

      switch (manageTab) {
        case 'edit':
          // Show all tournaments for editing
          return true;
        case 'live':
          // Show only active tournaments
          return tournament.status === 'active';
        default:
          return true;
      }
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [tournaments, manageTab]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Subscribe to tournaments collection for the current studio
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'tournaments'),
        where('studioId', '==', user.id), // Only fetch tournaments for this studio
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        const tournamentData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Tournament[];
        console.log('Fetched tournaments:', tournamentData); // Debug log
        setTournaments(tournamentData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching tournaments:', error);
        setLoading(false);
        toast({
          title: "Error",
          description: "Failed to load tournaments",
          variant: "destructive",
        });
      }
    );

    return () => unsubscribe();
  }, [user, router]);

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-4xl font-bold mb-8">Tournament Dashboard</h1>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a tournament.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create tournament document
      console.log('Creating tournament with user:', user);

      const tournamentData = {
        ...formData,
        status: 'draft',
        studioId: user.id, // Use id as studioId since they're the same
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: [],
        scores: [],
        metadataFields: fields.map(field => ({
          name: field.value,
          required: field.required
        })),
        scoreType: customPointsEnabled ? 'custom' : 'standard'
      };

      // Log the data being sent to verify it's correct
      console.log('Tournament data being submitted:', tournamentData);

      // Add to Firestore
      const tournamentsRef = collection(db, 'tournaments');
      await addDoc(tournamentsRef, tournamentData);

      // Reset form
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        rules: [],
        prizes: [],
        maxParticipants: 32,
        gameMode: 'standard',
        region: 'global',
        isTemplate: false,
        formula: '',
        variables: '',
        scoreCalculation: 'highest',
        rewards: [{ type: 'points', amount: 0 }]
      });

      toast({
        title: "Success",
        description: "Tournament created successfully!",
      });

      // Switch to manage tab to show the new tournament
      setActiveTab('manage');
    } catch (error: any) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Error",
        description: "Failed to create tournament. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTournament = async (tournamentId: string, updates: Partial<Tournament>) => {
    try {
      const tournamentRef = doc(db, 'tournaments', tournamentId);
      await setDoc(tournamentRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast({
        title: "Success",
        description: "Tournament updated successfully!",
      });
    } catch (error: any) {
      console.error('Error updating tournament:', error);
      toast({
        title: "Error",
        description: "Failed to update tournament. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    try {
      await deleteDoc(doc(db, 'tournaments', tournamentId));
      toast({
        title: "Success",
        description: "Tournament deleted successfully!",
      });
      setIsConfirmingDelete(false);
    } catch (error: any) {
      console.error('Error deleting tournament:', error);
      toast({
        title: "Error",
        description: "Failed to delete tournament. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Tournament Dashboard</h1>
      <Tabs defaultValue="create" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">Create Tournament</TabsTrigger>
          <TabsTrigger value="manage">Manage Tournaments</TabsTrigger>
          <TabsTrigger value="setup">Component Plugin</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Tournament</CardTitle>
              <CardDescription>Set up a new tournament for your game</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Tournament Name</Label>
                    <input
                      id="name"
                      type="text"
                      className="input w-full"
                      placeholder="Enter tournament name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <input
                      id="description"
                      type="text"
                      className="input w-full h-40"
                      placeholder="Enter tournament description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <input
                      id="startDate"
                      type="datetime-local"
                      className="input w-full"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <input
                      id="endDate"
                      type="datetime-local"
                      className="input w-full"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                      <h3 className="text-lg font-semibold mb-4">Score Settings</h3>
                      <div className="space-y-4">
                      <div className="grid gap-2">
                      <label>Metadata Fields Included in Leaderboard (Can be required for score submission)</label>
                      <div className="space-y-4">
                        <div style={{ gap: "40px"}}>
                            {fields.map((field) => (
                              <div key={field.id} style={{ marginBottom: "15px"}} >
                                <input 
                                  style={{ width: "30%" }} 
                                  type="text" 
                                  placeholder="Event Identifier (Ex. SCORE, KILLS, etc.)" 
                                  className="input"
                                  value={field.value}
                                  onChange={(e) => {
                                    setFields(fields.map(f => 
                                      f.id === field.id ? { ...f, value: e.target.value } : f
                                    ));
                                  }}
                                  required
                                />
                                <Button 
                                  style={{ width: "15%", height: "33.5px", margin: "0 20px", backgroundColor: "transparent", color: "white" }} 
                                  variant="ghost" 
                                  onClick={() => toggleRequired(field.id)}
                                  className={`requiredButton ${field.required ? 'required' : 'not-required'}`}
                                  type="button"
                                >
                                  {field.required ? 'Required' : 'Optional'}
                                </Button>
                                <Button 
                                  style={{ width: "15%", height: "33.5px" }} 
                                  variant="ghost" 
                                  onClick={() => removeField(field.id)}
                                  className="removeButton"
                                  type="button"
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          <Button 
                            className="addButton"
                            variant="ghost"
                            onClick={addField}
                            type="button"
                          >
                            + Add Field
                          </Button>
                        </div>
                      </div>
                    </div>
                        <div style={{ marginTop: "20px" }} className="grid gap-2">
                          <div className="flex items-start justify-start w-full">
                            <label>Score Type</label>
                            <Tabs 
                              defaultValue="true-metadata" 
                              className="w-[200px]"
                              value={customPointsEnabled ? "custom-score" : "true-metadata"}
                              onValueChange={(value) => setCustomPointsEnabled(value === "custom-score")}
                            >
                              <TabsList style={{ height: "30px", padding: "0px", margin: "10px 0px" }}>
                                <TabsTrigger style={{ display: "flex", justifyContent: "center" }} value="true-metadata">True Metadata</TabsTrigger>
                                <TabsTrigger style={{ display: "flex", justifyContent: "center" }} value="custom-score">Custom Score</TabsTrigger>
                              </TabsList>
                            </Tabs>
                          </div>
                          <div className="pl-6 space-y-2">
                            <input 
                              type="text" 
                              placeholder="Formula (e.g., kills * 100 + score)" 
                              className="input" 
                              value={formData.formula}
                              onChange={(e) => setFormData({...formData, formula: e.target.value})}
                              disabled={!customPointsEnabled}
                            />
                            <input 
                              type="text" 
                              placeholder="Variables (e.g., kills, score)" 
                              className="input" 
                              value={formData.variables}
                              onChange={(e) => setFormData({...formData, variables: e.target.value})}
                              disabled={!customPointsEnabled}
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <label>Score Calculation (Descending)</label>
                          <select 
                            className="select"
                            value={formData.scoreCalculation}
                            onChange={(e) => setFormData({...formData, scoreCalculation: e.target.value})}
                          >
                            <option value="highest">Highest</option>
                            <option value="lowest">Lowest</option>
                            <option value="sum">Sum</option>
                            <option value="avg">Average</option>
                          </select>
                        </div>
                      </div>
                    </div>


                  <div className="grid gap-2">
                    <Label htmlFor="maxParticipants">Max Participants</Label>
                    <input
                      id="maxParticipants"
                      type="number"
                      min="2"
                      className="input w-full"
                      placeholder="Enter maximum participants"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="region">Region</Label>
                    <input
                      id="region"
                      type="text"
                      className="input w-full"
                      placeholder="Enter region"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      required
                    />
                  </div>

                  {/* Access Control */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Access Control</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2">Access Type</label>
                      <select
                        value={formData.accessType || 'public'}
                        onChange={(e) => setFormData({ ...formData, accessType: e.target.value as any })}
                        className="input w-full"
                      >
                        <option value="public">Public (Anyone can join)</option>
                        <option value="community_gated">Community Gated</option>
                        <option value="premium_only">Premium Only</option>
                      </select>
                    </div>
                    {formData.accessType === 'community_gated' && (
                      <div>
                        <label className="block mb-2">Required Community</label>
                        <select
                          value={formData.requiredCommunity || ''}
                          onChange={(e) => setFormData({ ...formData, requiredCommunity: e.target.value })}
                          className="input w-full"
                        >
                          <option value="">Select Community</option>
                          <option value="guild_warriors">Guild Warriors</option>
                          <option value="pro_gamers">Pro Gamers</option>
                          <option value="speedrunners">Speedrunners</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.requiresVerification || false}
                      onChange={(e) => setFormData({ ...formData, requiresVerification: e.target.checked })}
                      className="checkbox"
                    />
                    <label>Require Identity Verification</label>
                  </div>
                </div>

                                  {/* Placement Rewards */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Placement Rewards</h3>
                  {formData.prizes.map((prize, index) => (
                    <div key={index} className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block mb-2">Placement</label>
                        <select
                          value={prize.rank}
                          onChange={(e) => {
                            const newPrizes = [...formData.prizes];
                            newPrizes[index] = { ...prize, rank: parseInt(e.target.value) };
                            setFormData({ ...formData, prizes: newPrizes });
                          }}
                          className="select w-full"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rank) => (
                            <option key={rank} value={rank}>{rank}{rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'} Place</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2">Reward Type</label>
                        <input
                          type="text"
                          placeholder="e.g., points, currency, item"
                          value={prize.reward.type}
                          onChange={(e) => {
                            const newPrizes = [...formData.prizes];
                            newPrizes[index] = { ...prize, reward: { ...prize.reward, type: e.target.value } };
                            setFormData({ ...formData, prizes: newPrizes });
                          }}
                          className="input w-full"
                        />
                      </div>
                      <div>
                        <label className="block mb-2">Amount</label>
                        <input
                          type="number"
                          value={prize.reward.amount}
                          onChange={(e) => {
                            const newPrizes = [...formData.prizes];
                            newPrizes[index] = { ...prize, reward: { ...prize.reward, amount: parseInt(e.target.value) } };
                            setFormData({ ...formData, prizes: newPrizes });
                          }}
                          className="input w-full"
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    onClick={() => {
                      const nextRank = formData.prizes.length + 1;
                      setFormData({
                        ...formData,
                        prizes: [...formData.prizes, { rank: nextRank, reward: { type: 'points', amount: 0 } }]
                      });
                    }}
                  >
                    Add Placement Reward
                  </Button>
                </div>
                </div>

                <Button type="submit">Create Tournament</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardContent>
              <Tabs value={manageTab} onValueChange={setManageTab}>
                <TabsList>
                  <TabsTrigger value="edit">Edit Tournaments</TabsTrigger>
                  <TabsTrigger value="live">Live View</TabsTrigger>
                  <TabsTrigger value="brackets">Brackets</TabsTrigger>
                </TabsList>

                {['edit', 'live', 'brackets'].map((tab) => (
                  <TabsContent key={tab} value={tab}>
                    <div className="grid grid-cols-1 gap-3 mt-4">
                      {filteredTournaments.map((tournament) => (
                        <Card 
                          key={tournament.id} 
                          className={`overflow-hidden transition-all duration-200 ${
                            expandedTournament === tournament.id ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-muted-foreground/20'
                          }`}
                        >
                          <div 
                            className={`p-4 cursor-pointer transition-colors duration-200 tournament-card ${
                              expandedTournament === tournament.id ? 'bg-muted/50' : 'hover:bg-muted/30'
                            }`}
                            onClick={() => setExpandedTournament(expandedTournament === tournament.id ? null : tournament.id)}
                          >
                            <div className="grid grid-cols-5 gap-6 items-center text-sm">
                              <div className="space-y-1.5" style={{ display: 'flex', flexDirection: 'row', alignItems: 'end', gap: '1rem' }}>
                                <div className="font-semibold tracking-tight" style={{ fontSize: '20px', marginBottom: '0px' }}>{tournament.name}</div>
                                <div className="text-xs text-muted-foreground line-clamp-1">{tournament.description}</div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div className="text-center space-y-1" style={{ display: 'flex', flexDirection: 'row' }}>
                                  <div>{format(new Date(tournament.startDate), 'MMMM d h:mm a')}</div>
                                  <div style={{ margin: '0 1rem' }}>-</div>
                                  <div>{format(new Date(tournament.endDate), 'MMMM d h:mm a')}</div>
                                </div>
                                <div className="text-center space-y-1" style={{ display: 'flex', flexDirection: 'row' }}>
                                  <div className="text-xs text-muted-foreground" style={{ margin: '0 .5rem' }}>Status:</div>
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    tournament.status === 'active' ? 'text-green-600 font-semibold' : 
                                    tournament.status === 'completed' ? 'text-blue-600' : 
                                    'text-gray-600'
                                  }`}>
                                    {tournament.status === 'active' ? 'Active' : tournament.status}
                                  </span>
                                </div>
                                <div className="text-center space-y-1" style={{ display: 'flex', flexDirection: 'row' }}>
                                  <div className="text-xs text-muted-foreground" style={{ margin: '0 .5rem' }}>Time Left:</div>
                                  <div className="text-xs">
                                    {formatDistanceToNow(new Date(tournament.endDate), { addSuffix: false })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {expandedTournament === tournament.id && (
                            <div className="px-4 pb-4 border-t bg-muted/30">
                              <div className="pt-4 space-y-4">
                                <div className="flex justify-between items-center mb-4" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', padding: '0 1rem .5rem 1rem' }}>
                                  <div className="flex gap-4">
                                    <div className="flex-1">
                                      <label className="text-sm font-medium mb-2 block text-muted-foreground">
                                        Tournament Details
                                      </label>
                                      <div className="space-y-2">
                                        <div>Participants: {tournament.currentParticipants}/{tournament.maxParticipants}</div>
                                        <div>Game Mode: {tournament.gameMode}</div>
                                        <div>Region: {tournament.region}</div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2" style={{ display: 'flex', alignItems: 'end' }}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedTournament(tournament);
                                        setEditForm({
                                          ...editForm,
                                          startDate: tournament.startDate,
                                          endDate: tournament.endDate
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
                                        setSelectedTournament(tournament);
                                        setEditForm({
                                          ...editForm,
                                          name: tournament.name,
                                          description: tournament.description
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
                                        setSelectedTournament(tournament);
                                        setEditForm({ ...editForm, status: tournament.status });
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
                                        setSelectedTournament(tournament);
                                        setIsConfirmingDelete(true);
                                      }}
                                    >
                                      Delete Tournament
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                ))}

                <TabsContent value="brackets">
                  <div className="space-y-6">
                    {filteredTournaments
                      .filter(t => t.status === 'active' || t.status === 'completed')
                      .map((tournament) => (
                      <Card key={tournament.id}>
                        <CardHeader>
                          <CardTitle>{tournament.name} - Tournament Brackets</CardTitle>
                          <CardDescription>
                            {tournament.currentParticipants} participants • Status: {tournament.status}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <BracketVisualization tournament={tournament} />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup">
          <Card style={{ maxWidth: '1020px' }}>
            <CardHeader>
              <CardTitle>Tournament Component Plugin</CardTitle>
              <CardDescription>
                Add tournament functionality to your game
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-4">
                  <h3 className="mb-2 text-sm font-medium">Installation</h3>
                  <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                    npm install @boredgamer/tournaments
                  </code>
                </div>

                <div className="rounded-md bg-muted p-4">
                  <h3 className="mb-2 text-sm font-medium">Usage</h3>
                  <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                    import &#123; TournamentManager &#125; from &apos;@boredgamer/tournaments&apos;;
                  </code>
                </div>

                <div className="rounded-md bg-muted p-4">
                  <h3 className="mb-2 text-sm font-medium">Example</h3>
                  <pre className="text-sm">
                    <code>
                      {`const tournament = new TournamentManager({
  apiKey: 'your-api-key',
  gameId: 'your-game-id'
});

// Get active tournaments
const activeTournaments = await tournament.getActive();

// Register player for tournament
await tournament.registerPlayer({
  tournamentId: 'tournament-id',
  playerId: 'player-id'
});

// Submit match results
await tournament.submitResults({
  tournamentId: 'tournament-id',
  matchId: 'match-id',
  results: {
    winner: 'player-id',
    score: 100
  }
});`}
                    </code>
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={isEditingDates} onOpenChange={setIsEditingDates}>
        <DialogContent className="sm:max-w-[400px] tournament-modal">
          <DialogHeader className="pb-4">
            <DialogTitle>Change Tournament Dates</DialogTitle>
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
            <Button onClick={() => {```python
              if (selectedTournament) {
                handleUpdateTournament(selectedTournament.id, {
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
        <DialogContent className="sm:max-w-[400px] tournament-modal">
          <DialogHeader className="pb-4">
            <DialogTitle>Edit Tournament Details</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="name">Tournament Name</Label>
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
              if (selectedTournament) {
                handleUpdateTournament(selectedTournament.id, {
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
        <DialogContent className="sm:max-w-[400px] tournament-modal">
          <DialogHeader className="pb-4">
            <DialogTitle>Change Tournament Status</DialogTitle>
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
                <option value="draft">Draft</option>
                <option value="registration">Registration</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditingStatus(false)}>Cancel</Button>
            <Button onClick={() => {
              if (selectedTournament) {
                handleUpdateTournament(selectedTournament.id, {
                  status: editForm.status as Tournament['status']
                });
                setIsEditingStatus(false);
              }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
        <DialogContent className="sm:max-w-[400px] tournament-modal">
          <DialogHeader className="pb-4">
            <DialogTitle>Delete Tournament</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this tournament? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsConfirmingDelete(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedTournament && handleDeleteTournament(selectedTournament.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}