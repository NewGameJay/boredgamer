import { NextResponse } from 'next/server';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { sendSubscriptionNotification } from '@/lib/notifications/emailService';

const db = getFirestore(app);

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Verify webhook signature
    const signature = request.headers.get('Kraken-Sign');
    if (!verifyWebhookSignature(payload, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { 
      event_type,
      payment: {
        order_id,
        amount,
        currency,
        status,
        payment_method
      },
      subscription
    } = payload;

    // Extract userId from order_id (format: sub_userId_timestamp)
    const userId = order_id.split('_')[1];

    if (event_type === 'payment.completed') {
      // Update user's subscription status in Firestore
      const userRef = doc(db, 'studios', userId);
      await updateDoc(userRef, {
        subscriptionStatus: 'active',
        currentPeriodEnd: subscription.current_period_end,
        lastPaymentDate: new Date(),
        paymentMethod: payment_method
      });

      // Send notification email
      await sendSubscriptionNotification({
        userId,
        subscriptionTier: subscription.plan,
        amount: amount.toString(),
        currency,
        paymentMethod: payment_method,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined
      });

      return NextResponse.json({ status: 'success' });
    }

    if (event_type === 'subscription.cancelled') {
      // Update user's subscription status
      const userRef = doc(db, 'studios', userId);
      await updateDoc(userRef, {
        subscriptionStatus: 'cancelled',
        cancellationDate: new Date()
      });

      return NextResponse.json({ status: 'success' });
    }

    // Handle other webhook events as needed
    return NextResponse.json({ status: 'ignored' });

  } catch (error) {
    console.error('Error processing Kraken webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function verifyWebhookSignature(payload: any, signature: string | null): boolean {
  if (!signature) return false;
  
  // Implement Kraken's signature verification logic here
  // This will depend on Kraken's specific webhook signature format
  // Usually involves HMAC verification with your webhook secret
  
  return true; // Replace with actual verification
}
