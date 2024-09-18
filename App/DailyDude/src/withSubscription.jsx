import React, { useEffect, useState } from 'react';
import { useSubscription } from './SubscriptionContext';
import UpgradeButton from './components/UpgradeButton';

const withSubscription = (WrappedComponent, requiredPlan = 'free') => {
  return function WithSubscriptionComponent(props) {
    const { subscriptionStatus, checkSubscriptionStatus } = useSubscription();
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

    if (subscriptionStatus === 'premium' || (requiredPlan === 'free' && subscriptionStatus === 'free')) {
      return <WrappedComponent {...props} />;
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="mb-4 text-lg">This feature requires a premium subscription.</p>
          <UpgradeButton />
        </div>
      );
    }
  }
};

export default withSubscription;