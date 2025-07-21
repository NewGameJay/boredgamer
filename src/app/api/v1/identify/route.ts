
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, increment, query, where, getDocs, addDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { referralToken, userId, gameId, metadata } = body;

    if (!referralToken || !userId || !gameId) {
      return NextResponse.json(
        { error: 'Missing required fields: referralToken, userId, gameId' },
        { status: 400 }
      );
    }

    // Find the community that matches this referral token (slug)
    const communitiesRef = collection(db, 'communities');
    const q = query(communitiesRef, where('referralSlug', '==', referralToken));
    const communitySnapshot = await getDocs(q);

    if (communitySnapshot.empty) {
      return NextResponse.json(
        { error: 'Invalid referral token - community not found' },
        { status: 404 }
      );
    }

    const communityDoc = communitySnapshot.docs[0];
    const communityData = communityDoc.data();
    const communityId = communityDoc.id;

    // Check if this user has already been identified for this community
    const existingReferralQuery = query(
      collection(db, 'referrals'),
      where('communityId', '==', communityId),
      where('userId', '==', userId),
      where('gameId', '==', gameId)
    );
    const existingReferralSnapshot = await getDocs(existingReferralQuery);

    if (!existingReferralSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'User already identified for this community',
        alreadyExists: true
      });
    }

    // Create a new referral record
    const referralData = {
      communityId,
      communityName: communityData.name,
      referralSlug: referralToken,
      userId,
      gameId,
      metadata: metadata || {},
      identified: true,
      identifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: 'converted',
      referee: communityData.referee || 'direct',
      platform: communityData.platform || 'unknown',
      studioId: communityData.studioId
    };

    await addDoc(collection(db, 'referrals'), referralData);

    // Update community conversion stats
    await updateDoc(doc(db, 'communities', communityId), {
      conversionCount: increment(1),
      lastConversionAt: new Date().toISOString(),
      memberCount: increment(1)
    });

    // Process community rewards if any
    if (communityData.rewards && Array.isArray(communityData.rewards)) {
      const rewardPromises = communityData.rewards.map(async (reward) => {
        if (reward.amount > 0) {
          // Create reward record
          await addDoc(collection(db, 'rewards'), {
            userId,
            communityId,
            type: reward.type,
            amount: reward.amount,
            metadata: reward.metadata || {},
            status: 'pending',
            createdAt: new Date().toISOString(),
            referralId: referralToken
          });
        }
      });
      await Promise.all(rewardPromises);
    }

    // Log the successful identification for analytics
    await addDoc(collection(db, 'analytics_events'), {
      type: 'user_identified',
      communityId,
      userId,
      gameId,
      timestamp: new Date().toISOString(),
      metadata: {
        referee: communityData.referee,
        platform: communityData.platform,
        rewards: communityData.rewards?.length || 0
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User identified successfully',
      communityId,
      communityName: communityData.name,
      rewards: communityData.rewards || [],
      memberCount: (communityData.memberCount || 0) + 1
    });

  } catch (error) {
    console.error('Error in identify API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve referral stats
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    const userId = searchParams.get('userId');

    if (!communityId && !userId) {
      return NextResponse.json(
        { error: 'Must provide either communityId or userId' },
        { status: 400 }
      );
    }

    let q;
    if (communityId && userId) {
      q = query(
        collection(db, 'referrals'),
        where('communityId', '==', communityId),
        where('userId', '==', userId)
      );
    } else if (communityId) {
      q = query(
        collection(db, 'referrals'),
        where('communityId', '==', communityId),
        where('identified', '==', true)
      );
    } else {
      q = query(
        collection(db, 'referrals'),
        where('userId', '==', userId),
        where('identified', '==', true)
      );
    }

    const snapshot = await getDocs(q);
    const referrals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      referrals,
      count: referrals.length
    });

  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
