import { loadStripe } from '@stripe/stripe-js';

let stripePromise;

const getStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('Stripe publishable key is not set in environment variables');
      return Promise.reject(new Error('Stripe publishable key is not set'));
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl) {
    console.error('API URL is not set in environment variables');
    return '';
  }
  return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
};

export const createCheckoutSession = async (priceId, userId) => {
  try {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      throw new Error('API URL is not set');
    }

    console.log('Creating checkout session with:', { priceId, userId, apiUrl });

    const response = await fetch(`${apiUrl}/api/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId, userId }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Server response:', errorData);
      throw new Error(errorData || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.url) {
      throw new Error('No checkout URL received from server');
    }

    return { url: data.url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const getSubscriptionStatus = async (userId) => {
  try {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      throw new Error('API URL is not set');
    }

    const response = await fetch(`${apiUrl}/api/subscription-status?userId=${userId}`, {
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
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      throw new Error('API URL is not set');
    }

    const response = await fetch(`${apiUrl}/api/cancel-subscription`, {
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

export { getStripe };
