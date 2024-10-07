import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
  });
}

const auth = getAuth();
const db = getFirestore();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { email, password, isPremium } = req.body;

      // Create user in Firebase Auth
      const userRecord = await auth.createUser({
        email: email,
        password: password,
      });

      // Store user in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email: userRecord.email,
        createdAt: new Date(),
        subscriptionStatus: isPremium ? 'pending' : 'free',
      });

      if (isPremium) {
        // Create a Stripe checkout session
        const session = await stripe.checkout.sessions.create({
          line_items: [
            {
              price: 'price_1PxwpuA9AcwovfpkLQxWKcJo', // Your premium plan price ID
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: `${process.env.DOMAIN}/api/handle-subscription-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.DOMAIN}/dashboard`,
          client_reference_id: userRecord.uid,
        });

        res.status(200).json({ url: session.url });
      } else {
        res.status(200).json({ message: 'User created successfully', uid: userRecord.uid });
      }
    } catch (error) {
      console.error('Error in signup process:', error);
      res.status(500).json({ error: 'An error occurred during signup' });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
