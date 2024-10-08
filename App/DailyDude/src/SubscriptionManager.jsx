import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { useSubscription } from './SubscriptionContext';
import { createCheckoutSession, cancelSubscription } from './services/stripe';
import { checkUserExistence } from './firestoreUtils';

const SubscriptionManager = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { subscriptionStatus, isPremium, subscriptionEndDate, updateSubscriptionStatus, checkSubscriptionStatus } = useSubscription();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (user) {
        checkSubscriptionStatus();
      }
    });

    return () => unsubscribe();
  }, [checkSubscriptionStatus]);

  const handleUpgrade = async () => {
    if (!currentUser) {
      setError('No user logged in. Please log in to upgrade.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Starting upgrade process');
      console.log('Current user:', currentUser.uid);

      const userExists = await checkUserExistence(currentUser.uid);
      console.log('User exists:', userExists);

      if (!userExists) {
        throw new Error('User data not found in database');
      }

      console.log('Creating checkout session');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: 'price_1PxwpuA9AcwovfpkLQxWKcJo',
          userId: currentUser.uid,
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const textResponse = await response.text();
        console.error('Error response:', textResponse);
        throw new Error(`HTTP error! status: ${response.status}, message: ${textResponse}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.url) {
        console.log('Redirecting to:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Error in handleUpgrade:', err);
      setError(err.message || 'Failed to create checkout session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDowngrade = async () => {
    setLoading(true);
    try {
      await updateSubscriptionStatus('cancelling', subscriptionEndDate);
      // Refresh the subscription status after downgrade
      await checkSubscriptionStatus();
    } catch (error) {
      setError('Failed to downgrade subscription. Please try again.');
    }
    setLoading(false);
  };

  const renderSubscriptionMessage = () => {
    if (subscriptionStatus === 'premium') {
      return "You are currently on the Premium plan.";
    } else if (subscriptionStatus === 'cancelling' && subscriptionEndDate) {
      return `You cancelled your subscription but your premium features are still active until ${new Date(subscriptionEndDate).toLocaleDateString()}.`;
    } else {
      return "You are currently on the Free plan.";
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Subscription Management</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">Current Plan</h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {renderSubscriptionMessage()}
        </p>
        {isPremium && <p className="text-sm text-green-500 mt-2">Premium features are currently active.</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">Free Plan</h3>
          <ul className="list-disc list-inside mb-4 text-gray-600 dark:text-gray-400">
            <li>Basic features</li>
            <li>Limited usage</li>
            <li>Standard support</li>
          </ul>
          {isPremium && subscriptionStatus !== 'cancelling' && (
            <button
              onClick={handleDowngrade}
              disabled={loading}
              className="w-full bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition duration-300"
            >
              {loading ? 'Processing...' : 'Downgrade to Free'}
            </button>
          )}
        </div>

        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">Premium Plan</h3>
          <ul className="list-disc list-inside mb-4 text-gray-600 dark:text-gray-400">
            <li>All features unlocked</li>
            <li>Unlimited usage</li>
            <li>Priority support</li>
          </ul>
          {!isPremium && (
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-customorange-500 text-white px-4 py-2 rounded hover:bg-customorange-400 transition duration-300"
            >
              {loading ? 'Processing...' : 'Upgrade to Premium'}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      <button
        onClick={() => navigate('/dashboard')}
        className="mt-8 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition duration-300"
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default SubscriptionManager;
