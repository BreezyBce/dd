import React from 'react';

const SubscriptionBasedContent = ({ subscriptionStatus }) => {
  if (subscriptionStatus === 'premium') {
    return (
      <div>
        <h2>Welcome Premium User!</h2>
        <p>You have access to all premium features.</p>
        {/* Add your premium features here */}
      </div>
    );
  } else {
    return (
      <div>
        <h2>Welcome Free User!</h2>
        <p>Upgrade to premium to access all features.</p>
        <button>Upgrade Now</button>
      </div>
    );
  }
};

export default SubscriptionBasedContent;