import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

const TRIAL_PERIOD_DAYS = 14;

export async function POST(request: Request) {
  try {
    const { priceId, userId, tier, isYearly } = await request.json();

    // Get or create customer
    let customer;
    const customers = await stripe.customers.list({ email: userId });  // Using userId as email for now
    
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: userId,
        metadata: {
          userId,
          tier
        }
      });
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card', 'crypto'],
      currency: 'usd',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: {
          userId,
          tier,
          billingType: isYearly ? 'yearly' : 'monthly'
        }
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`,
      metadata: {
        userId,
        tier
      }
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
}
