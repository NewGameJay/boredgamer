'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';

export default function CommunityRedirect() {
  const { game, community } = useParams();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        // Find the community by game and slug
        const communitiesRef = collection(db, 'communities');
        const q = query(
          communitiesRef, 
          where('referralGame', '==', game),
          where('referralSlug', '==', community)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const communityDoc = querySnapshot.docs[0];
          const communityData = communityDoc.data();

          // Track the visit
          await updateDoc(communityDoc.ref, {
            visitCount: increment(1),
            lastVisitedAt: new Date().toISOString()
          });

          // Redirect to the destination URL
          window.location.href = communityData.referralDestination;
        } else {
          console.error('Community not found');
          // Redirect to a 404 page or homepage
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Error handling redirect:', error);
        window.location.href = '/';
      }
    };

    handleRedirect();
  }, [game, community]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
        <p>Please wait while we redirect you to your destination.</p>
      </div>
    </div>
  );
}
