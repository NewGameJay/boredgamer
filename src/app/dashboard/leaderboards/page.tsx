'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export default function LeaderboardDashboard() {
  const [activeTab, setActiveTab] = useState('setup');

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Leaderboard Dashboard</h1>
      
      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="setup">Setup Guide</TabsTrigger>
          <TabsTrigger value="manage">Manage Leaderboards</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Setup Guide */}
        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started with Leaderboards</CardTitle>
              <CardDescription>Follow these steps to add leaderboards to your game</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">1. Install the SDK</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg">
                  npm install @boredgamer/sdk
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">2. Initialize the SDK</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg">
                  {`import { BoredGamerSDK } from '@boredgamer/sdk';

const sdk = new BoredGamerSDK({
  apiKey: 'your-api-key',
  gameId: 'your-game-id'
});

await sdk.initialize();`}
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">3. Submit Scores</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg">
                  {`// Submit a high score
await sdk.submitScore(1000, "PlayerName", {
  category: "high_score",  // Optional category
  metadata: {             // Optional metadata
    level: 5,
    timeElapsed: "2m30s"
  }
});`}
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">4. Display Leaderboard</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg">
                  {`// Get top scores
const leaderboard = await sdk.getLeaderboard({
  category: "high_score",  // Optional: filter by category
  timeframe: "weekly",     // Optional: all-time, daily, weekly, monthly
  limit: 10               // Optional: number of entries
});

// Listen for real-time updates
sdk.onLeaderboardUpdate((entry) => {
  // Update your UI with the new entry
  console.log("New score:", entry);
});`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Leaderboards */}
        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Manage Leaderboards</CardTitle>
              <CardDescription>Configure and moderate your leaderboards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Categories Section */}
                <section>
                  <h3 className="text-lg font-semibold mb-4">Leaderboard Categories</h3>
                  <div className="grid gap-4">
                    <Button variant="outline" className="justify-start">
                      🏆 High Score
                    </Button>
                    <Button variant="outline" className="justify-start">
                      ⚡ Fastest Run
                    </Button>
                    <Button variant="outline" className="justify-start">
                      💀 Most Kills
                    </Button>
                    <Button variant="ghost" className="justify-start">
                      + Add New Category
                    </Button>
                  </div>
                </section>

                {/* Moderation Section */}
                <section>
                  <h3 className="text-lg font-semibold mb-4">Recent Submissions</h3>
                  <div className="space-y-2">
                    {/* Sample entries */}
                    <div className="flex items-center justify-between p-2 bg-slate-100 rounded">
                      <div>
                        <span className="font-medium">PlayerOne</span>
                        <span className="text-sm text-slate-500 ml-2">1,000,000 pts</span>
                      </div>
                      <Button variant="destructive" size="sm">Remove</Button>
                    </div>
                    {/* Add more entries */}
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard Preview</CardTitle>
              <CardDescription>See how your leaderboard will look in-game</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Sample leaderboard entries */}
                <div className="bg-slate-100 p-4 rounded-lg">
                  <div className="grid grid-cols-4 gap-4 font-semibold mb-2">
                    <div>Rank</div>
                    <div>Player</div>
                    <div>Score</div>
                    <div>Date</div>
                  </div>
                  {/* Sample rows */}
                  <div className="grid grid-cols-4 gap-4">
                    <div>1</div>
                    <div>PlayerOne</div>
                    <div>1,000,000</div>
                    <div>2024-03-13</div>
                  </div>
                  {/* Add more rows */}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
