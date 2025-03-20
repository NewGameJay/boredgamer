'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth/auth-context';
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, orderBy, limit, onSnapshot, writeBatch, getDocs, DocumentData } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { Copy, Check, RefreshCw } from 'lucide-react';

const db = getFirestore(app);

interface Event {
  id: string;
  gameId: string;
  studioId: string;
  type: string;
  data: any;
  timestamp: any;
  metadata: {
    sdkVersion: string;
    platform: string;
  };
}

export function SDKSetup() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState<string>('');
  const [gameId, setGameId] = useState<string>('');
  const [savedGameId, setSavedGameId] = useState<string>('');
  const [domain, setDomain] = useState<string>('');
  const [savedDomain, setSavedDomain] = useState<string>('');
  const [buildHash, setBuildHash] = useState<string>('');
  const [savedBuildHash, setSavedBuildHash] = useState<string>('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmittingGameId, setIsSubmittingGameId] = useState(false);
  const [isSubmittingDomain, setIsSubmittingDomain] = useState(false);
  const [isSubmittingBuildHash, setIsSubmittingBuildHash] = useState(false);
  const [eventLogs, setEventLogs] = useState<any[]>([]);
  const [domainError, setDomainError] = useState<string>('');
  const [buildHashError, setBuildHashError] = useState<string>('');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [eventFilter, setEventFilter] = useState('');
  const [filterType, setFilterType] = useState<'type' | 'gameId' | 'all'>('all');

  const filteredEvents = useMemo(() => {
    if (!eventFilter) return eventLogs;
    
    return eventLogs.filter(event => {
      const searchTerm = eventFilter.toLowerCase();
      switch (filterType) {
        case 'type':
          return event.type.toLowerCase().includes(searchTerm);
        case 'gameId':
          return event.gameId.toLowerCase().includes(searchTerm);
        case 'all':
        default:
          return (
            event.type.toLowerCase().includes(searchTerm) ||
            event.gameId.toLowerCase().includes(searchTerm) ||
            JSON.stringify(event.data).toLowerCase().includes(searchTerm)
          );
      }
    });
  }, [eventLogs, eventFilter, filterType]);

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (user?.id) {
      fetchApiKey();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && apiKey && gameId) {
      // Set up real-time event listener
      const eventsRef = collection(db, 'events');
      const q = query(
        eventsRef,
        where('gameId', '==', gameId),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newEvents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }));
        setEventLogs(newEvents);
      });

      return () => unsubscribe();
    }
  }, [user?.id, apiKey, gameId]);

  useEffect(() => {
    if (!user) return;

    console.log('Current user:', user);
    console.log('Setting up event listener for studioId:', user.id);

    // Query for events where studioId matches the current user's ID
    const eventsQuery = query(
      collection(db, 'events'),
      where('studioId', '==', 'bUCf7iCgz4NuD5VQdsi8JrIUVqW2')
      // Temporarily remove orderBy while index builds
      // orderBy('timestamp', 'desc')
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(eventsQuery, 
      (snapshot) => {
        console.log('Got snapshot with', snapshot.docs.length, 'events');
        const newEvents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Event[];
        console.log('New events:', newEvents);
        setEventLogs(newEvents);
      },
      (error) => {
        console.error('Error in event listener:', error);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [user]);

  const fetchApiKey = async () => {
    if (!user?.id) return;

    try {
      const docRef = doc(db, 'studios', user.id);
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      
      if (data?.apiKey) {
        setApiKey(data.apiKey);
      }
      if (data?.gameId) {
        setGameId(data.gameId);
        setSavedGameId(data.gameId);
      }
      if (data?.domain) {
        setDomain(data.domain);
        setSavedDomain(data.domain);
      }
      if (data?.buildHash) {
        setBuildHash(data.buildHash);
        setSavedBuildHash(data.buildHash);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const generateApiKey = async () => {
    if (!user?.id || isGeneratingKey) return;
    
    try {
      setIsGeneratingKey(true);
      
      const key = `bg_${user.tier.substring(0, 1)}_${Math.random().toString(36).substring(2, 15)}`;
      
      const docRef = doc(db, 'studios', user.id);
      await updateDoc(docRef, {
        apiKey: key,
        updatedAt: new Date()
      });
      
      setApiKey(key);
    } catch (error) {
      console.error('Error generating API key:', error);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const submitGameId = async () => {
    if (!user?.id || !gameId || isSubmittingGameId) return;
    
    try {
      setIsSubmittingGameId(true);
      
      const docRef = doc(db, 'studios', user.id);
      await updateDoc(docRef, {
        gameId: gameId,
        updatedAt: new Date()
      });
      
      setSavedGameId(gameId);
    } catch (error) {
      console.error('Error saving Game ID:', error);
    } finally {
      setIsSubmittingGameId(false);
    }
  };

  const validateDomain = (domain: string): boolean => {
    // Domain format: example.com, sub.example.com, etc.
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const isValid = domainRegex.test(domain);
    setDomainError(isValid ? '' : 'Please enter a valid domain (e.g., example.com)');
    return isValid;
  };

  const validateBuildHash = (hash: string): boolean => {
    // Unreal Engine build hash format: ++UE4+Release-4.27-CL-123456789
    const buildHashRegex = /^\+\+UE[4-5]\+[A-Za-z]+-\d+\.\d+(?:\.\d+)?-CL-\d+$/;
    const isValid = buildHashRegex.test(hash);
    setBuildHashError(isValid ? '' : 'Please enter a valid Unreal Engine build hash (e.g., ++UE4+Release-4.27-CL-123456789)');
    return isValid;
  };

  const submitDomain = async () => {
    if (!user?.id || !domain || isSubmittingDomain) return;
    if (!validateDomain(domain)) return;
    
    try {
      setIsSubmittingDomain(true);
      
      const docRef = doc(db, 'studios', user.id);
      await updateDoc(docRef, {
        domain: domain,
        updatedAt: new Date()
      });
      
      setSavedDomain(domain);
      setDomainError('');
    } catch (error) {
      console.error('Error saving domain:', error);
    } finally {
      setIsSubmittingDomain(false);
    }
  };

  const submitBuildHash = async () => {
    if (!user?.id || !buildHash || isSubmittingBuildHash) return;
    if (!validateBuildHash(buildHash)) return;
    
    try {
      setIsSubmittingBuildHash(true);
      
      const docRef = doc(db, 'studios', user.id);
      await updateDoc(docRef, {
        buildHash: buildHash,
        updatedAt: new Date()
      });
      
      setSavedBuildHash(buildHash);
      setBuildHashError('');
    } catch (error) {
      console.error('Error saving build hash:', error);
    } finally {
      setIsSubmittingBuildHash(false);
    }
  };

  const refreshEvents = () => {
    // Re-run the query to get fresh events
    if (!user) return;
    
    const eventsQuery = query(
      collection(db, 'events'),
      where('studioId', '==', 'bUCf7iCgz4NuD5VQdsi8JrIUVqW2')
    );

    getDocs(eventsQuery).then((snapshot) => {
      const newEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEventLogs(newEvents);
    });
  };

  const clearEvents = async () => {
    if (!user?.id || !gameId) return;
    
    try {
      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, where('gameId', '==', gameId));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc: DocumentData) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error clearing events:', error);
    }
  };

  const formatEventData = (data: any): string => {
    return JSON.stringify(data, null, 2);
  };

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Getting Started</CardTitle>
        <CardDescription>Follow these steps to integrate BoredGamer into your game</CardDescription>
      </CardHeader>
      <CardContent className="max-h-[1000px] overflow-y-auto">
        <Tabs defaultValue="api" className="space-y-4">
          <TabsList>
            <TabsTrigger value="api">API Setup</TabsTrigger>
            <TabsTrigger value="guide">Setup Guide</TabsTrigger>
            <TabsTrigger value="events">Event Monitor</TabsTrigger>
          </TabsList>

          <TabsContent value="api">
            <div className="space-y-6">
              <div style={{ padding: '0 4rem 0 1rem' }}>
                <h3 className="text-lg font-semibold mb-4">API Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2">API Key</label>
                    <div className="flex gap-2">
                      <div className="relative flex flex-row" style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={apiKey}
                          style={{ width: '30%', marginRight: '1rem' }}
                          readOnly
                          className="input w-full font-mono pr-10"
                          placeholder={isGeneratingKey ? 'Generating API key...' : 'Generate an API key to get started'}
                        />
                        {apiKey && (
                          <button
                            onClick={copyToClipboard}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700/50 rounded clipboardbutton"
                            title="Copy to clipboard"
                            style={{ borderRadius: '0.375rem', display: 'flex', alignItems: 'center', height: '33.5px', backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)'}}
                          >
                            {isCopied ? (
                              <Check className="w-5 h-5 text-green-500" />
                            ) : (
                              <Copy className="w-5 h-5 text-white" />
                            )}
                          </button>
                        )}
                      </div>
                      {!apiKey && (
                        <Button 
                          onClick={generateApiKey} 
                          disabled={isGeneratingKey}
                          style={{ 
                            height: '33.5px', 
                            borderRadius: '0.375rem',
                            cursor: isGeneratingKey ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Generate
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2">Game ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={gameId}
                        onChange={(e) => {
                          if (!savedGameId) {
                            const sanitized = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
                            setGameId(sanitized);
                          }
                        }}
                        readOnly={!!savedGameId}
                        className="input flex-1 font-mono"
                        placeholder="Custom Game ID (letters, numbers, _ and - only)"
                        style={{ width: '30%', marginRight: '1rem' }}
                      />
                      {!savedGameId && (
                        <Button 
                          onClick={submitGameId}
                          disabled={isSubmittingGameId || !gameId}
                          style={{ 
                            height: '33.5px', 
                            borderRadius: '0.375rem',
                            cursor: isSubmittingGameId || !gameId ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Submit
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '0px 4rem 0px 1rem' }}>
                <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2">
                      Authorized Domain
                    </label>
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={domain}
                          onChange={(e) => {
                            if (!savedDomain) {
                              setDomain(e.target.value);
                              validateDomain(e.target.value);
                            }
                          }}
                          readOnly={!!savedDomain}
                          className={`input flex-1 font-mono ${domainError ? 'border-red-500' : ''}`}
                          placeholder="e.g., example.com"
                          style={{ width: '30%', marginRight: '1rem' }}
                        />
                        {!savedDomain && (
                          <Button 
                            onClick={submitDomain}
                            disabled={isSubmittingDomain || !domain || !!domainError}
                            style={{ 
                              height: '33.5px', 
                              borderRadius: '0.375rem',
                              cursor: (isSubmittingDomain || !domain || !!domainError) ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Submit
                          </Button>
                        )}
                      </div>
                      {domainError && <p className="text-sm text-red-500">{domainError}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2">
                      Authorized Build Hash
                    </label>
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={buildHash}
                          onChange={(e) => {
                            if (!savedBuildHash) {
                              setBuildHash(e.target.value);
                              validateBuildHash(e.target.value);
                            }
                          }}
                          readOnly={!!savedBuildHash}
                          className={`input flex-1 font-mono ${buildHashError ? 'border-red-500' : ''}`}
                          placeholder="e.g., ++UE4+Release-4.27-CL-123456789"
                          style={{ width: '30%', marginRight: '1rem' }}
                        />
                        {!savedBuildHash && (
                          <Button 
                            onClick={submitBuildHash}
                            disabled={isSubmittingBuildHash || !buildHash || !!buildHashError}
                            style={{ 
                              height: '33.5px', 
                              borderRadius: '0.375rem',
                              cursor: (isSubmittingBuildHash || !buildHash || !!buildHashError) ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Submit
                          </Button>
                        )}
                      </div>
                      {buildHashError && <p className="text-sm text-red-500">{buildHashError}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="guide" className="space-y-4">
            <Card>
              <CardContent>
                <Tabs defaultValue="sdk">
                  <TabsList className="flex w-full gap-2">
                    <TabsTrigger value="sdk">SDK Integration</TabsTrigger>
                    <TabsTrigger value="api">Direct API</TabsTrigger>
                  </TabsList>

                  <TabsContent value="sdk" className="space-y-4">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">SDK Integration</h3>
                      <div className="text-sm text-muted-foreground space-y-2">
                        <ul className="list-disc pl-6 space-y-1">
                          <li>Simple event tracking API</li>
                          <li>Automatic authentication handling</li>
                          <li>Built-in data validation</li>
                          <li>Event batching and retry logic</li>
                          <li>TypeScript support</li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium">1. Installation</h4>
                        <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm text-slate-50">npm install @boredgamer/sdk</code>
                        </pre>

                        <h4 className="font-medium">2. Configuration</h4>
                        <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm text-slate-50">{`// Initialize in your game's entry point
import { BoredgamerSDK } from '@boredgamer/sdk';

const sdk = new BoredgamerSDK({
  apiKey: 'your-api-key',
  gameId: 'your-game-id',
  options: {
    // Optional configuration
    batchSize: 10,         // Number of events to batch before sending
    batchInterval: 1000,   // Milliseconds to wait before sending batch
    retryAttempts: 3,      // Number of retry attempts for failed requests
    debug: true            // Enable debug logging
  }
});`}</code>
                        </pre>

                        <h4 className="font-medium">3. TypeScript Support</h4>
                        <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm text-slate-50">{`// Define your event types for better type safety
import { EventData } from '@boredgamer/sdk';

interface GameStartedEvent extends EventData {
  level: number;
  difficulty: 'easy' | 'normal' | 'hard';
  characterClass?: string;
}

interface AchievementEvent extends EventData {
  achievementId: string;
  progress: number;
  completed: boolean;
}

// Events are now type-safe
await sdk.trackEvent<GameStartedEvent>({
  type: 'game_started',
  data: {
    level: 1,
    difficulty: 'normal',
    characterClass: 'warrior'
  }
});`}</code>
                        </pre>

                        <h4 className="font-medium">4. Event Tracking Patterns</h4>
                        <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm text-slate-50">{`// Basic event tracking
await sdk.trackEvent({
  type: 'level_completed',
  data: {
    levelId: 'level-1',
    timeSpent: 120,
    score: 1000
  }
});

// Track with metadata
await sdk.trackEvent({
  type: 'item_purchased',
  data: {
    itemId: 'sword-123',
    price: 100,
    currency: 'gold'
  },
  metadata: {
    platform: 'steam',
    sessionId: 'abc-123',
    version: '1.0.0'
  }
});

// Batch tracking (automatically handled)
for (const enemy of defeatedEnemies) {
  sdk.trackEvent({
    type: 'enemy_defeated',
    data: {
      enemyId: enemy.id,
      position: enemy.position,
      weaponUsed: currentWeapon.id
    }
  });
}

// Error handling
try {
  await sdk.trackEvent({
    type: 'boss_defeated',
    data: { bossId: 'dragon-123' }
  });
} catch (error) {
  console.error('Failed to track event:', error);
  // Events are automatically retried based on retryAttempts config
}

// Custom event validation
sdk.addEventValidator('purchase', (event) => {
  if (!event.data.itemId) {
    throw new Error('Purchase events must include itemId');
  }
  if (typeof event.data.price !== 'number') {
    throw new Error('Price must be a number');
  }
});`}</code>
                        </pre>

                        <h4 className="font-medium">5. React Integration</h4>
                        <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm text-slate-50">{`// Create a hook for easy access
import { createBoredgamerHook } from '@boredgamer/sdk/react';

export const useBoredgamer = createBoredgamerHook({
  apiKey: 'your-api-key',
  gameId: 'your-game-id'
});

// Use in components
function GameComponent() {
  const { trackEvent } = useBoredgamer();

  const handleLevelComplete = async () => {
    await trackEvent({
      type: 'level_completed',
      data: {
        levelId: currentLevel,
        score: playerScore
      }
    });
  };
}`}</code>
                        </pre>

                        <h4 className="font-medium">6. Game Engine Integration Pattern</h4>
                        <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm text-slate-50">{`// GameAnalytics.ts - Singleton manager for your game
import { BoredgamerSDK } from '@boredgamer/sdk';

export class GameAnalytics {
    private static instance: GameAnalytics;
    private sdk: BoredgamerSDK;
    private sessionId: string;
    private metadata: Record<string, any>;

    private constructor() {
        this.sdk = new BoredgamerSDK({
            apiKey: process.env.BOREDGAMER_API_KEY!,
            gameId: process.env.BOREDGAMER_GAME_ID!,
            options: {
                batchSize: 10,
                retryAttempts: 3
            }
        });

        this.sessionId = this.generateSessionId();
        this.metadata = {
            platform: this.detectPlatform(),
            gameVersion: process.env.GAME_VERSION,
            sessionId: this.sessionId
        };
    }

    public static getInstance(): GameAnalytics {
        if (!GameAnalytics.instance) {
            GameAnalytics.instance = new GameAnalytics();
        }
        return GameAnalytics.instance;
    }

    // Common game events
    public levelStarted(levelId: string, difficulty: string) {
        return this.sdk.trackEvent({
            type: 'level_started',
            data: { levelId, difficulty },
            metadata: this.metadata
        });
    }

    public levelCompleted(levelId: string, score: number, timeSpent: number) {
        return this.sdk.trackEvent({
            type: 'level_completed',
            data: { levelId, score, timeSpent },
            metadata: this.metadata
        });
    }

    public itemPurchased(itemId: string, price: number, currency: string) {
        return this.sdk.trackEvent({
            type: 'item_purchased',
            data: { itemId, price, currency },
            metadata: this.metadata
        });
    }

    public achievementUnlocked(achievementId: string) {
        return this.sdk.trackEvent({
            type: 'achievement_unlocked',
            data: { achievementId },
            metadata: this.metadata
        });
    }

    // Usage in game:
    /*
    // Get analytics instance
    const analytics = GameAnalytics.getInstance();

    // Track events
    analytics.levelStarted('level-1', 'normal');
    analytics.itemPurchased('sword-123', 100, 'gold');
    analytics.achievementUnlocked('first-win');
    */
}`}</code>
                        </pre>

                        <div className="text-sm text-muted-foreground mt-2">
                          <p>Benefits of this pattern:</p>
                          <ul className="list-disc pl-6 space-y-1">
                            <li>Single source of truth for analytics</li>
                            <li>Consistent metadata across events</li>
                            <li>Type-safe wrapper methods for common events</li>
                            <li>Easy to extend with new event types</li>
                            <li>Centralized error handling and configuration</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="api" className="space-y-4">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Direct API Integration</h3>
                      <div className="text-sm text-muted-foreground space-y-2">
                        <ul className="list-disc pl-6 space-y-1">
                          <li>Custom implementation requirements</li>
                          <li>Platforms without SDK support</li>
                          <li>Advanced use cases</li>
                          <li>Full control over the integration</li>
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium">API Endpoint</h4>
                        <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm text-slate-50">POST https://api.boredgamer.com/api/events</code>
                        </pre>

                        <h4 className="font-medium">Example Request</h4>
                        <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm text-slate-50">{`// HTTP Request
POST /api/events
X-API-Key: your-api-key
Content-Type: application/json

{
  "gameId": "your-game-id",
  "type": "game_started",
  "data": {
    "level": 1,
    "difficulty": "normal"
  }
}`}</code>
                        </pre>

                        <h4 className="font-medium">Example Implementation (Unity)</h4>
                        <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm text-slate-50">{`using UnityEngine;
using UnityEngine.Networking;
using System.Text;

public class BoredgamerEvents : MonoBehaviour
{
    private readonly string API_KEY = "your-api-key";
    private readonly string GAME_ID = "your-game-id";
    private readonly string API_URL = "https://api.boredgamer.com/api/events";
    
    public void TrackEvent(string type, object data)
    {
        var json = JsonUtility.ToJson(new {
            gameId = GAME_ID,
            type = type,
            data = data
        });

        var request = new UnityWebRequest(API_URL, "POST");
        request.SetRequestHeader("X-API-Key", API_KEY);
        request.SetRequestHeader("Content-Type", "application/json");
        request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
        request.downloadHandler = new DownloadHandlerBuffer();
        
        request.SendWebRequest().completed += (op) => {
            if (request.result == UnityWebRequest.Result.Success) {
                Debug.Log("Event tracked successfully");
            } else {
                Debug.LogError($"Failed to track event: {request.error}");
            }
        };
    }
`}</code>
                        </pre>

                        <h4 className="font-medium">Example Implementation (Unreal Engine)</h4>
                        <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm text-slate-50">{`// BoredgamerEvents.h
#pragma once

#include "CoreMinimal.h"
#include "Http.h"
#include "Json.h"
#include "BoredgamerEvents.generated.h"

UCLASS()
class YOURGAME_API UBoredgamerEvents : public UObject
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Boredgamer")
    void TrackEvent(const FString& Type, const TSharedPtr<FJsonObject>& Data);

private:
    const FString API_KEY = TEXT("your-api-key");
    const FString GAME_ID = TEXT("your-game-id");
    const FString API_URL = TEXT("https://api.boredgamer.com/api/events");
};

// BoredgamerEvents.cpp
#include "BoredgamerEvents.h"

void UBoredgamerEvents::TrackEvent(const FString& Type, const TSharedPtr<FJsonObject>& Data)
{
    // Create request object
    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
    Request->SetVerb("POST");
    Request->SetURL(API_URL);
    Request->SetHeader(TEXT("X-API-Key"), API_KEY);
    Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));

    // Create JSON payload
    TSharedPtr<FJsonObject> JsonPayload = MakeShared<FJsonObject>();
    JsonPayload->SetStringField(TEXT("gameId"), GAME_ID);
    JsonPayload->SetStringField(TEXT("type"), Type);
    JsonPayload->SetObjectField(TEXT("data"), Data);

    // Serialize to string
    FString JsonString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&JsonString);
    FJsonSerializer::Serialize(JsonPayload.ToSharedRef(), Writer);

    Request->SetContentAsString(JsonString);

    // Set response callback
    Request->OnProcessRequestComplete().BindLambda(
        [](FHttpRequestPtr Request, FHttpResponsePtr Response, bool bSuccess)
        {
            if (bSuccess && Response.IsValid())
            {
                UE_LOG(LogTemp, Log, TEXT("Event tracked successfully"));
            }
            else
            {
                UE_LOG(LogTemp, Error, TEXT("Failed to track event"));
            }
        });

    // Send request
    Request->ProcessRequest();
}

// Blueprint usage example:
// 1. Create a variable of type BoredgamerEvents
// 2. Create a JSON object with your event data
// 3. Call TrackEvent:
/*
    // Create event data
    auto Data = MakeShared<FJsonObject>();
    Data->SetNumberField(TEXT("level"), 1);
    Data->SetStringField(TEXT("difficulty"), TEXT("normal"));

    // Track event
    BoredgamerEvents->TrackEvent(TEXT("game_started"), Data);
*/`}</code>
                        </pre>
                        <div className="text-sm text-muted-foreground mt-2">
                          <p>The API handles:</p>
                          <ul className="list-disc pl-6 space-y-1">
                            <li>Authentication using your API key</li>
                            <li>Data validation and formatting</li>
                            <li>Automatic retry on failures</li>
                            <li>Rate limiting and quotas</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Live Event Stream</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Filter events..."
                      value={eventFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEventFilter(e.target.value)}
                      className="w-64"
                    />
                    <div className="w-32">
                      <select 
                        value={filterType} 
                        onChange={(e) => setFilterType(e.target.value as 'type' | 'gameId' | 'all')}
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background"
                      >
                        <option value="all">All Fields</option>
                        <option value="type">Event Type</option>
                        <option value="gameId">Game ID</option>
                      </select>
                    </div>
                  </div>
                  <Button onClick={refreshEvents} className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                </div>
              </div>
              <div className="bg-slate-900 text-slate-50 p-4 rounded-lg h-[400px] overflow-y-auto font-mono text-sm">
                {filteredEvents.length === 0 ? (
                  <div className="text-slate-500">
                    No events received yet. Start sending events from your game to see them here.
                  </div>
                ) : (
                  <table className="w-full border-collapse border border-slate-700 datatable">
                    <thead className="sticky top-0 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/75">
                      <tr className="border-b-2 border-slate-600">
                        <th className="text-left px-6 py-4 text-slate-400 border-r border-slate-700 w-[180px]">Timestamp</th>
                        <th className="text-left px-6 py-4 text-slate-400 border-r border-slate-700 w-[150px]">Type</th>
                        <th className="text-left px-6 py-4 text-slate-400 border-r border-slate-700 w-[150px]">Game ID</th>
                        <th className="text-left px-6 py-4 text-slate-400 border-r border-slate-700">Data</th>
                        <th className="text-left px-6 py-4 text-slate-400 w-[150px]">SDK Info</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {filteredEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-slate-800/50">
                          <td className="px-6 py-4 text-emerald-400 whitespace-nowrap border-r border-slate-700">
                            {formatTimestamp(event.timestamp)}
                          </td>
                          <td className="px-6 py-4 text-blue-400 whitespace-nowrap border-r border-slate-700">
                            {event.type}
                          </td>
                          <td className="px-6 py-4 text-slate-300 whitespace-nowrap border-r border-slate-700">
                            {event.gameId}
                          </td>
                          <td className="px-6 py-4 text-slate-400 border-r border-slate-700">
                            <button 
                              onClick={() => toggleEventExpansion(event.id)}
                              className="flex items-center gap-2 hover:text-slate-200 transition-colors"
                            >
                              <span className={`transform transition-transform ${expandedEvents.has(event.id) ? 'rotate-90' : ''}`}>
                                ▶
                              </span>
                              {expandedEvents.has(event.id) ? 'Collapse' : 'Expand'} Data
                            </button>
                            {expandedEvents.has(event.id) && (
                              <pre className="whitespace-pre-wrap break-words max-w-md mt-4 p-4 bg-slate-800/50 rounded border border-slate-600">
                                {formatEventData(event.data)}
                              </pre>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                            v{event.metadata.sdkVersion} | {event.metadata.platform}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
