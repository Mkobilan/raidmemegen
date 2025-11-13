const { onCall, HttpsError, onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const Stripe = require('stripe');

admin.initializeApp();

const stripeSecret = defineSecret('STRIPE_SECRET_KEY');
const webhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

// === EXISTING CHECKOUT FUNCTION (unchanged) ===
exports.createStripeCheckoutSession = onCall(
  {
    secrets: ['STRIPE_SECRET_KEY'],
  },
  async (request) => {
    console.log('Function invoked');

    if (!request.auth || !request.auth.uid) {
      console.log('No auth - throwing unauthenticated');
      throw new HttpsError('unauthenticated', 'Must be logged in.');
    }

    const uid = request.auth.uid;
    const email = request.auth.token?.email || 'unknown@example.com';
    console.log('Auth OK – uid:', uid, 'email:', email);

    try {
      console.log('Fetching secret...');
      const secretValue = await stripeSecret.value();
      console.log('Secret fetched - length:', secretValue ? secretValue.length : 'NULL/UNDEFINED');

      if (!secretValue || secretValue.length < 50) {
        console.error('Secret invalid - value preview:', secretValue ? secretValue.substring(0, 10) + '...' : 'NULL');
        throw new Error('Invalid Stripe secret');
      }

      console.log('Initializing Stripe...');
      const stripe = new Stripe(secretValue);
      const origin = request.data?.origin || 'http://localhost:5173';
      console.log('Origin:', origin);

      console.log('Creating session...');
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: email,
        line_items: [
          {
            price: 'price_1SSZmFFzYxaa9KVAd8yyWAMA',
            quantity: 1,
          },
        ],
        success_url: `${origin}?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: origin,
        metadata: {
          firebase_uid: uid,
        },
      });

      console.log('Session created successfully:', session.id);
      return { sessionUrl: session.url };
    } catch (error) {
      console.error('Full error in catch:', error);
      console.error('Error stack:', error.stack);
      throw new HttpsError('internal', 'Failed to create session: ' + error.message);
    }
  }
);

// === FIXED WEBHOOK FUNCTION ===
exports.stripeWebhook = onRequest(
  {
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    cors: true,
    rawBody: true  // Enables req.rawBody for Stripe signature verification
  },
  async (req, res) => {
    console.log('Webhook received:', req.method, req.url);

    // Only handle POST
    if (req.method !== 'POST') {
      console.log('Invalid method');
      return res.status(405).send('Method Not Allowed');
    }

    try {
      // Await secrets inside handler
      const apiKey = await stripeSecret.value();
      const signingSecret = await webhookSecret.value();

      if (!apiKey || !signingSecret) {
        throw new Error('Missing secrets (API key or webhook secret)');
      }

      // Instantiate Stripe with API key
      const stripe = new Stripe(apiKey);

      // Verify Stripe signature
      const sig = req.headers['stripe-signature'];
      const payload = req.rawBody;  // Available due to rawBody: true
      let event;

      try {
        event = stripe.webhooks.constructEvent(payload.toString(), sig, signingSecret);
        console.log('✅ Webhook verified for event:', event.type);
      } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const uid = session.metadata.firebase_uid;

        if (!uid) {
          console.log('No uid in metadata - skipping');
          return res.status(200).send('OK');
        }

        console.log('🔄 Upgrading user:', uid, 'from session:', session.id);

        // Update Firestore user doc (use merge to avoid overwriting other fields)
        const userRef = admin.firestore().collection('users').doc(uid);
        await userRef.set(
          {
            isPro: true,
            pro: true,  // Legacy field for compatibility
            gensToday: 0,  // Reset gens
            upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
            stripeSubId: session.subscription,  // Track for cancels/etc.
          },
          { merge: true }
        );

        console.log('✅ User upgraded successfully in Firestore');
      }

      // Return 200 OK
      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).send('Internal Error');
    }
  }
);