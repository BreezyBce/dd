import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

// Initialize Firebase Admin if it hasn't been initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { userId } = req.query;
      if (!userId) {
        throw new Error('User ID is required');
      }
      const status = await getSubscriptionStatusForUser(userId);
      res.status(200).json({ status });
    } catch (error) {
      console.error('Error in GET subscription-status:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { session_id } = req.body;
      if (!session_id) {
        throw new Error('Session ID is required');
      }
      await handleSuccessfulSubscription(session_id);
      res.status(200).json({ message: 'Subscription updated successfully' });
    } catch (error) {
      console.error('Error in POST subscription-status:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end('Method Not Allowed');
  }
}

async function getSubscriptionStatusForUser(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    const userData = userDoc.data();
    return userData.subscriptionStatus || 'free';
  } catch (error) {
    console.error('Error in getSubscriptionStatusForUser:', error);
    throw error;
  }
}

async function handleSuccessfulSubscription(sessionId) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const userId = session.client_reference_id;

    if (!userId) {
      throw new Error('User ID not found in session');
    }

    await db.collection('users').doc(userId).update({
      isPremium: true,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      subscriptionStatus: 'premium'
    });

    console.log(`Subscription updated successfully for user ${userId}`);
  } catch (error) {
    console.error('Error in handleSuccessfulSubscription:', error);
    throw error;
  }
}
