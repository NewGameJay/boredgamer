'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Documentation() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
        Documentation
      </h1>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="events">Events API</TabsTrigger>
          <TabsTrigger value="leaderboards">Leaderboards</TabsTrigger>
          <TabsTrigger value="sdk">SDK Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Events API</CardTitle>
              <CardDescription>Track and analyze game events in real-time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <section>
                <h3 className="text-xl font-semibold mb-4">Getting Started</h3>
                <ol className="list-decimal pl-6 space-y-4">
                  <li>
                    <p className="mb-2">Set up your Game ID in the dashboard</p>
                    <pre className="bg-slate-800 p-4 rounded-lg overflow-x-auto">
                      <code>// Your Game ID will be used to identify events from your game</code>
                    </pre>
                  </li>
                  <li>
                    <p className="mb-2">Get your API key from the dashboard</p>
                    <pre className="bg-slate-800 p-4 rounded-lg overflow-x-auto">
                      <code>// Your API key is required for authentication</code>
                    </pre>
                  </li>
                </ol>
              </section>

              <section>
                <h3 className="text-xl font-semibold mb-4">Sending Events</h3>
                <p className="mb-4">Send events to our API using a simple POST request:</p>
                <pre className="bg-slate-800 p-4 rounded-lg overflow-x-auto">
                  <code>{`fetch('https://boredgamer.com/api/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key'
  },
  body: JSON.stringify({
    gameId: 'your-game-id',
    type: 'event-type',
    data: {
      // Your event data here
    }
  })
})`}</code>
                </pre>
              </section>

              <section>
                <h3 className="text-xl font-semibold mb-4">Event Types</h3>
                <p className="mb-4">Common event types you might want to track:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><code>game_started</code> - When a new game session begins</li>
                  <li><code>game_completed</code> - When a game session ends</li>
                  <li><code>level_completed</code> - When a player completes a level</li>
                  <li><code>achievement_unlocked</code> - When a player unlocks an achievement</li>
                  <li><code>item_purchased</code> - When a player makes an in-game purchase</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-semibold mb-4">Monitoring Events</h3>
                <p>You can view your events in real-time in the Events Monitor tab of your dashboard. Events are:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Ordered by timestamp (newest first)</li>
                  <li>Filtered by your Game ID</li>
                  <li>Limited to the 100 most recent events</li>
                </ul>
              </section>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboards">
          <Card>
            <CardHeader>
              <CardTitle>Leaderboards</CardTitle>
              <CardDescription>Create and manage game leaderboards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <section>
                <h3 className="text-xl font-semibold mb-4">Coming Soon</h3>
                <p>Leaderboard functionality will be available in a future update.</p>
              </section>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sdk">
          <Card>
            <CardHeader>
              <CardTitle>SDK Setup</CardTitle>
              <CardDescription>Set up your game with our SDK</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <section>
                <h3 className="text-xl font-semibold mb-4">Coming Soon</h3>
                <p>Our JavaScript SDK will be available soon, making it even easier to integrate with our services.</p>
              </section>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
