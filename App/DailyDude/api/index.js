import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Firebase Admin
let db;
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  initializeApp({
    credential: cert(serviceAccount)
  });
  console.log('Firebase Admin SDK initialized successfully');
  db = getFirestore();
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
}

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'https://dd-mu-five.vercel.app';

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get('/api/hello', (req, res) => {
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

app.post('/translate', async (req, res) => {
  console.log('Received translation request');
  console.log('Request body:', req.body);
  const { text, from, to } = req.body;

  if (!text || !from || !to) {
    console.log('Missing required fields in translation request');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
      {
        q: text,
        source: from,
        target: to,
        format: 'text'
      }
    );
    console.log('Translation successful');
    res.json({ translatedText: response.data.data.translations[0].translatedText });
  } catch (error) {
    console.error('Translation error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'An error occurred during translation' });
  }
});


app.get('/exchange-rate', async (req, res) => {
  const { from, to } = req.query;
  
  console.log('Received exchange rate request:', { from, to });

  if (!from || !to) {
    console.log('Missing required parameters');
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/pair/${from}/${to}`);
    console.log('Exchange rate API response:', response.data);
    res.json({ conversionRate: response.data.conversion_rate });
  } catch (error) {
    console.error('Exchange rate error:', error.response ? error.response.data : error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch exchange rate' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Export the Express API
module.exports = app;
