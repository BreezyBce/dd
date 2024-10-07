const express = require('express');
const firebase = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

app.post('/api/signup', async (req, res) => {
  try {
    // Create user in Firebase Auth
    const userRecord = await firebase.auth().createUser({
      email: req.body.email,
      password: req.body.password,
    });

    // Store user in Firestore
    await firebase.firestore().collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      isPremium: false,
    });

    // Check if the user came from the premium subscription flow
    if (req.query.redirect === 'premium') {
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

      // Redirect to Stripe Checkout
      res.redirect(303, session.url);
    } else {
      // Redirect to dashboard if not coming from premium flow
      res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('Error in signup process:', error);
    res.status(500).json({ error: 'An error occurred during signup' });
  }
});
