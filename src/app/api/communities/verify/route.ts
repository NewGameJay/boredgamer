
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, updateDoc, query, where, getDocs, addDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { communityId, userId, verificationMethod, verificationData } = body;

    if (!communityId || !userId || !verificationMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get community details
    const communityDoc = await getDoc(doc(db, 'communities', communityId));
    if (!communityDoc.exists()) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    const communityData = communityDoc.data();

    // Check if community requires verification
    if (communityData.type === 'public') {
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Public community - no verification required'
      });
    }

    // Process verification based on method
    let verified = false;
    let verificationResult = {};

    switch (verificationMethod) {
      case 'email':
        // For demo purposes, accept any email format
        verified = verificationData.email && verificationData.email.includes('@');
        verificationResult = { email: verificationData.email };
        break;
        
      case 'discord':
        // For demo purposes, accept any discord username
        verified = verificationData.discordUsername && verificationData.discordUsername.length > 3;
        verificationResult = { discordUsername: verificationData.discordUsername };
        break;
        
      case 'wallet':
        // For demo purposes, accept any wallet address format
        verified = verificationData.walletAddress && verificationData.walletAddress.startsWith('0x');
        verificationResult = { walletAddress: verificationData.walletAddress };
        break;
        
      default:
        return NextResponse.json(
          { error: 'Unsupported verification method' },
          { status: 400 }
        );
    }

    if (verified) {
      // Record the verification
      await addDoc(collection(db, 'member_verifications'), {
        communityId,
        userId,
        verificationMethod,
        verificationData: verificationResult,
        verified: true,
        verifiedAt: new Date().toISOString(),
        status: 'approved'
      });

      // Update community member count if this is a new member
      const existingMemberQuery = query(
        collection(db, 'member_verifications'),
        where('communityId', '==', communityId),
        where('userId', '==', userId),
        where('verified', '==', true)
      );
      const existingMembers = await getDocs(existingMemberQuery);
      
      if (existingMembers.size === 1) { // Only count if this is their first verification
        await updateDoc(doc(db, 'communities', communityId), {
          verifiedMemberCount: (communityData.verifiedMemberCount || 0) + 1
        });
      }
    }

    return NextResponse.json({
      success: true,
      verified,
      verificationMethod,
      communityName: communityData.name,
      message: verified ? 'Verification successful' : 'Verification failed'
    });

  } catch (error) {
    console.error('Error in verify API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check member verification status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId');
    const userId = searchParams.get('userId');

    if (!communityId || !userId) {
      return NextResponse.json(
        { error: 'Missing communityId or userId' },
        { status: 400 }
      );
    }

    const q = query(
      collection(db, 'member_verifications'),
      where('communityId', '==', communityId),
      where('userId', '==', userId),
      where('verified', '==', true)
    );

    const snapshot = await getDocs(q);
    const verifications = snapshot.docs.map(doc => doc.data());

    return NextResponse.json({
      success: true,
      verified: verifications.length > 0,
      verifications,
      hasAccess: verifications.length > 0
    });

  } catch (error) {
    console.error('Error checking verification status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
