import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Fetch user profile to get stripe_customer_id
        // Stripe stores customer IDs. We should really store stripe_customer_id in our profiles table too.
        // If we don't have it, we can search by email or wait for a webhook to populate it.
        // For now, we'll try to find the customer by email.

        const customers = await stripe.customers.list({
            email: user.email,
            limit: 1
        });

        let customerId;
        if (customers.data.length > 0) {
            customerId = customers.data[0].id;
        } else {
            return res.status(404).json({
                error: 'Stripe customer not found.',
                details: 'This usually happens if your subscription was updated manually in the database. Please contact support or upgrade via the pricing page.'
            });
        }

        const { origin } = req.body || {};
        const effectiveOrigin = origin || req.headers.origin || 'http://localhost:5173';

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${effectiveOrigin}/settings`,
        });

        return res.status(200).json({ url: portalSession.url });
    } catch (err) {
        console.error('Stripe Portal Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
