'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, limit, DocumentData, writeBatch, getDocs } from 'firebase/firestore';

interface GameEvent {
  gameId: string;
  studioId: string;
  userId: string;
  type: string;
  data: any;
  timestamp: any;
}

export default function SDKSetup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gameId, setGameId] = useState('demo-game');
  const [userId, setUserId] = useState('player-123');
  const [eventType, setEventType] = useState('score_update');
  const [eventData, setEventData] = useState('{"score": 1500, "level": 3}');
  const [events, setEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    if (!user?.id || !gameId) return;

    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef, 
      where('gameId', '==', gameId),
      orderBy('receivedAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GameEvent[];
      setEvents(eventsData);
    });

    return () => unsubscribe();
  }, [user, gameId]);

  const sendTestEvent = async () => {
    if (!user?.id) return;

    try {
      const parsedData = JSON.parse(eventData);

      await addDoc(collection(db, 'events'), {
        gameId,
        studioId: user.id,
        userId,
        type: eventType,
        data: parsedData,
        timestamp: new Date(),
        receivedAt: new Date().toISOString(),
        processed: false,
        metadata: {
          sdkVersion: '1.0.0',
          platform: 'web-demo'
        }
      });

      toast({
        title: "Event Sent",
        description: "Test event has been sent successfully"
      });
    } catch (error) {
      console.error('Error sending test event:', error);
      toast({
        title: "Error",
        description: "Failed to send test event",
        variant: "destructive"
      });
    }
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

      toast({
        title: "Events Cleared",
        description: "All test events have been cleared"
      });
    } catch (error) {
      console.error('Error clearing events:', error);
      toast({
        title: "Error",
        description: "Failed to clear events",
        variant: "destructive"
      });
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>BoredGamer SDK Integration Guide</CardTitle>
          <CardDescription>Complete setup guide for integrating BoredGamer into your game</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="react">React/Web</TabsTrigger>
              <TabsTrigger value="unity">Unity</TabsTrigger>
              <TabsTrigger value="unreal">Unreal</TabsTrigger>
              <TabsTrigger value="testing">Event Testing</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Core Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• <strong>Quests:</strong> Dynamic quest system with conditions and rewards</li>
                      <li>• <strong>Leaderboards:</strong> Real-time competitive rankings</li>
                      <li>• <strong>Tournaments:</strong> Organized competitive events</li>
                      <li>• <strong>Battle Pass:</strong> Seasonal progression system</li>
                      <li>• <strong>Communities:</strong> Player groups with gated access</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Integration Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2 text-sm">
                      <li>1. Install SDK package for your platform</li>
                      <li>2. Initialize SDK with your API key</li>
                      <li>3. Set up event tracking in your game</li>
                      <li>4. Create campaigns in BoredGamer dashboard</li>
                      <li>5. Test integration with event simulator</li>
                    </ol>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>Gameplay Events:</strong>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        <li>• score_update</li>
                        <li>• level_complete</li>
                        <li>• enemy_kill</li>
                        <li>• item_collect</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Progress Events:</strong>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        <li>• achievement_unlock</li>
                        <li>• xp_gained</li>
                        <li>• quest_complete</li>
                        <li>• tier_unlock</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Social Events:</strong>
                      <ul className="mt-1 space-y-1 text-muted-foreground">
                        <li>• player_join</li>
                        <li>• match_complete</li>
                        <li>• tournament_join</li>
                        <li>• community_join</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="react" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>React/Web Integration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">1. Install Package</h4>
                    <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto">
npm install @boredgamer/sdk-web
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">2. Basic Setup</h4>
                    <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
{`import { BoredGamerSDK } from '@boredgamer/sdk-web';
import { QuestTracker, LeaderboardWidget, BattlePassProgress } from '@boredgamer/components-react';

// Initialize SDK
const sdk = new BoredGamerSDK({
  apiKey: 'your-api-key',
  gameId: 'your-game-id',
  baseUrl: 'https://your-app.replit.app'
});

function GameApp() {
  const [currentUser, setCurrentUser] = useState('player-123');

  useEffect(() => {
    sdk.setUserId(currentUser);
  }, [currentUser]);

  // Track game events
  const handleScoreUpdate = (score) => {
    sdk.track('score_update', {
      score: score,
      level: currentLevel,
      timestamp: Date.now()
    });
  };

  const handleLevelComplete = (level, time) => {
    sdk.track('level_complete', {
      level: level,
      completionTime: time,
      score: calculateScore(level, time)
    });
  };

  return (
    <div className="game-container">
      {/* Game UI Components */}
      <QuestTracker 
        userId={currentUser}
        position="top-right"
        theme="dark"
        onQuestComplete={(quest) => showNotification(quest)}
      />

      <LeaderboardWidget
        leaderboardId="weekly-scores"
        userId={currentUser}
        maxEntries={10}
        refreshInterval={5000}
      />

      <BattlePassProgress
        userId={currentUser}
        season={currentSeason}
        showTierPreview={true}
      />
    </div>
  );
}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="unity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Unity Integration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">1. Import Package</h4>
                    <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto">
# Add to Package Manager via Git URL:
https://github.com/boredgamer/unity-sdk.git
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">2. Setup Script</h4>
                    <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
{`// BoredGamerManager.cs
using UnityEngine;
using BoredGamer.SDK;
using BoredGamer.UI;

public class BoredGamerManager : MonoBehaviour
{
    [SerializeField] private string apiKey = "your-api-key";
    [SerializeField] private string gameId = "your-game-id";
    [SerializeField] private string baseUrl = "https://your-app.replit.app";

    [SerializeField] private GameObject questUIPrefab;
    [SerializeField] private GameObject leaderboardUIPrefab;
    [SerializeField] private GameObject battlePassUIPrefab;

    private BoredGamerSDK sdk;
    private string currentUserId;

    void Start()
    {
        // Initialize SDK
        sdk = new BoredGamerSDK(apiKey, gameId, baseUrl);

        // Set current user
        currentUserId = GetCurrentUserId();
        sdk.SetUserId(currentUserId);

        // Setup UI components
        SetupUIComponents();

        // Register event handlers
        sdk.OnQuestComplete += HandleQuestComplete;
        sdk.OnLeaderboardUpdate += HandleLeaderboardUpdate;
        sdk.OnBattlePassTierUnlock += HandleTierUnlock;
    }

    void SetupUIComponents()
    {
        // Quest Tracker
        var questUI = Instantiate(questUIPrefab);
        var questTracker = questUI.GetComponent<QuestTracker>();
        questTracker.Initialize(sdk, currentUserId);

        // Leaderboard Widget
        var leaderboardUI = Instantiate(leaderboardUIPrefab);
        var leaderboardWidget = leaderboardUI.GetComponent<LeaderboardWidget>();
        leaderboardWidget.Initialize(sdk, "weekly-scores", currentUserId);

        // Battle Pass Progress
        var battlePassUI = Instantiate(battlePassUIPrefab);
        var battlePassProgress = battlePassUI.GetComponent<BattlePassProgress>();
        battlePassProgress.Initialize(sdk, currentUserId);
    }

    // Call from your game logic
    public void OnPlayerScored(int score)
    {
        sdk.TrackEvent("score_update", new {
            score = score,
            level = GameManager.Instance.CurrentLevel,
            timestamp = System.DateTime.UtcNow
        });
    }

    public void OnLevelCompleted(int level, float completionTime)
    {
        sdk.TrackEvent("level_complete", new {
            level = level,
            completionTime = completionTime,
            score = GameManager.Instance.CalculateScore(level, completionTime)
        });
    }

    public void OnEnemyKilled(string enemyType, int points)
    {
        sdk.TrackEvent("enemy_kill", new {
            enemyType = enemyType,
            points = points,
            weapon = PlayerController.Instance.CurrentWeapon,
            position = transform.position
        });
    }

    // Event handlers
    private void HandleQuestComplete(QuestData quest)
    {
        ShowQuestCompleteAnimation(quest);
        PlaySound("quest-complete");

        // Handle rewards
        foreach(var reward in quest.rewards)
        {
            GrantReward(reward.type, reward.amount);
        }
    }

    private void HandleLeaderboardUpdate(LeaderboardData data)
    {
        if (data.userId == currentUserId && data.rankImproved)
        {
            ShowRankUpNotification(data.newRank);
        }
    }

    private void HandleTierUnlock(BattlePassTier tier)
    {
        ShowTierUnlockAnimation(tier);
        UnlockTierRewards(tier);
    }
}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="unreal" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Unreal Engine Integration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">1. Add Plugin</h4>
                    <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto">
# Add to your .uproject file:
{
  "Plugins": [
    {
      "Name": "BoredGamerSDK",
      "Enabled": true,
      "MarketplaceURL": "com.epicgames.launcher://ue/marketplace/product/boredgamer-sdk"
    }
  ]
}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">2. C++ Implementation</h4>
                    <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
{`// BoredGamerSubsystem.h
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "BoredGamerSubsystem.generated.h"

USTRUCT(BlueprintType)
struct FQuestData
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString QuestId;

    UPROPERTY(BlueprintReadOnly)
    FString Name;

    UPROPERTY(BlueprintReadOnly)
    float Progress;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnQuestComplete, const FQuestData&, Quest);

UCLASS()
class YOURGAME_API UBoredGamerSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UFUNCTION(BlueprintCallable, Category = "BoredGamer")
    void InitializeSDK(const FString& ApiKey, const FString& GameId, const FString& BaseUrl);

    UFUNCTION(BlueprintCallable, Category = "BoredGamer")
    void SetUserId(const FString& UserId);

    UFUNCTION(BlueprintCallable, Category = "BoredGamer")
    void TrackScoreUpdate(int32 Score, int32 Level);

    UFUNCTION(BlueprintCallable, Category = "BoredGamer")
    void TrackLevelComplete(int32 Level, float CompletionTime);

    UFUNCTION(BlueprintCallable, Category = "BoredGamer")
    void TrackEnemyKill(const FString& EnemyType, int32 Points);

    UPROPERTY(BlueprintAssignable)
    FOnQuestComplete OnQuestComplete;

private:
    FString ApiKey;
    FString GameId;
    FString BaseUrl;
    FString CurrentUserId;

    void SendEventToAPI(const FString& EventType, const TSharedPtr<FJsonObject>& EventData);
};

// Usage in Blueprint:
// 1. Get subsystem: Get Game Instance Subsystem (BoredGamer)
// 2. Initialize: Initialize SDK (API Key, Game ID, Base URL)
// 3. Set user: Set User Id (Player ID)
// 4. Track events: Track Score Update, Track Level Complete, etc.`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="testing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event Testing & Debugging</CardTitle>
                  <CardDescription>Test your integration with live events</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gameId">Game ID</Label>
                      <Input
                        id="gameId"
                        value={gameId}
                        onChange={(e) => setGameId(e.target.value)}
                        placeholder="demo-game"
                      />
                    </div>
                    <div>
                      <Label htmlFor="userId">User ID</Label>
                      <Input
                        id="userId"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="player-123"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventType">Event Type</Label>
                      <select
                        id="eventType"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                      >
                        <option value="score_update">Score Update</option>
                        <option value="level_complete">Level Complete</option>
                        <option value="enemy_kill">Enemy Kill</option>
                        <option value="item_collect">Item Collect</option>
                        <option value="achievement_unlock">Achievement Unlock</option>
                        <option value="quest_complete">Quest Complete</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="eventData">Event Data (JSON)</Label>
                      <Input
                        id="eventData"
                        value={eventData}
                        onChange={(e) => setEventData(e.target.value)}
                        placeholder='{"score": 1500, "level": 3}'
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={sendTestEvent}>Send Test Event</Button>
                    <Button variant="outline" onClick={clearEvents}>Clear Events</Button>
                  </div>

                  <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                    <h4 className="font-semibold mb-3">Recent Events</h4>
                    {events.length === 0 ? (
                      <p className="text-muted-foreground">No events yet. Send a test event to get started.</p>
                    ) : (
                      <div className="space-y-2">
                        {events.map((event, index) => (
                          <div key={index} className="border rounded p-3 bg-muted/50">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">{event.type}</span>
                              <span className="text-sm text-muted-foreground">
                                {formatTimestamp(event.timestamp)}
                              </span>
                            </div>
                            <div className="text-sm">
                              <div><strong>User:</strong> {event.userId}</div>
                              <div><strong>Data:</strong></div>
                              <pre className="bg-background p-2 rounded text-xs mt-1 overflow-x-auto">
                                {formatEventData(event.data)}
                              </pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}