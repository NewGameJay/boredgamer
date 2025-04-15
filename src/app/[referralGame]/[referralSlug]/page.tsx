import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { redirect } from 'next/navigation';

interface Community {
  id: string;
  referralDestination: string;
  visitCount: number;
}

export default async function Page({ params }: { params: { referralGame: string; referralSlug: string } }) {
  const { referralGame, referralSlug } = params;

  // Query Firestore for the community
  const q = query(
    collection(db, 'communities'),
    where('referralGame', '==', referralGame),
    where('referralSlug', '==', referralSlug)
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    // Community not found, show a 404 or fallback
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1>Community Not Found</h1>
        <p>The referral link you followed does not exist.</p>
      </div>
    );
  }

  const docSnap = querySnapshot.docs[0];
  const community = docSnap.data() as Community;

  // Increment visitCount atomically
  await updateDoc(doc(db, 'communities', docSnap.id), {
    visitCount: increment(1),
    lastVisitedAt: new Date().toISOString(),
  });

  // Redirect to the referral destination
  redirect(community.referralDestination);

  // Fallback (should not render)
  return null;
}
