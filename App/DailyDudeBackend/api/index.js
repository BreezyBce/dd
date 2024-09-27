import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';


dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  initializeApp({
    credential: cert(serviceAccount)
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  process.exit(1);
}

const db = getFirestore();

const corsOrigin = process.env.CORS_ORIGIN || 'https://dd-mu-five.vercel.app/';

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));



app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

    app.post('/create-checkout-session', async (req, res) => {
        console.log('Received request for checkout session');
        console.log('Request body:', req.body);
        const { priceId, userId } = req.body;

        if (!userId) {
          console.log('UserId is missing in the request');
          return res.status(400).json({ error: 'UserId is required' });
        }

        try {
          console.log('Attempting to fetch user document for userId:', userId);
          const userDoc = await db.collection('users').doc(userId).get();

          if (!userDoc.exists) {
            console.log('User not found in Firestore:', userId);
            return res.status(404).json({ error: 'User not found' });
          }

          console.log('User found:', userDoc.data());
    
    const userData = userDoc.data();

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


        
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = app;
