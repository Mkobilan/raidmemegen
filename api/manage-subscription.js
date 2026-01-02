const Stripe = require('stripe');

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!stripeSecretKey || !supabaseUrl || !supabaseAnonKey) {
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
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await userResponse.json();
        if (!user || !user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length === 0) {
            return res.status(404).json({ error: 'Customer not found.' });
        }

        const origin = (req.body && req.body.origin) || req.headers.origin || 'https://raidmemegen.vercel.app';

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customers.data[0].id,
            return_url: `${origin}/settings`,
        });

        return res.status(200).json({ url: portalSession.url });
    } catch (err) {
        console.error('[API] manage-subscription: Error', err);
        return res.status(500).json({ error: err.message });
    }
}

module.exports = handler;
