const Stripe = require('stripe');

async function handler(req, res) {
    console.log('[API] create-checkout: Started');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const priceId = process.env.STRIPE_PRICE_ID_PRO_MONTHLY;

    if (!stripeSecretKey || !supabaseUrl || !supabaseAnonKey || !priceId) {
        console.error('[API] create-checkout: Missing env vars', {
            hasStripe: !!stripeSecretKey,
            hasSupaUrl: !!supabaseUrl,
            hasSupaKey: !!supabaseAnonKey,
            hasPriceId: !!priceId
        });
        return res.status(500).json({ error: 'Backend configuration error.' });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing token' });
        }

        const token = authHeader.replace('Bearer ', '');

        // Use Supabase REST API directly instead of supabase-js
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': supabaseAnonKey
            }
        });

        if (!userResponse.ok) {
            console.error('[API] create-checkout: Auth failed', userResponse.status);
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await userResponse.json();
        if (!user || !user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const bodyData = req.body?.data || req.body || {};
        const origin = bodyData.origin || req.headers.origin || 'https://raidmemegen.vercel.app';

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer_email: user.email,
            line_items: [{ price: priceId, quantity: 1 }],
            subscription_data: { trial_period_days: 14 },
            payment_method_collection: 'always',
            success_url: `${origin}?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: origin,
            metadata: { user_id: user.id },
        });

        console.log('[API] create-checkout: Session created successfully');
        return res.status(200).json({ sessionUrl: session.url });
    } catch (err) {
        console.error('[API] create-checkout: Error', err.message);
        return res.status(500).json({ error: err.message });
    }
}

module.exports = handler;
