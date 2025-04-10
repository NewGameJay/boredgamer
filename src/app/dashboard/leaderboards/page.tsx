'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface MetadataField {
  name: string;
  required: boolean;
}

interface Leaderboard {
  id: string;
  name: string;
  startDate: string;
  displayTime: string;
  scoreCalculation: string;
  studioId: string;
  createdAt: string;
  variables: string[];
  formula: string;
  metadataFields: MetadataField[];
  scoreType: 'custom' | 'standard';
}

interface FormData {
  name: string;
  startDate: string;
  endDate: string;
  displayTime: string;
  formula: string;
  variables: string;
  scoreCalculation: string;
  maxUser: number;
  highestUser: number;
}

interface EventData {
  [key: string]: any;
  score?: number;
  playerName?: string;
}

interface Event {
  id: string;
  type: string;
  timestamp: any;
  data: EventData;
}

export default function LeaderboardDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('setup');
  const [customPointsEnabled, setCustomPointsEnabled] = useState(false);
  const [fields, setFields] = useState([{ id: 1, value: '', required: false }]);
  const [lengthType, setLengthType] = useState('rolling');
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [stats, setStats] = useState({
    totalEntries: 0,
    uniquePlayers: 0,
    todaySubmissions: 0,
    avgScore: 0
  });
  const [formData, setFormData] = useState<FormData>({
    name: '',
    startDate: '',
    endDate: '',
    displayTime: 'daily',
    formula: '',
    variables: '',
    scoreCalculation: 'highest',
    maxUser: 1000,
    highestUser: 1
  });
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<string>('');

  const [eventLogs, setEventLogs] = useState<Event[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [eventFilter, setEventFilter] = useState('');
  const [filterType, setFilterType] = useState<'type' | 'gameId' | 'all'>('all');

  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

  // Redirect if not authenticated
  if (!user) {
    router.push('/login');
    return null;
  }

  // Fetch leaderboards
  useEffect(() => {
    const fetchLeaderboards = async () => {
      if (!user) return;
      
      try {
        const leaderboardsRef = collection(db, 'Leaderboards');
        const snapshot = await getDocs(leaderboardsRef);
        const leaderboardsData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Leaderboard))
          .filter(board => board.studioId === user.id);
        setLeaderboards(leaderboardsData);
      } catch (error) {
        console.error('Error fetching leaderboards:', error);
      }
    };

    fetchLeaderboards();
  }, [user]);

  useEffect(() => {
    if (!user) {
      console.log('No user found');
      return;
    }
    console.log('Fetching events for user:', user.id);

    const q = query(
      collection(db, 'events'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    console.log('Query created:', q);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Got snapshot with size:', snapshot.size);
      const events = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Event data:', data);
        return {
          id: doc.id,
          type: data.type || 'unknown',
          timestamp: data.timestamp,
          data: data
        } as Event;
      });
      console.log('Processed events:', events);
      setEventLogs(events);
    }, (error) => {
      console.error('Error in snapshot listener:', error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    setFilteredEvents(eventLogs);
  }, [eventLogs]);

  const addField = () => {
    setFields([...fields, { id: Date.now(), value: '', required: false }]);
  };

  const removeField = (id: number) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const toggleRequired = (id: number) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, required: !field.required } : field
    ));
  };

  const handleDelete = async (leaderboardId: string) => {
    if (!confirm('Are you sure you want to delete this leaderboard?')) return;
    
    try {
      await deleteDoc(doc(db, 'Leaderboards', leaderboardId));
      setLeaderboards(prev => prev.filter(board => board.id !== leaderboardId));
      alert('Leaderboard deleted successfully');
    } catch (error) {
      console.error('Error deleting leaderboard:', error);
      alert('Error deleting leaderboard');
    }
  };

  const handleEdit = (leaderboardId: string) => {
    // TODO: Implement edit functionality
    console.log('Edit leaderboard:', leaderboardId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('You must be logged in to create a leaderboard');
      return;
    }

    try {
      // Validate required fields
      if (!formData.name || !formData.startDate || fields.length === 0 || fields.some(f => !f.value)) {
        alert('Please fill in all required fields');
        return;
      }

      const leaderboardData = {
        ...formData,
        name: formData.name.replace(/\s+/g, '-').toLowerCase(),
        metadataFields: fields.map(field => ({
          name: field.value,
          required: field.required
        })),
        scoreType: customPointsEnabled ? 'custom' : 'standard',
        lengthType,
        ...(customPointsEnabled && {
          formula: formData.formula,
          variables: formData.variables
        }),
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        studioId: user.id
      };

      // Additional validation for custom score type
      if (customPointsEnabled && (!formData.formula || !formData.variables)) {
        alert('Please fill in formula and variables for custom score type');
        return;
      }

      const leaderboardsRef = collection(db, 'Leaderboards');
      await setDoc(doc(leaderboardsRef, leaderboardData.name), leaderboardData);
      
      // Reset form
      setFormData({
        name: '',
        startDate: '',
        endDate: '',
        displayTime: 'daily',
        formula: '',
        variables: '',
        scoreCalculation: 'highest',
        maxUser: 1000,
        highestUser: 1
      });
      setFields([{ id: 1, value: '', required: false }]);
      setCustomPointsEnabled(false);
      setLengthType('rolling');
      
      alert('Leaderboard created successfully!');
    } catch (error) {
      console.error('Error creating leaderboard:', error);
      alert('Error creating leaderboard. Please try again.');
    }
  };

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Leaderboard Dashboard</h1>
      
      <Tabs defaultValue="manage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manage">Manage Leaderboards</TabsTrigger>
          <TabsTrigger value="preview">Live View</TabsTrigger>
          <TabsTrigger value="setup">Component Plugin</TabsTrigger>
        </TabsList>

        {/* Setup Guide */}
        <TabsContent value="setup" style={{ maxWidth: "1050px" }}>
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard Component Plugin</CardTitle>
              <CardDescription>Drop-in leaderboard component for your game</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">1. Install the Package</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto max-w-3xl">
                  npm install @boredgamer/leaderboard-react # For React
                  npm install @boredgamer/leaderboard-vue  # For Vue
                  npm install @boredgamer/leaderboard-web  # For vanilla JS
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">2. Import and Use the Component</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto max-w-3xl whitespace-pre-wrap">
                  {`// React Example
import { Leaderboard } from '@boredgamer/leaderboard-react';

function GameUI() {
  return (
    <Leaderboard
      apiKey="your-api-key"
      gameId="your-game-id"
      leaderboardId="high-score"
      options={{
        theme: 'dark',          // 'dark' or 'light'
        layout: 'vertical',     // 'vertical' or 'horizontal'
        limit: 10,             // Number of entries to show
        refreshInterval: 5000,  // Real-time updates every 5 seconds
        
        // Display Options
        showRank: true,        // Show position numbers
        showPlayerName: true,  // Show player names
        showScore: true,      // Show score values
        showAvatar: true,     // Show player avatars
        showMetadata: true,   // Show additional score metadata
        showTimestamp: true,  // Show when score was achieved
        showProgress: true,   // Show progress bars for scores
        showDelta: true,      // Show position changes (+1, -2)
        
        // Column Order (left to right)
        columnOrder: [
          'rank',
          'avatar',
          'name',
          'score',
          'metadata',
          'timestamp'
        ],
        
        // Format Options
        scoreFormat: 'number',  // 'number', 'time', or 'currency'
        dateFormat: 'relative', // 'relative' or 'absolute'
        
        customStyles: {
          background: '#1a1a1a',
          textColor: '#ffffff',
          accentColor: '#3b82f6',
          rankColor: '#9ca3af',
          scoreColor: '#10b981',
          deltaUpColor: '#22c55e',
          deltaDownColor: '#ef4444'
        }
      }}
    />
  );
}`}
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">3. Customize Events (Optional)</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto max-w-3xl">
                  {`// Handle events
<Leaderboard
  onScoreUpdate={(entry) => {
    console.log('New high score:', entry);
  }}
  onPlayerClick={(player) => {
    showPlayerProfile(player);
  }}
  onRankChange={(oldRank, newRank) => {
    playAnimation(oldRank, newRank);
  }}
/>`}
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">4. API-Only Integration</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto max-w-3xl">
                  {`// If you prefer to use the API directly
import { LeaderboardAPI } from '@boredgamer/leaderboard-api';

const api = new LeaderboardAPI({
  apiKey: 'your-api-key',
  gameId: 'your-game-id'
});

// Fetch leaderboard data
const scores = await api.getScores({
  leaderboardId: 'high-score',
  limit: 10
});

// Subscribe to real-time updates
api.subscribe('high-score', (update) => {
  updateUI(update);
});`}
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">5. Unreal Engine Integration</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto max-w-3xl">
                  {`// In your Unreal project, create a new C++ class that inherits from UUserWidget
UCLASS()
class MYGAME_API ULeaderboardWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    // Initialize the leaderboard with your credentials
    UFUNCTION(BlueprintCallable, Category = "Boredgamer")
    void InitializeLeaderboard(FString ApiKey, FString GameId);
    
    // Fetch and update leaderboard data
    UFUNCTION(BlueprintCallable, Category = "Boredgamer")
    void UpdateLeaderboard();
    
    // Submit a new score
    UFUNCTION(BlueprintCallable, Category = "Boredgamer")
    void SubmitScore(float Score, FString PlayerName);
    
    // Bind to score updates
    UFUNCTION(BlueprintImplementableEvent, Category = "Boredgamer")
    void OnLeaderboardUpdated(const TArray<FLeaderboardEntry>& Entries);

private:
    // HTTP module for API requests
    FHttpModule* Http;
    
    // WebSocket for real-time updates
    FWebSocketsModule* WebSocket;
};

// Implementation
void ULeaderboardWidget::InitializeLeaderboard(FString ApiKey, FString GameId)
{
    // Initialize HTTP client with authentication
    Http = &FHttpModule::Get();
    FHttpRequestRef Request = Http->CreateRequest();
    Request->SetHeader(TEXT("Authorization"), ApiKey);
    
    // Set up WebSocket for real-time updates
    WebSocket = &FWebSocketsModule::Get();
    // Connect to Boredgamer WebSocket endpoint
}

// Blueprint example usage:
// 1. Create a Widget Blueprint from ULeaderboardWidget
// 2. Design your leaderboard UI in the Widget Blueprint
// 3. Call these functions from your game:

// In your GameMode or PlayerController:
ULeaderboardWidget* Leaderboard = CreateWidget<ULeaderboardWidget>(GetWorld(), ULeaderboardWidget::StaticClass());
Leaderboard->InitializeLeaderboard("your-api-key", "your-game-id");
Leaderboard->AddToViewport();

// When submitting a score:
Leaderboard->SubmitScore(1000.0f, "PlayerName");`}
                </pre>
              </div>

              <div className="mt-6 p-4 bg-blue-500/10 rounded-lg">
                <h4 className="text-blue-400 font-medium mb-2">Unreal Engine Tips</h4>
                <ul className="text-sm text-slate-300 space-y-2">
                  <li>Use the included UMG Widget Blueprint for easy UI customization</li>
                  <li>The component handles connection state and automatically reconnects</li>
                  <li>Supports both Blueprint and C++ integration</li>
                  <li>Compatible with Unreal Engine 4.26+ and 5.x</li>
                  <li>Includes example project with common game type implementations</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Leaderboards */}
        <TabsContent value="manage">
          <Card>
            <CardContent>
              <Tabs defaultValue="create" className="space-y-4">
                <TabsList className="flex w-full gap-2">
                  <TabsTrigger value="create">Create Leaderboard</TabsTrigger>
                  <TabsTrigger value="manage">Manage Existing</TabsTrigger>
                </TabsList>

                {/* Create New Leaderboard */}
                <TabsContent value="create">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Main Settings</h3>
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <label>Leaderboard Name</label>
                          <input 
                            type="text" 
                            placeholder="High Scores" 
                            className="input"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <label>Start Date</label>
                            <input 
                              type="date" 
                              className="input" 
                              value={formData.startDate}
                              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <label>Length Type</label>
                          <select 
                            className="select"
                            value={lengthType}
                            onChange={(e) => setLengthType(e.target.value)}
                          >
                            <option value="rolling">Rolling</option>
                            <option value="fixed">Fixed</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <label>End Date</label>
                            <input 
                              type="date" 
                              className="input" 
                              value={formData.endDate}
                              onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                              disabled={lengthType !== 'fixed'}
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <label>Displayed Time Period</label>
                          <select 
                            className="select"
                            value={formData.displayTime}
                            onChange={(e) => setFormData({...formData, displayTime: e.target.value})}
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="alltime">All-Time</option>
                            <option value="fixed">Fixed</option>
                          </select>
                        </div>
                      </div>
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

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Limits</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <label>Max Entries Per User</label>
                          <input 
                            type="number" 
                            placeholder="1000" 
                            className="input"
                            value={formData.maxUser}
                            onChange={(e) => setFormData({...formData, maxUser: parseInt(e.target.value)})}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label>Highest Score Per User</label>
                          <input 
                            type="number" 
                            placeholder="1" 
                            className="input"
                            value={formData.highestUser}
                            onChange={(e) => setFormData({...formData, highestUser: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="flex justify-end gap-4 mt-6">
                        <Button type="submit" className="px-8">
                          Create Leaderboard
                        </Button>
                      </div>
                    </form>
                  </div>
                </TabsContent>

                {/* Manage Existing Leaderboard */}
                <TabsContent value="manage">
                  <div className="space-y-6">

                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <select className="select flex-1" style={{ marginBottom: '1rem' }}>
                          <option value="all">All Time</option>
                          <option value="today">Today</option>
                          <option value="week">This Week</option>
                          <option value="month">This Month</option>
                          <option value="custom">Custom Range</option>
                        </select>
                        <Button variant="outline">
                          Filter Metadata
                        </Button>
                        <Button variant="outline">
                          Export
                        </Button>
                      </div>



                      {/* Stats */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-slate-100 p-4 rounded-lg">
                          <div className="text-sm text-slate-500">Total Entries</div>
                          <div className="text-2xl font-semibold">1,234</div>
                        </div>
                        <div className="bg-slate-100 p-4 rounded-lg">
                          <div className="text-sm text-slate-500">Unique Players</div>
                          <div className="text-2xl font-semibold">567</div>
                        </div>
                        <div className="bg-slate-100 p-4 rounded-lg">
                          <div className="text-sm text-slate-500">Today's Submissions</div>
                          <div className="text-2xl font-semibold">89</div>
                        </div>
                        <div className="bg-slate-100 p-4 rounded-lg">
                          <div className="text-sm text-slate-500">Avg Score</div>
                          <div className="text-2xl font-semibold">750,000</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4" style={{ marginTop: '1rem'}}>
                    <h3 className="text-2xl font-semibold mb-2" style={{ marginTop: '1rem', marginBottom: '1rem' }}>Your Leaderboards</h3>
                    <Table style={{ width: '100%' }}>
                      <TableHeader>
                        <TableRow>
                          <TableHead style={{ textAlign: 'left' }}>Name</TableHead>
                          <TableHead style={{ textAlign: 'left' }}>Start Date</TableHead>
                          <TableHead style={{ textAlign: 'left' }}>Display Time</TableHead>
                          <TableHead style={{ textAlign: 'left' }}>Score Calculation</TableHead>
                          <TableHead style={{ textAlign: 'left' }}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboards.map((board) => (
                          <TableRow key={board.id}>
                            <TableCell className="font-medium">{board.name}</TableCell>
                            <TableCell>{format(new Date(board.startDate), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="capitalize">{board.displayTime}</TableCell>
                            <TableCell className="capitalize">{board.scoreCalculation}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(board.id)}>
                                  Edit
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => handleDelete(board.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live View */}
        <TabsContent value="preview">
          <Card>
            <CardHeader className="flex flex-col space-y-4">
              <div>
                <CardTitle>Live View</CardTitle>
                <CardDescription>View your live leaderboard data</CardDescription>
              </div>
              <select 
                className="select w-full"
                value={selectedLeaderboard}
                onChange={(e) => setSelectedLeaderboard(e.target.value)}
              >
                <option value="">Select a leaderboard</option>
                {leaderboards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
            </CardHeader>
            <CardContent>
              {!selectedLeaderboard ? (
                <div className="bg-slate-900 text-slate-50 p-4 rounded-lg h-[400px] overflow-y-auto font-mono text-sm">
                  <table className="w-full border-collapse border border-slate-700 datatable">
                    <thead className="sticky top-0 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/75">
                      <tr className="border-b-2 border-slate-600">
                        <th className="text-left px-6 py-4 text-slate-400 border-r border-slate-700 w-[180px]">Timestamp</th>
                        <th className="text-left px-6 py-4 text-slate-400 border-r border-slate-700 w-[150px]">Type</th>
                        <th className="text-left px-6 py-4 text-slate-400 border-r border-slate-700 w-[150px]">Player</th>
                        <th className="text-left px-6 py-4 text-slate-400 border-r border-slate-700">Data</th>
                        <th className="text-left px-6 py-4 text-slate-400 w-[150px]">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {eventLogs.map((event) => {
                        console.log('Rendering event:', event);
                        return (
                          <tr key={event.id} className="hover:bg-slate-800/50">
                            <td className="px-6 py-4 text-emerald-400 whitespace-nowrap border-r border-slate-700">
                              {new Date(event.timestamp?.toDate?.() || event.timestamp).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-blue-400 whitespace-nowrap border-r border-slate-700">
                              {event.type}
                            </td>
                            <td className="px-6 py-4 text-purple-400 whitespace-nowrap border-r border-slate-700">
                              {event.data?.playerName || 'Anonymous'}
                            </td>
                            <td className="px-6 py-4 text-slate-400 border-r border-slate-700">
                              <button
                                className="flex items-center gap-2 hover:text-slate-200 transition-colors"
                                onClick={() => toggleEventExpansion(event.id)}
                              >
                                <span className={`transform transition-transform ${expandedEvents.has(event.id) ? 'rotate-90' : ''}`}>
                                  ▶
                                </span>
                                {expandedEvents.has(event.id) ? (
                                  <pre className="whitespace-pre-wrap">{JSON.stringify(event.data, null, 2)}</pre>
                                ) : (
                                  'View Data'
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-emerald-500 text-lg font-semibold whitespace-nowrap">
                              {event.data?.score?.toLocaleString() || '0'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-900 text-slate-50 p-4 rounded-lg h-[400px] overflow-y-auto font-mono text-sm">
                  <table className="w-full border-collapse border border-slate-700 datatable">
                    <thead className="sticky top-0 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/75">
                      <tr className="border-b-2 border-slate-600">
                        <th className="text-left px-6 py-4 text-slate-400 border-r border-slate-700 w-[180px]">Player</th>
                        <th className="text-left px-6 py-4 text-slate-400 border-r border-slate-700 w-[150px]">Score</th>
                        <th className="text-left px-6 py-4 text-slate-400 border-r border-slate-700 w-[150px]">Data</th>
                        <th className="text-left px-6 py-4 text-slate-400 border-r border-slate-700">Type</th>
                        <th className="text-left px-6 py-4 text-slate-400 w-[150px]">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {filteredEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-slate-800/50">
                          <td className="px-6 py-4 text-purple-400 whitespace-nowrap border-r border-slate-700">
                            {event.data?.playerName || 'Anonymous'}
                          </td>
                          <td className="px-6 py-4 text-emerald-500 text-lg font-semibold whitespace-nowrap">
                            {event.data?.score?.toLocaleString() || '0'}
                          </td>
                          <td className="px-6 py-4 text-slate-400 border-r border-slate-700">
                            <button
                              className="flex items-center gap-2 hover:text-slate-200 transition-colors"
                              onClick={() => toggleEventExpansion(event.id)}
                            >
                              <span className={`transform transition-transform ${expandedEvents.has(event.id) ? 'rotate-90' : ''}`}>
                                ▶
                              </span>
                              {expandedEvents.has(event.id) ? (
                                <pre className="whitespace-pre-wrap">{JSON.stringify(event.data, null, 2)}</pre>
                              ) : (
                                'View Data'
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-blue-400 whitespace-nowrap border-r border-slate-700">
                            {event.type}
                          </td>
                          <td className="px-6 py-4 text-emerald-400 whitespace-nowrap border-r border-slate-700">
                            {new Date(event.timestamp?.toDate?.() || event.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
