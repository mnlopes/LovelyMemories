
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is missing from environment variables. Build might continue, but runtime requires this key.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  appInfo: {
    name: 'LovelyMemories Booking System',
    version: '1.0.0',
  },
});
