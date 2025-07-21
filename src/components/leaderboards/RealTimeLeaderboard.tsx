
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  rank: number;
  category: string;
  timestamp: string;
  metadata?: Record<string, any>;
  deltaChange?: number;
}

interface RealTimeLeaderboardProps {
  entries: LeaderboardEntry[];
  timeFilter: string;
  categoryFilter: string;
}

export default function RealTimeLeaderboard({ entries, timeFilter, categoryFilter }: RealTimeLeaderboardProps) {
  const [filteredEntries, setFilteredEntries] = useState<LeaderboardEntry[]>([]);
  const [highlightedEntries, setHighlightedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    let filtered = [...entries];

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();

      switch (timeFilter) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(entry => new Date(entry.timestamp) >= cutoffDate);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(entry => entry.category === categoryFilter);
    }

    // Re-rank after filtering
    filtered = filtered
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    setFilteredEntries(filtered);

    // Highlight new entries briefly
    const newEntryIds = filtered.slice(0, 3).map(entry => entry.id);
    setHighlightedEntries(new Set(newEntryIds));
    setTimeout(() => setHighlightedEntries(new Set()), 2000);
  }, [entries, timeFilter, categoryFilter]);

  const getDeltaIcon = (delta: number | undefined) => {
    if (!delta || delta === 0) return null;
    if (delta > 0) return <span className="text-green-500 text-sm">↑{delta}</span>;
    return <span className="text-red-500 text-sm">↓{Math.abs(delta)}</span>;
  };

  const getScoreColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500 font-bold';
    if (rank === 2) return 'text-gray-400 font-semibold';
    if (rank === 3) return 'text-amber-600 font-semibold';
    return 'text-slate-700';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Live Leaderboard
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <Badge variant="outline">{filteredEntries.length} entries</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredEntries.slice(0, 50).map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                highlightedEntries.has(entry.id)
                  ? 'bg-blue-50 border-blue-200 scale-102'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`text-lg font-bold w-8 text-center ${getScoreColor(entry.rank)}`}>
                  #{entry.rank}
                </div>
                <div>
                  <div className="font-medium text-slate-900">{entry.playerName}</div>
                  <div className="text-sm text-slate-500">
                    {entry.category} • {new Date(entry.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getDeltaIcon(entry.deltaChange)}
                <div className={`text-xl font-bold ${getScoreColor(entry.rank)}`}>
                  {entry.score.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
          {filteredEntries.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No entries found for the selected filters
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
