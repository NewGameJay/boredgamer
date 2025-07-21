
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId');
    const communityId = searchParams.get('communityId');
    const timeframe = searchParams.get('timeframe') || '30d';

    if (!studioId && !communityId) {
      return NextResponse.json(
        { error: 'Must provide either studioId or communityId' },
        { status: 400 }
      );
    }

    // Calculate date range
    const now = new Date();
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    let communities = [];
    
    if (communityId) {
      // Get specific community data
      const communitiesQuery = query(
        collection(db, 'communities'),
        where('__name__', '==', communityId)
      );
      const communitiesSnapshot = await getDocs(communitiesQuery);
      communities = communitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      // Get all communities for studio
      const communitiesQuery = query(
        collection(db, 'communities'),
        where('studioId', '==', studioId)
      );
      const communitiesSnapshot = await getDocs(communitiesQuery);
      communities = communitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Get referral data for the timeframe
    const referralsQuery = query(
      collection(db, 'referrals'),
      where('createdAt', '>=', startDate.toISOString()),
      orderBy('createdAt', 'desc')
    );
    const referralsSnapshot = await getDocs(referralsQuery);
    const allReferrals = referralsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter referrals by communities
    const communityIds = communities.map(c => c.id);
    const referrals = allReferrals.filter(r => communityIds.includes(r.communityId));

    // Calculate analytics
    const analytics = {
      overview: {
        totalCommunities: communities.length,
        totalVisits: communities.reduce((sum, c) => sum + (c.visitCount || 0), 0),
        totalConversions: referrals.filter(r => r.identified).length,
        conversionRate: 0,
        timeframe: timeframe
      },
      performance: {
        topCommunities: communities
          .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
          .slice(0, 5)
          .map(c => ({
            id: c.id,
            name: c.name,
            visits: c.visitCount || 0,
            conversions: referrals.filter(r => r.communityId === c.id && r.identified).length,
            conversionRate: c.visitCount > 0 ? 
              (referrals.filter(r => r.communityId === c.id && r.identified).length / c.visitCount * 100).toFixed(1) : '0'
          })),
        
        refereeBreakdown: communities.reduce((acc, c) => {
          const key = c.referee || 'direct';
          acc[key] = (acc[key] || 0) + (c.visitCount || 0);
          return acc;
        }, {}),
        
        platformBreakdown: communities.reduce((acc, c) => {
          const key = c.platform || 'unknown';
          acc[key] = (acc[key] || 0) + (c.visitCount || 0);
          return acc;
        }, {})
      },
      timeline: generateTimelineData(referrals, days),
      conversions: {
        recent: referrals
          .filter(r => r.identified)
          .sort((a, b) => new Date(b.identifiedAt || b.createdAt).getTime() - new Date(a.identifiedAt || a.createdAt).getTime())
          .slice(0, 10)
          .map(r => ({
            userId: r.userId,
            communityName: r.communityName,
            identifiedAt: r.identifiedAt,
            metadata: r.metadata
          }))
      }
    };

    // Calculate conversion rate
    if (analytics.overview.totalVisits > 0) {
      analytics.overview.conversionRate = Number(
        (analytics.overview.totalConversions / analytics.overview.totalVisits * 100).toFixed(2)
      );
    }

    return NextResponse.json({
      success: true,
      analytics,
      communities: communities.length,
      referrals: referrals.length
    });

  } catch (error) {
    console.error('Error fetching community analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateTimelineData(referrals: any[], days: number) {
  const timeline = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayReferrals = referrals.filter(r => {
      const referralDate = new Date(r.createdAt).toISOString().split('T')[0];
      return referralDate === dateStr;
    });
    
    timeline.push({
      date: dateStr,
      visits: dayReferrals.length,
      conversions: dayReferrals.filter(r => r.identified).length
    });
  }
  
  return timeline;
}
