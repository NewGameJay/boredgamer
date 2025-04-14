'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRouter } from 'next/navigation';
import { PricingPlans } from '@/components/subscription/PricingPlans';
import './subscription.css';

export default function SubscriptionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/sign-in');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return null;
  }

  return (
    <div className="subscription-container">
      <div className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p>
          Start with a 14-day free trial. Cancel anytime. All plans include access to our core features
          and dedicated support team.
        </p>
      </div>

      <PricingPlans />
    </div>
  );
}
