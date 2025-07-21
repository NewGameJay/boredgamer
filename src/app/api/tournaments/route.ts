
import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { collection, doc, getDoc, updateDoc, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');
    const status = searchParams.get('status');
    const limit_param = searchParams.get('limit');

    if (!studioId) {
      return NextResponse.json({ error: 'Studio ID is required' }, { status: 400 });
    }

    let tournamentQuery = query(
      collection(db, 'tournaments'),
      where('studioId', '==', studioId),
      orderBy('createdAt', 'desc')
    );

    if (status) {
      tournamentQuery = query(
        collection(db, 'tournaments'),
        where('studioId', '==', studioId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    if (limit_param) {
      tournamentQuery = query(tournamentQuery, limit(parseInt(limit_param)));
    }

    const snapshot = await getDocs(tournamentQuery);
    const tournaments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, tournamentId, playerId, playerData, ...tournamentData } = body;

    switch (action) {
      case 'create':
        const newTournament = {
          ...tournamentData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          participants: [],
          brackets: [],
          currentParticipants: 0,
          status: 'draft'
        };

        const docRef = await addDoc(collection(db, 'tournaments'), newTournament);
        return NextResponse.json({ id: docRef.id, ...newTournament });

      case 'register':
        if (!tournamentId || !playerId) {
          return NextResponse.json({ error: 'Tournament ID and Player ID required' }, { status: 400 });
        }

        const tournamentRef = doc(db, 'tournaments', tournamentId);
        const tournamentSnap = await getDoc(tournamentRef);
        
        if (!tournamentSnap.exists()) {
          return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
        }

        const tournament = tournamentSnap.data();
        
        if (tournament.status !== 'registration') {
          return NextResponse.json({ error: 'Tournament not accepting registrations' }, { status: 400 });
        }

        if (tournament.currentParticipants >= tournament.maxParticipants) {
          return NextResponse.json({ error: 'Tournament is full' }, { status: 400 });
        }

        const isAlreadyRegistered = tournament.participants?.some((p: any) => p.playerId === playerId);
        if (isAlreadyRegistered) {
          return NextResponse.json({ error: 'Player already registered' }, { status: 400 });
        }

        const updatedParticipants = [
          ...(tournament.participants || []),
          {
            playerId,
            registeredAt: new Date().toISOString(),
            ...playerData
          }
        ];

        await updateDoc(tournamentRef, {
          participants: updatedParticipants,
          currentParticipants: updatedParticipants.length,
          updatedAt: new Date().toISOString()
        });

        return NextResponse.json({ message: 'Successfully registered for tournament' });

      case 'updateStatus':
        if (!tournamentId) {
          return NextResponse.json({ error: 'Tournament ID required' }, { status: 400 });
        }

        const updateRef = doc(db, 'tournaments', tournamentId);
        await updateDoc(updateRef, {
          status: body.status,
          updatedAt: new Date().toISOString()
        });

        // If activating tournament, generate brackets
        if (body.status === 'active') {
          const activeTournament = await getDoc(updateRef);
          const data = activeTournament.data();
          
          if (data?.participants && data.participants.length > 1) {
            const brackets = generateBrackets(data.participants);
            await updateDoc(updateRef, { brackets });
          }
        }

        return NextResponse.json({ message: 'Tournament status updated' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in tournament API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateBrackets(participants: any[]) {
  // Shuffle participants for fair matchmaking
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  
  const brackets = [];
  const round1Matches = [];
  
  // Create first round matches
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      round1Matches.push({
        id: `match_${i/2 + 1}`,
        round: 1,
        player1: shuffled[i],
        player2: shuffled[i + 1],
        status: 'pending',
        winner: null,
        createdAt: new Date().toISOString()
      });
    } else {
      // Bye round for odd number of participants
      round1Matches.push({
        id: `match_${i/2 + 1}`,
        round: 1,
        player1: shuffled[i],
        player2: null,
        status: 'completed',
        winner: shuffled[i],
        createdAt: new Date().toISOString()
      });
    }
  }
  
  brackets.push(...round1Matches);
  return brackets;
}
