import { Timestamp } from 'firebase/firestore';

export interface Studio {
  id: string;
  studioId: string;  // Added for compatibility
  name: string;
  email: string;
  tier: 'independent' | 'studio' | 'ecosystem';
  subscriptionStatus: 'trial' | 'active' | 'inactive' | 'cancelled';
  trialEndsAt?: Timestamp;
  currentPeriodEnd?: Timestamp;
  features: {
    leaderboards: boolean;
    quests: boolean;
    tournaments: boolean;
    matchmaking: boolean;
    creatorProgram: boolean;
    communities?: boolean;
    affiliates?: boolean;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AuthState {
  user: Studio | null;
  loading: boolean;
  error: string | null;
}

export interface SignUpData {
  studioName: string;
  email: string;
  password: string;
}

export interface SignInData {
  email: string;
  password: string;
}
