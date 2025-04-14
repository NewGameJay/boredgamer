import { NextResponse } from 'next/server';

const KRAKEN_API = 'https://api.kraken.com/0';
const TRIAL_PERIOD_DAYS = 14;

interface KrakenPaymentMethod {
  id: string;
  type: string;
  currency: string;
}

export async function POST(request: Request) {
  try {
    const { priceId, userId } = await request.json();

    // Get available payment methods
    const methodsResponse = await fetch(`${KRAKEN_API}/payments/methods`, {
      method: 'POST',
      headers: {
        'API-Key': process.env.KRAKEN_API_KEY || '',
        'API-Sign': process.env.KRAKEN_API_SIGN || '',
        'Content-Type': 'application/json'
      }
    });

    const methodsData = await methodsResponse.json();
    if (!methodsResponse.ok) {
      throw new Error(methodsData.error || 'Failed to get payment methods');
    }

    // Create a payment request
    const response = await fetch(`${KRAKEN_API}/payments/request`, {
      method: 'POST',
      headers: {
        'API-Key': process.env.KRAKEN_API_KEY || '',
        'API-Sign': process.env.KRAKEN_API_SIGN || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nonce: Date.now(),
        orderid: `sub_${userId}_${Date.now()}`,
        subscription: true,
        subscription_details: {
          trial_period_days: TRIAL_PERIOD_DAYS,
          billing_cycle: 'monthly', // or 'yearly'
          price_id: priceId
        },
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/kraken-webhook`,
        redirect: {
          success: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment_id={PAYMENT_ID}`,
          cancel: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`
        },
        metadata: {
          userId,
          priceId,
          trialDays: TRIAL_PERIOD_DAYS
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create payment request');
    }

    return NextResponse.json({ sessionUrl: data.result.checkout_url });
  } catch (error) {
    console.error('Error creating Kraken payment session:', error);
    return NextResponse.json(
      { error: 'Error creating payment session' },
      { status: 500 }
    );
  }
}
