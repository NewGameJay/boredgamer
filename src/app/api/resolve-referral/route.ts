import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const game = searchParams.get('game');
  const referralSlug = searchParams.get('referralSlug');

  if (!game || !referralSlug) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const q = query(
    collection(db, 'communities'),
    where('game', '==', game),
    where('referralSlug', '==', referralSlug)
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const docSnap = querySnapshot.docs[0];
  const community = docSnap.data();

  // Increment visitCount atomically
  await updateDoc(doc(db, 'communities', docSnap.id), {
    visitCount: increment(1),
    lastVisitedAt: new Date().toISOString(),
  });

  return NextResponse.json({ referralDestination: community.referralDestination });
}
