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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Start with a 14-day free trial. Cancel anytime. All plans include access to our core features
            and dedicated support team.
          </p>
        </div>

        <PricingPlans />
      </div>
    </div>
  );
}
