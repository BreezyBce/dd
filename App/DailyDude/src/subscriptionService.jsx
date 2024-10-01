import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export const updateSubscriptionStatus = async (userId, newStatus) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { subscriptionStatus: newStatus });
    return true;
  } catch (error) {
    console.error("Error updating subscription status:", error);
    throw error;
  }
};
