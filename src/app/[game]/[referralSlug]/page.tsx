'use client';

import React from 'react';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';

export default function CommunityRedirect() {
  const params = useParams();
  console.log('useParams() result:', params);
  const { game, referralSlug } = params;

  const [error, setError] = React.useState<string | null>(null);
  const [debug, setDebug] = React.useState<any>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        // Find the community by game and slug
        const communitiesRef = collection(db, 'communities');
        const q = query(
          communitiesRef, 
          where('referralGame', '==', game),
          where('referralSlug', '==', referralSlug)
        );
        console.log('Querying for:', { referralGame: game, referralSlug });
        const querySnapshot = await getDocs(q);
        console.log('QuerySnapshot size:', querySnapshot.size);
        setDebug({ params, query: { referralGame: game, referralSlug }, querySnapshotSize: querySnapshot.size });

        if (!querySnapshot.empty) {
          const communityDoc = querySnapshot.docs[0];
          const communityData = communityDoc.data();

          // Track the visit
          await updateDoc(communityDoc.ref, {
            visitCount: increment(1),
            lastVisitedAt: new Date().toISOString()
          });

          // Append the referralSlug as the referral token to the destination URL
          const destinationUrl = new URL(communityData.referralDestination);
          destinationUrl.searchParams.set('referralToken', referralSlug.toString());
          window.location.href = destinationUrl.toString();
        } else {
          console.error('Community not found');
          // Redirect to a 404 page or homepage
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Error handling redirect:', error);
        setError('Error handling redirect: ' + (error instanceof Error ? error.message : JSON.stringify(error)));
        // window.location.href = '/'; // Disabled for debugging
      }
    };

    handleRedirect();
  }, [game, referralSlug]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
        <p>Please wait while we redirect you to your destination.</p>
        {error && (
          <div style={{ color: 'red', marginTop: 20 }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        {debug && (
          <pre style={{ textAlign: 'left', margin: '2em auto', maxWidth: 600, background: '#f9f9f9', padding: 16, borderRadius: 8 }}>
            {JSON.stringify(debug, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
