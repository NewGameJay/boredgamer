import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { LeaderboardEntry } from '../types';

// In-memory store for leaderboard data
const leaderboardStore: LeaderboardEntry[] = [];

export async function startMockServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Session endpoints
  app.post('/sessions/start', (req, res) => {
    const { playerId } = req.body;
    res.json({
      id: `session-${Date.now()}`,
      playerId,
      startTime: new Date().toISOString()
    });
  });

  app.post('/sessions/:id/end', (req, res) => {
    const { id } = req.params;
    res.json({
      id,
      endTime: new Date().toISOString()
    });
  });

  // Player endpoints
  app.get('/players/:id', (req, res) => {
    const { id } = req.params;
    res.json({
      id,
      name: 'Test Player',
      metadata: {}
    });
  });

  // Leaderboard endpoints
  app.post('/leaderboard/submit', (req, res) => {
    const entry = req.body;
    const timestamp = new Date().toISOString();
    
    // Add or update leaderboard entry
    const index = leaderboardStore.findIndex(e => e.playerId === entry.playerId);
    if (index !== -1) {
      leaderboardStore[index] = { ...entry, timestamp, rank: index + 1 };
    } else {
      leaderboardStore.push({ ...entry, timestamp, rank: leaderboardStore.length + 1 });
    }

    // Sort leaderboard by score
    leaderboardStore.sort((a, b) => b.score - a.score);

    // Update ranks
    leaderboardStore.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Broadcast update to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'leaderboard_update',
          data: entry
        }));
      }
    });

    res.json({ success: true });
  });

  app.get('/leaderboard', (req, res) => {
    const { timeframe = 'all', limit = 10, offset = 0 } = req.query;
    let entries = [...leaderboardStore];

    if (timeframe !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      switch (timeframe) {
        case 'daily':
          cutoff.setDate(now.getDate() - 1);
          break;
        case 'weekly':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }
      entries = entries.filter(entry => new Date(entry.timestamp) >= cutoff);
    }

    res.json(entries.slice(Number(offset), Number(offset) + Number(limit)));
  });

  app.get('/leaderboard/:gameId/player/:playerId', (req, res) => {
    const { playerId } = req.params;
    const entry = leaderboardStore.find(e => e.playerId === playerId);
    res.json(entry || null);
  });

  // WebSocket connection handling
  wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received:', data);
      } catch (error) {
        console.error('Invalid message format:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  // Start server
  await new Promise<void>((resolve) => {
    server.listen(3001, () => {
      console.log('Mock API server running on port 3001');
      resolve();
    });
  });

  return {
    close: () => {
      return new Promise<void>((resolve) => {
        wss.close(() => {
          server.close(() => resolve());
        });
      });
    }
  };
}
