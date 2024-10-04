import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  console.log('Function invoked');
  if (req.method === 'POST') {
    try {
      console.log('Received request body:', JSON.stringify(req.body));
      const { priceId, userId } = req.body;

      console.log('Parsed request:', { priceId, userId });

      if (!priceId) {
        throw new Error('Price ID is required');
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe secret key is not set');
      }

      if (!process.env.DOMAIN) {
        throw new Error('DOMAIN environment variable is not set');
      }

      console.log('Creating checkout session with Stripe');
      console.log('Stripe Secret Key:', process.env.STRIPE_SECRET_KEY.substring(0, 8) + '...');
      console.log('Domain:', process.env.DOMAIN);

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.DOMAIN}/dashboard`,
        client_reference_id: userId,
      });

      console.log('Checkout session created:', session.id);
      res.status(200).json({ url: session.url });
    } catch (error) {
      console.error('Error in create-checkout-session:', error);
      res.status(500).json({ 
        error: 'An error occurred while creating the checkout session',
        details: error.message,
        stack: error.stack
      });
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
