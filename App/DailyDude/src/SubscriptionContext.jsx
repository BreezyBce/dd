import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState('free');
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(null);

  const checkSubscriptionStatus = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const status = userData.subscriptionStatus || 'free';
        const endDate = userData.subscriptionEndDate ? new Date(userData.subscriptionEndDate.toDate()) : null;
        
        setSubscriptionStatus(status);
        setSubscriptionEndDate(endDate);

        const now = new Date();
        if (status === 'premium' || (status === 'cancelling' && endDate && now < endDate)) {
          setIsPremium(true);
        } else {
          setIsPremium(false);
          if (status === 'cancelling' && (!endDate || now >= endDate)) {
            // Update status to 'free' if end date has passed
            await updateDoc(doc(db, 'users', user.uid), {
              subscriptionStatus: 'free',
              subscriptionEndDate: null
            });
            setSubscriptionStatus('free');
            setSubscriptionEndDate(null);
          }
        }
      }
    } else {
      setSubscriptionStatus('free');
      setIsPremium(false);
      setSubscriptionEndDate(null);
    }
  };

  const updateSubscriptionStatus = async (newStatus, newEndDate = null) => {
    const user = auth.currentUser;
    if (user) {
      const updateData = { subscriptionStatus: newStatus };
      if (newEndDate) {
        updateData.subscriptionEndDate = newEndDate;
      }
      await updateDoc(doc(db, 'users', user.uid), updateData);
      await checkSubscriptionStatus(); // Re-check status after update
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkSubscriptionStatus();
      } else {
        setSubscriptionStatus('free');
        setIsPremium(false);
        setSubscriptionEndDate(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <SubscriptionContext.Provider value={{ 
      subscriptionStatus, 
      isPremium, 
      subscriptionEndDate,
      checkSubscriptionStatus, 
      updateSubscriptionStatus 
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);
