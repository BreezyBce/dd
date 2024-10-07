import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Firebase Admin if it hasn't been initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { session_id } = req.query;

    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      const userId = session.client_reference_id;

      // Update Firestore
      await db.collection('users').doc(userId).update({
        isPremium: true,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription
      });

      // Redirect to dashboard
      res.redirect(302, 'https://app.dailydude.app/dashboard');
    } catch (error) {
      console.error('Error handling successful subscription:', error);
      res.status(500).json({ error: 'An error occurred while processing the subscription' });
    }
  } else {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
  }
}
