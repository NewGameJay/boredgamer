
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Match {
  id: string;
  round: number;
  player1: any;
  player2: any;
  status: 'pending' | 'completed';
  winner: any;
  score?: any;
}

interface Tournament {
  id: string;
  name: string;
  brackets?: Match[];
  participants?: any[];
  status: string;
}

interface BracketVisualizationProps {
  tournament: Tournament;
}

export default function BracketVisualization({ tournament }: BracketVisualizationProps) {
  const [brackets, setBrackets] = useState<Match[]>(tournament.brackets || []);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  useEffect(() => {
    setBrackets(tournament.brackets || []);
  }, [tournament.brackets]);

  const rounds = brackets.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const maxRound = Math.max(...Object.keys(rounds).map(Number), 0);

  const handleMatchResult = async (matchId: string, winnerId: string) => {
    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/brackets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId,
          winnerId,
        }),
      });

      if (response.ok) {
        // Refresh brackets
        const updatedResponse = await fetch(`/api/tournaments/${tournament.id}/brackets`);
        const updatedData = await updatedResponse.json();
        setBrackets(updatedData.brackets);
      }
    } catch (error) {
      console.error('Error updating match result:', error);
    }
  };

  if (!brackets.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No brackets generated yet. Activate tournament to generate brackets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <div className="flex gap-8 min-w-max p-4">
          {Array.from({ length: maxRound }, (_, i) => i + 1).map((roundNum) => (
            <div key={roundNum} className="flex flex-col gap-4 min-w-[280px]">
              <h3 className="text-lg font-semibold text-center">
                {roundNum === maxRound && rounds[roundNum]?.length === 1 
                  ? 'Final' 
                  : `Round ${roundNum}`}
              </h3>
              
              {rounds[roundNum]?.map((match) => (
                <Card 
                  key={match.id} 
                  className={`cursor-pointer transition-all ${
                    match.status === 'completed' ? 'bg-green-500/10 border-green-500/30' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedMatch(match)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Match {match.id}</span>
                        <Badge variant={match.status === 'completed' ? 'default' : 'secondary'}>
                          {match.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className={`p-2 rounded text-sm ${
                          match.winner?.playerId === match.player1?.playerId ? 'bg-green-500/20 font-semibold' : 'bg-muted'
                        }`}>
                          {match.player1?.displayName || match.player1?.playerId || 'TBD'}
                        </div>
                        
                        <div className="text-center text-xs text-muted-foreground">vs</div>
                        
                        <div className={`p-2 rounded text-sm ${
                          match.winner?.playerId === match.player2?.playerId ? 'bg-green-500/20 font-semibold' : 'bg-muted'
                        }`}>
                          {match.player2?.displayName || match.player2?.playerId || 'BYE'}
                        </div>
                      </div>
                      
                      {match.status === 'pending' && match.player1 && match.player2 && (
                        <div className="flex gap-1 mt-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMatchResult(match.id, match.player1.playerId);
                            }}
                            className="flex-1 text-xs"
                          >
                            P1 Wins
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMatchResult(match.id, match.player2.playerId);
                            }}
                            className="flex-1 text-xs"
                          >
                            P2 Wins
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Tournament Champion */}
      {tournament.status === 'completed' && rounds[maxRound]?.[0]?.winner && (
        <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-yellow-500">🏆 Tournament Champion 🏆</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-xl font-bold">
              {rounds[maxRound][0].winner.displayName || rounds[maxRound][0].winner.playerId}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
