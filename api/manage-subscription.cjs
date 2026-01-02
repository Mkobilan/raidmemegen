const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    console.log('[API] manage-subscription: Start');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!stripeSecretKey || !supabaseUrl || !supabaseAnonKey) {
        console.error('[API] manage-subscription: Missing Env Vars');
        return res.status(500).json({ error: 'Backend configuration error.' });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.error('[API] manage-subscription: Missing Auth Header');
            return res.status(401).json({ error: 'Missing Authorization header' });
        }

        const token = authHeader.replace('Bearer ', '');
        console.log('[API] manage-subscription: Fetching user');
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error('[API] manage-subscription: Auth error', error);
            return res.status(401).json({ error: 'Invalid token' });
        }

        const customers = await stripe.customers.list({
            email: user.email,
            limit: 1
        });

        let customerId;
        if (customers.data.length > 0) {
            customerId = customers.data[0].id;
        } else {
            console.error('[API] manage-subscription: Customer not found');
            return res.status(404).json({
                error: 'Stripe customer not found.'
            });
        }

        const { origin } = req.body || {};
        const effectiveOrigin = origin || req.headers.origin || 'https://raidmemegen.vercel.app';

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${effectiveOrigin}/settings`,
        });

        return res.status(200).json({ url: portalSession.url });
    } catch (err) {
        console.error('[API] manage-subscription: Internal Error', err);
        return res.status(500).json({ error: err.message });
    }
}
