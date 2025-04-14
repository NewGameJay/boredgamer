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
    price: 99,
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
    price: 249,
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
    price: 499,
    description: 'For game publishers',
    features: [
      'Everything in Studio',
      'Affiliates Program',
      'White-label Solution',
      'Dedicated Account Manager',
      'Custom Integration Support',
    ],
    tier: 'publisher'
  },
  {
    name: 'Ecosystem',
    price: 999,
    description: 'For game ecosystems and platforms',
    features: [
      'Everything in Publisher',
      'Custom Features',
      'Enterprise Support',
      'Custom Integrations',
      'Dedicated Success Team',
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
    <div>
      <div className="toggle-container">
        {/* Payment method toggle */}
        <div className="toggle-group">
          <button
            className={`toggle-button ${paymentMethod === 'fiat' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('fiat')}
          >
            Credit Card
          </button>
          <button
            className={`toggle-button ${paymentMethod === 'crypto' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('crypto')}
          >
            Cryptocurrency
          </button>
        </div>

        {/* Billing cycle toggle */}
        <div className="toggle-group">
          <button
            className={`toggle-button ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            className={`toggle-button ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly (Save 20%)
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="pricing-grid">
        {plans.map((plan) => (
          <div 
            key={plan.name} 
            className={`pricing-card ${plan.name === 'Studio' ? 'popular' : ''}`}
          >
            <div className="pricing-amount">
              <span className="amount">
                ${billingCycle === 'yearly' ? Math.floor(plan.price * 0.8) : plan.price}
              </span>
              <span className="period">/month</span>
            </div>
            <h3 className="pricing-title">{plan.name}</h3>
            <p className="pricing-description">{plan.description}</p>
            <ul className="pricing-features">
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button
              className={`btn ${plan.name === 'Studio' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleSubscribe(plan)}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 
                user?.tier === plan.tier ? 'Current Plan' : 'Start 14-day free trial'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
