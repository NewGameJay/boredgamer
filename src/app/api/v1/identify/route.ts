import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { referralToken, userId, gameId, metadata } = body;

    if (!referralToken || !userId || !gameId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the referral document using the token
    const referralsRef = collection(db, 'referrals');
    const referralDoc = doc(referralsRef, referralToken);
    const referralSnapshot = await getDoc(referralDoc);

    if (!referralSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Invalid referral token' },
        { status: 404 }
      );
    }

    const referralData = referralSnapshot.data();

    // Update the referral document with the user identification
    await updateDoc(referralDoc, {
      identified: true,
      identifiedAt: new Date().toISOString(),
      userId,
      gameId,
      metadata: metadata || {},
      status: 'converted'
    });

    // Update community stats
    if (referralData.communityId) {
      const communityRef = doc(db, 'communities', referralData.communityId);
      const communitySnapshot = await getDoc(communityRef);
      
      if (communitySnapshot.exists()) {
        const communityData = communitySnapshot.data();
        await updateDoc(communityRef, {
          conversionCount: (communityData.conversionCount || 0) + 1,
          lastConversionAt: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User identified successfully'
    });
  } catch (error) {
    console.error('Error in identify API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
