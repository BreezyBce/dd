import React from 'react';
import { useSubscription } from '../SubscriptionContext';
import UpgradeButton from './UpgradeButton';

const SubscriptionManagement = () => {
  const { subscriptionStatus } = useSubscription();

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
      <h2 className="text-2xl font-bold mb-4">Subscription Management</h2>
      <p className="mb-4">Current plan: {subscriptionStatus}</p>
      {subscriptionStatus === 'free' ? (
        <div>
          <p className="mb-4">Upgrade to premium to access all features!</p>
          <UpgradeButton />
        </div>
      ) : (
        <p>You're enjoying all premium features!</p>
      )}
    </div>
  );
};

export default SubscriptionManagement;