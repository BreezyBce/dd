import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { userId } = req.body;

      // Fetch the subscription ID associated with the user
      // This is a placeholder - you'll need to implement this based on your database structure
      const subscriptionId = await getSubscriptionIdForUser(userId);

      if (!subscriptionId) {
        return res.status(404).json({ error: 'No active subscription found for this user' });
      }

      const canceledSubscription = await stripe.subscriptions.del(subscriptionId);

      res.status(200).json({ message: 'Subscription successfully canceled', subscription: canceledSubscription });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}

// Placeholder function - implement this based on your database structure
async function getSubscriptionIdForUser(userId) {
  // Query your database to get the subscription ID for the user
  // Return the subscription ID or null if not found
}
