import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;
    if (!publishableKey) {
      
      return null;
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};
