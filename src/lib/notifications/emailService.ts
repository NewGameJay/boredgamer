import nodemailer from 'nodemailer';

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface NotificationData {
  userId: string;
  subscriptionTier: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  trialEndsAt?: Date;
}

export async function sendSubscriptionNotification(data: NotificationData) {
  const {
    userId,
    subscriptionTier,
    amount,
    currency,
    paymentMethod,
    trialEndsAt,
  } = data;

  const html = `
    <h2>New Subscription Alert</h2>
    <p>A new subscription has been created:</p>
    <ul>
      <li><strong>User ID:</strong> ${userId}</li>
      <li><strong>Tier:</strong> ${subscriptionTier}</li>
      <li><strong>Amount:</strong> ${amount} ${currency}</li>
      <li><strong>Payment Method:</strong> ${paymentMethod}</li>
      ${trialEndsAt ? `<li><strong>Trial Ends:</strong> ${trialEndsAt.toLocaleDateString()}</li>` : ''}
    </ul>
    <p>View user details in the <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/users/${userId}">admin dashboard</a>.</p>
  `;

  const text = `
New Subscription Alert

A new subscription has been created:
- User ID: ${userId}
- Tier: ${subscriptionTier}
- Amount: ${amount} ${currency}
- Payment Method: ${paymentMethod}
${trialEndsAt ? `- Trial Ends: ${trialEndsAt.toLocaleDateString()}` : ''}

View user details at: ${process.env.NEXT_PUBLIC_APP_URL}/admin/users/${userId}
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'notifications@boredgamer.app',
      to: process.env.COMPANY_EMAIL,
      subject: `New ${subscriptionTier} Subscription`,
      text,
      html,
    });

    console.log('Subscription notification email sent successfully');
  } catch (error) {
    console.error('Error sending subscription notification:', error);
    throw error;
  }
}
