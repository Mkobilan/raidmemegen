
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

        const { origin } = req.body.data || {};
        const effectiveOrigin = origin || req.headers.origin || 'http://localhost:5173';

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer_email: user.email,
            line_items: [
                {
                    price: 'price_1STxJKC86y95wOyLGxt8k0cv', // Hardcoded from original function
                    quantity: 1,
                },
            ],
            success_url: `${effectiveOrigin}?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: effectiveOrigin,
            metadata: {
                user_id: user.id, // Using standard snake_case for consistency
            },
        });

        return res.status(200).json({ sessionUrl: session.url });
    } catch (err) {
        console.error('Stripe Checkout Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
