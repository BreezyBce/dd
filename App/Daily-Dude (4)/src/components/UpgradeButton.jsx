import React from 'react';
import { useSubscription } from '../SubscriptionContext';
import { createCheckoutSession } from '../services/stripe';

const UpgradeButton = () => {
  const { subscriptionStatus, userId } = useSubscription();

  const handleUpgrade = async () => {
    if (!userId) {
      console.error('User ID is not available');
      // You might want to redirect to login or show an error message
      return;
    }

    try {
      await createCheckoutSession('price_1PxwpuA9AcwovfpkLQxWKcJo', userId);
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  if (subscriptionStatus === 'premium') {
    return null; // Don't show the button for premium users
  }

  return (
    <button
      onClick={handleUpgrade}
      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
    >
      Upgrade to Premium
    </button>
  );
};

export default UpgradeButton;