export type SubscriptionTier = 'independent' | 'studio' | 'ecosystem';

export interface TierLimits {
  retentionDays: number;
  requestsPerMinute: number;
  maxLeaderboards: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  independent: {
    retentionDays: 15,
    requestsPerMinute: 60,
    maxLeaderboards: 3
  },
  studio: {
    retentionDays: 30,
    requestsPerMinute: 300,
    maxLeaderboards: 10
  },
  ecosystem: {
    retentionDays: 180, // 6 months
    requestsPerMinute: 1000,
    maxLeaderboards: 50
  }
};
