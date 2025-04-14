import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '@/lib/auth/auth-context';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutButtonProps {
  priceId: string;
  tier: string;
  isYearly: boolean;
}

export default function CheckoutButton({ priceId, tier, isYearly }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleCheckout = async () => {
    try {
      setLoading(true);
      
      // Create a Checkout Session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: user?.id,
          tier,
          isYearly
        }),
      });

      const { sessionId } = await response.json();

      // Redirect to Checkout
      const stripe = await stripePromise;
      const { error } = await stripe!.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Error in checkout:', err);
      // You might want to show an error toast here
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full px-6 py-3 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? 'Processing...' : `Subscribe to ${tier}`}
    </button>
  );
}
