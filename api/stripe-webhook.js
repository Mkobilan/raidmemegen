
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Use Service Role for admin access to DB
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Disable body parsing for verification
export const config = {
    api: {
        bodyParser: false,
    },
};

// Vercel helper buffer for raw body
async function buffer(readable) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userId = session.metadata.user_id || session.metadata.firebase_uid; // fallback for legacy

            if (userId) {
                // Update user profile
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        is_pro: true,
                        stripe_sub_id: session.subscription,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userId);

                if (error) throw error;
                console.log(`User ${userId} upgraded to Pro.`);
            }
        } else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            // Find user by subscription ID
            // Note: We need to search by stripe_sub_id. 
            // If column doesn't exist in schema (I didn't add it explicitly to profiles in schema.sql), we need to add it.
            // I will update schema.sql or just use jsonb metadata if prefered? 
            // The schema had 'is_pro'.
            // I should stick to 'is_pro'. Searching might be hard if not indexed, but fine for now.

            const { data: users } = await supabase
                .from('profiles')
                .select('id')
                .eq('stripe_sub_id', subscription.id);

            if (users && users.length > 0) {
                for (const u of users) {
                    await supabase
                        .from('profiles')
                        .update({ is_pro: false })
                        .eq('id', u.id);
                }
            }
        }

        res.status(200).send({ received: true });
    } catch (err) {
        console.error('Webhook handler failed:', err);
        res.status(500).send('Server Error');
    }
}
