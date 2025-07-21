
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tournamentRef = doc(db, 'tournaments', params.id);
    const tournamentSnap = await getDoc(tournamentRef);
    
    if (!tournamentSnap.exists()) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournament = tournamentSnap.data();
    return NextResponse.json({ brackets: tournament.brackets || [] });
  } catch (error) {
    console.error('Error fetching brackets:', error);
    return NextResponse.json({ error: 'Failed to fetch brackets' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { matchId, winnerId, score } = await request.json();
    
    const tournamentRef = doc(db, 'tournaments', params.id);
    const tournamentSnap = await getDoc(tournamentRef);
    
    if (!tournamentSnap.exists()) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const tournament = tournamentSnap.data();
    const brackets = tournament.brackets || [];
    
    // Find and update the specific match
    const updatedBrackets = brackets.map((match: any) => {
      if (match.id === matchId) {
        return {
          ...match,
          status: 'completed',
          winner: winnerId,
          score: score || null,
          completedAt: new Date().toISOString()
        };
      }
      return match;
    });

    // Check if round is complete and generate next round
    const currentRound = brackets.find((m: any) => m.id === matchId)?.round;
    const roundMatches = updatedBrackets.filter((m: any) => m.round === currentRound);
    const completedMatches = roundMatches.filter((m: any) => m.status === 'completed');
    
    if (completedMatches.length === roundMatches.length && completedMatches.length > 1) {
      // Generate next round
      const winners = completedMatches.map((m: any) => m.winner);
      const nextRoundMatches = generateNextRound(winners, currentRound + 1);
      updatedBrackets.push(...nextRoundMatches);
    }

    await updateDoc(tournamentRef, {
      brackets: updatedBrackets,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ message: 'Match result updated successfully' });
  } catch (error) {
    console.error('Error updating match result:', error);
    return NextResponse.json({ error: 'Failed to update match result' }, { status: 500 });
  }
}

function generateNextRound(winners: any[], round: number) {
  const matches = [];
  
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      matches.push({
        id: `match_r${round}_${i/2 + 1}`,
        round,
        player1: winners[i],
        player2: winners[i + 1],
        status: 'pending',
        winner: null,
        createdAt: new Date().toISOString()
      });
    }
  }
  
  return matches;
}
