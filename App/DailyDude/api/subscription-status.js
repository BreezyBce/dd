import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  console.log('Received request:', req.method, req.body || req.query);

  if (req.method === 'GET') {
    try {
      const { userId } = req.query;
      if (!userId) {
        throw new Error('User ID is required');
      }
      const { status, endDate } = await getSubscriptionStatusForUser(userId);
      res.status(200).json({ status, endDate });
    } catch (error) {
      console.error('Error in GET subscription-status:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { action, userId, session_id } = req.body;
      console.log('Processing action:', action, 'for user:', userId, 'session:', session_id);

      let result;
      switch (action) {
        case 'upgrade':
          result = await handleSuccessfulSubscription(session_id);
          break;
        case 'downgrade':
          result = await handleSubscriptionDowngrade(userId);
          break;
        default:
          throw new Error('Invalid action');
      }
      
      console.log('Action result:', result);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in POST subscription-status:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end('Method Not Allowed');
  }
}

async function getSubscriptionStatusForUser(userId) {
  console.log('Checking subscription status for user:', userId);
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    const userData = userDoc.data();
    console.log('User data:', userData);
    
    let status = userData.subscriptionStatus || 'free';
    let endDate = userData.subscriptionEndDate ? userData.subscriptionEndDate.toDate() : null;

    if (status === 'cancelling' && endDate) {
      const now = new Date();
      if (now < endDate) {
        status = 'premium'; // Treat as premium if still within the subscription period
      } else {
        // Update to free if the end date has passed
        await db.collection('users').doc(userId).update({
          subscriptionStatus: 'free',
          isPremium: false,
          subscriptionEndDate: null
        });
        status = 'free';
        endDate = null;
      }
    }

    console.log('Returning status:', status, 'endDate:', endDate);
    return { 
      status, 
      endDate: endDate ? endDate.toISOString() : null 
    };
  } catch (error) {
    console.error('Error in getSubscriptionStatusForUser:', error);
    throw error;
  }
}

async function handleSuccessfulSubscription(sessionId) {
  console.log('Handling successful subscription for session:', sessionId);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('Retrieved session:', session);
    const userId = session.client_reference_id;

    if (!userId) {
      throw new Error('User ID not found in session');
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    console.log('Retrieved subscription:', subscription);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

    await db.collection('users').doc(userId).update({
      isPremium: true,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      subscriptionStatus: 'premium',
      subscriptionEndDate: currentPeriodEnd
    });

    console.log(`Subscription updated successfully for user ${userId}`);
    return { 
      message: 'Subscription updated successfully', 
      status: 'premium',
      endDate: currentPeriodEnd.toISOString()
    };
  } catch (error) {
    console.error('Error in handleSuccessfulSubscription:', error);
    throw error;
  }
}

async function handleSubscriptionDowngrade(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    const userData = userDoc.data();

    if (userData.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.update(userData.stripeSubscriptionId, {
        cancel_at_period_end: true
      });

      const endDate = new Date(subscription.current_period_end * 1000);

      await db.collection('users').doc(userId).update({
        subscriptionStatus: 'cancelling',
        subscriptionEndDate: endDate
      });

      return { 
        message: 'Subscription scheduled for cancellation', 
        status: 'cancelling',
        endDate: endDate.toISOString()
      };
    } else {
      await db.collection('users').doc(userId).update({
        subscriptionStatus: 'free',
        isPremium: false,
        subscriptionEndDate: null
      });

      return { 
        message: 'Subscription cancelled', 
        status: 'free',
        endDate: null
      };
    }
  } catch (error) {
    console.error('Error in handleSubscriptionDowngrade:', error);
    throw error;
  }
}
