import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    console.log('[API] create-checkout: Start');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const priceId = process.env.STRIPE_PRICE_ID_PRO_MONTHLY;

    if (!stripeSecretKey || !supabaseUrl || !supabaseAnonKey || !priceId) {
        console.error('[API] create-checkout: Missing Env Vars');
        return res.status(500).json({ error: 'Backend configuration missing' });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        const bodyData = req.body?.data || req.body || {};
        const { origin } = bodyData;
        const effectiveOrigin = origin || req.headers.origin || 'https://raidmemegen.vercel.app';

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer_email: user.email,
            line_items: [{ price: priceId, quantity: 1 }],
            subscription_data: { trial_period_days: 14 },
            payment_method_collection: 'always',
            success_url: `${effectiveOrigin}?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: effectiveOrigin,
            metadata: { user_id: user.id },
        });

        console.log('[API] create-checkout: Session created', session.id);
        return res.status(200).json({ sessionUrl: session.url });
    } catch (err) {
        console.error('[API] create-checkout: Error', err);
        return res.status(500).json({ error: err.message });
    }
}
