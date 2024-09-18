import React from 'react';
import { useSubscription } from '../SubscriptionContext';

const SubscriptionStatusIndicator = () => {
  const { subscriptionStatus } = useSubscription();

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-sm">
      Subscription: <span className={subscriptionStatus === 'premium' ? 'text-green-500' : 'text-yellow-500'}>
        {subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)}
      </span>
    </div>
  );
};

export default SubscriptionStatusIndicator;