const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { db } = require('../firebase-admin');

router.post('/create-checkout-session', async (req, res) => {
  const { priceId, userId } = req.body;

  try {
    const user = await db.collection('users').doc(userId).get();
    const userData = user.data();

    let customer;
    if (userData.stripeCustomerId) {
      customer = await stripe.customers.retrieve(userData.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: userData.email,
      });
      await db.collection('users').doc(userId).update({ stripeCustomerId: customer.id });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/subscription?success=true`,
      cancel_url: `${process.env.CLIENT_URL}/subscription?canceled=true`,
    });

    res.json({ url: session.url }); // Send the URL instead of just the ID
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/cancel-subscription', async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await db.collection('users').doc(userId).get();
    const userData = user.data();

    if (!userData.stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: userData.stripeCustomerId,
      status: 'active',
    });

    if (subscriptions.data.length === 0) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    await stripe.subscriptions.del(subscriptions.data[0].id);

    await db.collection('users').doc(userId).update({
      subscriptionStatus: 'free',
      stripePriceId: null,
    });

    res.json({ message: 'Subscription canceled successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;