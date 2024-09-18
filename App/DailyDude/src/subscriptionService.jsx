// src/subscriptionService.js
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const updateSubscriptionStatus = async (userId, newStatus) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { subscriptionStatus: newStatus }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error updating subscription status:", error);
    return false;
  }
};