import crypto from 'crypto';

const COINBASE_API = 'https://api.commerce.coinbase.com';
const TRIAL_PERIOD_DAYS = 14;

interface CreateChargeParams {
  priceId: string;
  userId: string;
  tier: string;
  amount: number;
  isYearly: boolean;
}

export async function createCryptoCharge({
  priceId,
  userId,
  tier,
  amount,
  isYearly
}: CreateChargeParams) {
  try {
    const response = await fetch(`${COINBASE_API}/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': process.env.COINBASE_COMMERCE_API_KEY!,
        'X-CC-Version': '2018-03-22',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: `Boredgamer ${tier} Subscription`,
        description: `${tier} tier subscription with ${TRIAL_PERIOD_DAYS}-day trial`,
        pricing_type: 'fixed_price',
        local_price: {
          amount: amount.toString(),
          currency: 'USD'
        },
        metadata: {
          userId,
          priceId,
          tier,
          trialDays: TRIAL_PERIOD_DAYS,
          billingType: isYearly ? 'yearly' : 'monthly'
        },
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?charge_id={CHECKOUT_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`,
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create charge');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating Coinbase Commerce charge:', error);
    throw error;
  }
}

export function validateWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(rawBody);
    const computedSignature = hmac.digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    console.error('Invalid webhook signature:', error);
    return false;
  }
}
