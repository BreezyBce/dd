import axios from 'axios';
import { useSubscription } from './SubscriptionContext';

export const useApi = () => {
  const { subscriptionStatus } = useSubscription();

  const makeApiCall = async (url, method = 'GET', data = null) => {
    if (subscriptionStatus !== 'premium') {
      throw new Error('This feature requires a premium subscription');
    }

    try {
      const response = await axios({
        method,
        url,
        data
      });

      return response.data;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  return { makeApiCall };
};