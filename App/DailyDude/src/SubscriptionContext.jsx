import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState('free');

  const checkSubscriptionStatus = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setSubscriptionStatus(userDoc.data().subscriptionStatus || 'free');
      }
    } else {
      setSubscriptionStatus('free');
    }
  };

  const updateSubscriptionStatus = async (newStatus) => {
    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), { subscriptionStatus: newStatus });
      setSubscriptionStatus(newStatus);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkSubscriptionStatus();
      } else {
        setSubscriptionStatus('free');
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <SubscriptionContext.Provider value={{ subscriptionStatus, checkSubscriptionStatus, updateSubscriptionStatus }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);
