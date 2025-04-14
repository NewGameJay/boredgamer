'use client';

import { useState } from 'react';
import { createCheckoutSession, createCryptoCheckoutSession } from '@/lib/stripe/stripe-client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const plans = [
  {
    name: 'Independent',
    price: 29,
    description: 'Perfect for indie game developers',
    features: [
      'Leaderboards',
      'Tournaments',
      '24/7 Support',
      'Analytics Dashboard',
    ],
    tier: 'independent'
  },
  {
    name: 'Studio',
    price: 99,
    description: 'For growing game studios',
    features: [
      'Everything in Independent',
      'Quests & Challenges',
      'Communities',
      'Priority Support',
      'Advanced Analytics',
    ],
    tier: 'studio'
  },
  {
    name: 'Publisher',
    price: 299,
    description: 'For game publishers and ecosystems',
    features: [
      'Everything in Studio',
      'Affiliates Program',
      'White-label Solution',
      'Dedicated Account Manager',
      'Custom Integration Support',
    ],
    tier: 'ecosystem'
  }
];

export function PricingPlans() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { user } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<'fiat' | 'crypto'>('fiat');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (plan: typeof plans[0]) => {
    try {
      setIsLoading(true);
      
      // Get the price ID based on the plan and billing cycle
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_IDS?.[plan.tier]?.[billingCycle] || '';
      
      if (!user?.id) {
        throw new Error('User not found');
      }

      if (paymentMethod === 'fiat') {
        await createCheckoutSession(priceId, user.id);
      } else {
        await createCryptoCheckoutSession(priceId, user.id);
      }
    } catch (error) {
      console.error('Error starting subscription:', error);
      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to start subscription. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-8">
      {/* Payment method toggle */}
      <div className="flex justify-center gap-4 mb-4">
        <Button
          variant={paymentMethod === 'fiat' ? 'default' : 'outline'}
          onClick={() => setPaymentMethod('fiat')}
        >
          Credit Card
        </Button>
        <Button
          variant={paymentMethod === 'crypto' ? 'default' : 'outline'}
          onClick={() => setPaymentMethod('crypto')}
        >
          Cryptocurrency
        </Button>
      </div>

      {/* Billing cycle toggle */}
      <div className="flex justify-center gap-4 mb-8">
        <Button
          variant={billingCycle === 'monthly' ? 'default' : 'outline'}
          onClick={() => setBillingCycle('monthly')}
        >
          Monthly
        </Button>
        <Button
          variant={billingCycle === 'yearly' ? 'default' : 'outline'}
          onClick={() => setBillingCycle('yearly')}
        >
          Yearly (Save 20%)
        </Button>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
        {plans.map((plan) => (
          <Card key={plan.name} className={`flex flex-col ${plan.name === 'Studio' ? 'border-primary' : ''}`}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="mb-4">
                <span className="text-4xl font-bold">
                  ${billingCycle === 'yearly' ? Math.floor(plan.price * 0.8) : plan.price}
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-5 h-5 text-green-500"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.name === 'Studio' ? 'default' : 'outline'}
                onClick={() => handleSubscribe(plan)}
              >
                {user?.tier === plan.tier ? 'Current Plan' : 'Start Free Trial'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
