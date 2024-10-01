import { loadStripe } from '@stripe/stripe-js';

let stripePromise;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

export const createCheckoutSession = async (priceId, userId) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId, userId }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || `HTTP error! status: ${response.status}`);
    }

    const { url } = await response.json();
    return { url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const getSubscriptionStatus = async (userId) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subscription-status/${userId}`, {
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
    throw error;
  }
};

export const cancelSubscription = async (userId) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};
