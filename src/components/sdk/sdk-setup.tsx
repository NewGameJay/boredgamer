'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export function SDKSetup() {
  const [apiKey, setApiKey] = useState<string>('');
  const [gameId, setGameId] = useState<string>('');
  const [authorizedDomains, setAuthorizedDomains] = useState<string[]>([]);
  const [buildHashes, setBuildHashes] = useState<string[]>([]);
  const [eventLogs, setEventLogs] = useState<string[]>([]);

  const generateApiKey = () => {
    // TODO: API call to generate key
    setApiKey('bg_test_123456789');
  };

  const generateGameId = () => {
    // TODO: API call to generate game ID
    setGameId('game_123456789');
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Getting Started </CardTitle>
        <CardDescription>Follow these steps to integrate the BoredGamer SDK into your game</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="api" className="space-y-4">
          <TabsList>
            <TabsTrigger value="api">API Setup</TabsTrigger>
            <TabsTrigger value="guide">Setup Guide</TabsTrigger>
            <TabsTrigger value="events">Event Monitor</TabsTrigger>
          </TabsList>

          {/* API Setup */}
          <TabsContent value="api">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">API Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2">API Key</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={apiKey}
                        readOnly
                        className="input flex-1 font-mono"
                        placeholder="Generate an API key to get started"
                      />
                      <Button onClick={generateApiKey}>Generate</Button>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2">Game ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={gameId}
                        readOnly
                        className="input flex-1 font-mono"
                        placeholder="Generate a Game ID"
                      />
                      <Button onClick={generateGameId}>Generate</Button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2">Authorized Domains</label>
                    <div className="space-y-2">
                      {authorizedDomains.map((domain, i) => (
                        <div key={i} className="flex gap-2">
                          <input type="text" value={domain} readOnly className="input flex-1" />
                          <Button variant="ghost" onClick={() => setAuthorizedDomains(authorizedDomains.filter((_, j) => j !== i))}>×</Button>
                        </div>
                      ))}
                      <Button variant="outline" onClick={() => setAuthorizedDomains([...authorizedDomains, ''])}>
                        + Add Domain
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2">Build Hashes</label>
                    <div className="space-y-2">
                      {buildHashes.map((hash, i) => (
                        <div key={i} className="flex gap-2">
                          <input type="text" value={hash} readOnly className="input flex-1 font-mono" />
                          <Button variant="ghost" onClick={() => setBuildHashes(buildHashes.filter((_, j) => j !== i))}>×</Button>
                        </div>
                      ))}
                      <Button variant="outline" onClick={() => setBuildHashes([...buildHashes, ''])}>
                        + Add Build Hash
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Setup Guide */}
          <TabsContent value="guide">
            <div className="space-y-6">
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
  apiKey: '${apiKey || 'your-api-key'}',
  gameId: '${gameId || 'your-game-id'}'
});

await sdk.initialize();`}
                </pre>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">3. Submit Events</h3>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg">
                  {`// Submit a score with metadata
await sdk.submitScore(1000, "PlayerName", {
  level: 5,
  timeElapsed: "2m30s",
  weapons: ["sword", "bow"],
  enemiesKilled: 50
});`}
                </pre>
              </div>
            </div>
          </TabsContent>

          {/* Event Monitor */}
          <TabsContent value="events">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Live Event Stream</h3>
                <Button variant="outline" onClick={() => setEventLogs([])}>Clear</Button>
              </div>
              <div className="bg-slate-900 text-slate-50 p-4 rounded-lg h-[400px] overflow-y-auto font-mono text-sm">
                {eventLogs.length === 0 ? (
                  <div className="text-slate-500">No events received yet. Start sending events from your game to see them here.</div>
                ) : (
                  <div className="space-y-2">
                    {eventLogs.map((log, i) => (
                      <div key={i} className="border-b border-slate-800 pb-2">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
