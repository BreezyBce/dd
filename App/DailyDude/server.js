import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import Stripe from 'stripe';
import admin from 'firebase-admin';

const require = createRequire(import.meta.url);
const cities = require('cities.json');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

const GOOGLE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;
const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    // Your service account details
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  }),
 

// OPEN WEATHER API
app.get('/api/weather', async (req, res) => {
  try {
    const { location, lat, lon } = req.query;
    let url;
    if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
    } else {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
    }
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Weather API error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'An error occurred while fetching weather data' });
  }
});

// City suggestions endpoint
app.get('/api/city-suggestions', (req, res) => {
  const { query } = req.query;
  const suggestions = cities
    .filter(city => city.name.toLowerCase().startsWith(query.toLowerCase()))
    .map(city => `${city.name}, ${city.country}`)
    .slice(0, 5);
  res.json(suggestions);
});

// API routes
app.post('/api/translate', async (req, res) => {
  try {
    const { text, from, to } = req.body;
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`,
      {
        q: text,
        source: from,
        target: to,
        format: 'text'
      }
    );
    res.json({ translatedText: response.data.data.translations[0].translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'An error occurred during translation' });
  }
});

app.get('/api/exchange-rate', async (req, res) => {
  try {
    const { from, to } = req.query;
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/pair/${from}/${to}`);
    res.json({ conversionRate: response.data.conversion_rate });
  } catch (error) {
    console.error('Exchange rate error:', error);
    res.status(500).json({ error: 'An error occurred while fetching the exchange rate' });
  }
});

// Stripe routes
app.post('/create-checkout-session', async (req, res) => {
  const { customerId, priceId } = req.body;

  try {
    const customerDoc = await admin.firestore().collection('customers').doc(customerId).get();
    const customer = customerDoc.data();

    let stripeCustomer;
    if (customer.stripeCustomerId) {
      stripeCustomer = await stripe.customers.retrieve(customer.stripeCustomerId);
    } else {
      stripeCustomer = await stripe.customers.create({
        email: customer.email,
      });
      await admin.firestore().collection('customers').doc(customerId).update({
        stripeCustomerId: stripeCustomer.id,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'https://dailydude.app/success',
      cancel_url: 'https://dailydude.app/cancel',
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Retrieve the Firestore customer document
    const customersSnapshot = await admin.firestore().collection('customers')
      .where('stripeCustomerId', '==', session.customer)
      .get();

    if (!customersSnapshot.empty) {
      const customerDoc = customersSnapshot.docs[0];
      const userId = customerDoc.data().userId;

      // Update the user's premium status
      await admin.firestore().collection('users').doc(userId).update({
        isPremium: true
      });

      console.log(`User ${userId} updated to premium status`);
    }
  }

  res.json({received: true});
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
