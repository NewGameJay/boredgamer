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
      
      <Tabs defaultValue="manage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="manage">Manage Leaderboards</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="setup">Setup Guide</TabsTrigger>
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
              <CardDescription>Configure and manage your game's leaderboard</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="create" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="create">Create Leaderboard</TabsTrigger>
                  <TabsTrigger value="manage">Manage Existing</TabsTrigger>
                </TabsList>

                {/* Create New Leaderboard */}
                <TabsContent value="create">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Basic Settings</h3>
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <label>Leaderboard Name</label>
                          <input type="text" placeholder="High Scores" className="input" />
                        </div>
                        <div className="grid gap-2">
                          <label>Sort Order</label>
                          <select className="select">
                            <option value="desc">Descending (Highest First)</option>
                            <option value="asc">Ascending (Lowest First)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Score Settings</h3>
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <label>Score Type</label>
                          <select className="select">
                            <option value="number">Number</option>
                            <option value="time">Time</option>
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" />
                            Custom Point System
                          </label>
                          <div className="pl-6 space-y-2">
                            <input type="text" placeholder="Formula (e.g., kills * 100 + score)" className="input" disabled />
                            <input type="text" placeholder="Variables (comma-separated)" className="input" disabled />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Time Settings</h3>
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <label>Period Type</label>
                          <select className="select">
                            <option value="rolling">Rolling</option>
                            <option value="fixed">Fixed</option>
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <label>Time Period</label>
                          <select className="select">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="seasonal">Seasonal</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <label>Start Date</label>
                            <input type="date" className="input" disabled />
                          </div>
                          <div className="grid gap-2">
                            <label>End Date</label>
                            <input type="date" className="input" disabled />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Metadata Fields</h3>
                      <div className="space-y-4">
                        <div className="grid gap-4">
                          {/* Sample metadata field */}
                          <div className="grid grid-cols-4 gap-4 items-center bg-slate-100 p-4 rounded-lg">
                            <input type="text" placeholder="Field Name" className="input" />
                            <select className="select">
                              <option value="number">Number</option>
                              <option value="string">Text</option>
                              <option value="array">Array</option>
                            </select>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2">
                                <input type="checkbox" />
                                Filterable
                              </label>
                              <label className="flex items-center gap-2">
                                <input type="checkbox" />
                                Required
                              </label>
                            </div>
                            <Button variant="ghost" size="icon">
                              <span className="sr-only">Remove field</span>
                              ×
                            </Button>
                          </div>
                          <Button variant="outline" className="w-full">
                            + Add Metadata Field
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Limits</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <label>Max Entries</label>
                          <input type="number" placeholder="1000" className="input" />
                        </div>
                        <div className="grid gap-2">
                          <label>Submissions Per User</label>
                          <input type="number" placeholder="1" className="input" />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-4">
                      <Button variant="outline">Cancel</Button>
                      <Button>Create Leaderboard</Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Manage Existing Leaderboard */}
                <TabsContent value="manage">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">High Scores</h3>
                        <p className="text-sm text-slate-500">Last updated 5 minutes ago</p>
                      </div>
                      <div className="flex gap-4">
                        <Button variant="outline">Edit</Button>
                        <Button variant="outline">Reset</Button>
                        <Button variant="destructive">Delete</Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <select className="select flex-1">
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

                      {/* Live Preview */}
                      <div className="bg-slate-100 rounded-lg overflow-hidden">
                        <div className="p-4 bg-slate-200">
                          <h4 className="font-semibold">Live Preview</h4>
                        </div>
                        <div className="p-4">
                          <div className="space-y-2">
                            {/* Sample entries */}
                            <div className="grid grid-cols-6 gap-4 py-2 border-b">
                              <div className="font-semibold">#1</div>
                              <div className="col-span-2">PlayerOne</div>
                              <div>1,000,000</div>
                              <div className="text-sm text-slate-500">Level 5</div>
                              <div className="text-sm text-slate-500">2m ago</div>
                            </div>
                            {/* Add more entries */}
                          </div>
                        </div>
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
                </TabsContent>
              </Tabs>
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
