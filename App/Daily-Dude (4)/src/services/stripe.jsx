import { loadStripe } from '@stripe/stripe-js/pure';

let stripePromise;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

export const createCheckoutSession = async (priceId, userId) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId, userId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const session = await response.json();

    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    const result = await stripe.redirectToCheckout({
      sessionId: session.sessionId,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    // You might want to show an error message to the user here
  }
};

export const getSubscriptionStatus = async (userId) => {
  try {
    const response = await fetch(`https://b14a9b51-8137-40f8-8fe5-a32a1483c5db-00-1jg9ll4a2ha83.picard.replit.dev/subscription-status/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subscription status');
    }

    const data = await response.json();
    return data.status;
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return 'error';
  }
};