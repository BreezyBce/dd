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
      const status = await getSubscriptionStatusForUser(userId);
      res.status(200).json({ status });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { session_id } = req.body;
      await handleSuccessfulSubscription(session_id);
      res.status(200).json({ message: 'Subscription updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end('Method Not Allowed');
  }
}

async function getSubscriptionStatusForUser(userId) {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new Error('User not found');
  }
  const userData = userDoc.data();
  return userData.subscriptionStatus || 'free';
}

async function handleSuccessfulSubscription(sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const userId = session.client_reference_id;

  await db.collection('users').doc(userId).update({
    isPremium: true,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    subscriptionStatus: 'premium'
  });

  // You might want to perform additional actions here, like sending a welcome email
}
