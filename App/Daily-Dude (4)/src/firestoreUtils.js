import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase'; // Adjust this import path if necessary

export const checkUserExistence = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      console.log('User data:', userSnap.data());
      return true;
    } else {
      console.log('No such user!');
      return false;
    }
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
};