import React, { useEffect, useState } from 'react';
import { useSubscription } from './SubscriptionContext';
import UpgradeButton from './components/UpgradeButton';

const withSubscription = (WrappedComponent, requiredPlan = 'free') => {
  return function WithSubscriptionComponent(props) {
    const { subscriptionStatus, subscriptionEndDate, checkSubscriptionStatus } = useSubscription();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const fetchStatus = async () => {
        await checkSubscriptionStatus();
        setIsLoading(false);
      };
      fetchStatus();
    }, [checkSubscriptionStatus]);

    if (isLoading) {
      return <div>Loading...</div>;
    }

    const isPremiumAccess = () => {
      if (subscriptionStatus === 'premium') return true;
      if (subscriptionStatus === 'cancelling' && subscriptionEndDate) {
        return new Date() < new Date(subscriptionEndDate);
      }
      return false;
    };

    if (isPremiumAccess() || requiredPlan === 'free') {
      return <WrappedComponent {...props} />;
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="mb-4 text-gray-800 dark:text-gray-400">This feature requires a premium subscription.</p>
          {subscriptionStatus === 'cancelling' && subscriptionEndDate && (
            <p className="mb-4 text-gray-800 dark:text-gray-400">
              Your premium access will end on {new Date(subscriptionEndDate).toLocaleDateString()}.
            </p>
          )}
          {subscriptionStatus !== 'cancelling' && <UpgradeButton />}
        </div>
      );
    }
  }
};

export default withSubscription;
