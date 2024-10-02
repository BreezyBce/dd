import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('Starting function execution');

// Initialize Firebase Admin SDK if it hasn't been initialized
if (!getApps().length) {
  console.log('Initializing Firebase Admin SDK');
  try {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
}

const db = getFirestore();

export default async function handler(req, res) {
  console.log('Handler function called');
  if (req.method === 'POST') {
    try {
      console.log('POST request received');
      const { userId } = req.body;
      console.log('User ID:', userId);

      // Get the user's document from Firestore
      console.log('Fetching user document from Firestore');
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        console.log('User not found');
        throw new Error('User not found');
      }

      console.log('User document found');
      const userData = userDoc.data();
      const stripeCustomerId = userData.stripeCustomerId;
      console.log('Stripe Customer ID:', stripeCustomerId);

      if (!stripeCustomerId) {
        console.log('No Stripe Customer ID found, updating to free plan');
        await db.collection('users').doc(userId).update({ subscriptionStatus: 'free' });
        return res.status(200).json({ message: 'User downgraded to free plan' });
      }

      // Get the customer's subscriptions
      console.log('Fetching Stripe subscriptions');
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active',
      });

      if (subscriptions.data.length === 0) {
        console.log('No active subscriptions found, updating to free plan');
        await db.collection('users').doc(userId).update({ subscriptionStatus: 'free' });
        return res.status(200).json({ message: 'User downgraded to free plan' });
      }

      // Cancel the subscription
      console.log('Cancelling Stripe subscription');
      const subscription = subscriptions.data[0];
      await stripe.subscriptions.del(subscription.id);

      // Update the user's subscription status in Firestore
      console.log('Updating user subscription status in Firestore');
      await db.collection('users').doc(userId).update({ subscriptionStatus: 'free' });

      console.log('Subscription cancelled successfully');
      res.status(200).json({ message: 'Subscription cancelled successfully' });
    } catch (error) {
      console.error('Error in handler function:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  } else {
    console.log('Method not allowed:', req.method);
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
