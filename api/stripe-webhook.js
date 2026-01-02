const Stripe = require('stripe');

// Disable body parsing for webhook signature verification
const config = { api: { bodyParser: false } };

async function buffer(readable) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeSecretKey || !endpointSecret || !supabaseUrl || !supabaseServiceKey) {
        return res.status(500).send('Webhook config error');
    }

    const stripe = new Stripe(stripeSecretKey);

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userId = session.metadata.user_id;

            if (userId && session.subscription) {
                const subscription = await stripe.subscriptions.retrieve(session.subscription);
                const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;

                // Use Supabase REST API directly instead of supabase-js
                const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseServiceKey,
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        is_pro: true,
                        stripe_sub_id: session.subscription,
                        trial_end_date: trialEnd,
                        updated_at: new Date().toISOString()
                    })
                });

                if (!updateResponse.ok) {
                    console.error('[API] webhook: Failed to update profile', updateResponse.status);
                }
            }
        } else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;

            // Use Supabase REST API directly
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?stripe_sub_id=eq.${subscription.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    is_pro: false,
                    stripe_sub_id: null,
                    trial_end_date: null,
                    updated_at: new Date().toISOString()
                })
            });

            if (!updateResponse.ok) {
                console.error('[API] webhook: Failed to update profile on cancellation', updateResponse.status);
            }
        }

        res.status(200).send({ received: true });
    } catch (err) {
        console.error('[API] webhook Error:', err);
        res.status(500).send('Server Error');
    }
}

module.exports = handler;
module.exports.config = config;
