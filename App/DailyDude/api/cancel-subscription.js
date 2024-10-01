import Stripe from 'stripe';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = getFirestore();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { userId } = req.body;

      // Get the user's document from Firestore
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const stripeCustomerId = userData.stripeCustomerId;

      if (!stripeCustomerId) {
        // If there's no Stripe customer ID, just update the user's plan to free
        await updateDoc(doc(db, 'users', userId), { subscriptionStatus: 'free' });
        return res.status(200).json({ message: 'User downgraded to free plan' });
      }

      // Get the customer's subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active',
      });

      if (subscriptions.data.length === 0) {
        // If there are no active subscriptions, just update the user's plan to free
        await updateDoc(doc(db, 'users', userId), { subscriptionStatus: 'free' });
        return res.status(200).json({ message: 'User downgraded to free plan' });
      }

      // Cancel the subscription
      const subscription = subscriptions.data[0];
      await stripe.subscriptions.del(subscription.id);

      // Update the user's subscription status in Firestore
      await updateDoc(doc(db, 'users', userId), { subscriptionStatus: 'free' });

      res.status(200).json({ message: 'Subscription cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
