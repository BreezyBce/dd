import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../SubscriptionContext';
import { createCheckoutSession } from '../services/stripe';

const UpgradeButton = () => {
  const navigate = useNavigate();
  const { subscriptionStatus, currentUser } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpgrade = async () => {
    if (!currentUser) {
      setError('Please log in to upgrade your subscription.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { url } = await createCheckoutSession('price_1PxwpuA9AcwovfpkLQxWKcJo', currentUser.uid);
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setError('Failed to start upgrade process. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (subscriptionStatus === 'premium') {
    return null;
  }

  return (
    <div>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="bg-customorange-500 text-white px-4 py-2 rounded hover:bg-customorange-400 transition-colors duration-300 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Upgrade to Premium'}
      </button>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
};

export default UpgradeButton;
