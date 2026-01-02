import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Vercel helper buffer for raw body
async function buffer(readable) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeSecretKey || !endpointSecret || !supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Webhook Environment Variables');
        return res.status(500).send('Webhook configuration missing');
    }

    const stripe = new Stripe(stripeSecretKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
            const userId = session.metadata.user_id;

            if (userId) {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        is_pro: true,
                        stripe_sub_id: session.subscription,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userId);

                if (error) throw error;
            }
        } else if (event.type === 'customer.subscription.updated') {
            const subscription = event.data.object;
            const isCanceled = subscription.status === 'canceled' || subscription.status === 'unpaid';

            const { error } = await supabase
                .from('profiles')
                .update({
                    is_pro: !isCanceled,
                    updated_at: new Date().toISOString()
                })
                .eq('stripe_sub_id', subscription.id);

            if (error) console.error('Error updating subscription status:', error);
        } else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;

            const { error } = await supabase
                .from('profiles')
                .update({
                    is_pro: false,
                    stripe_sub_id: null,
                    updated_at: new Date().toISOString()
                })
                .eq('stripe_sub_id', subscription.id);

            if (error) console.error('Error deleting subscription status:', error);
        } else if (event.type === 'invoice.payment_failed') {
            const invoice = event.data.object;
            if (invoice.subscription) {
                await supabase
                    .from('profiles')
                    .update({ is_pro: false })
                    .eq('stripe_sub_id', invoice.subscription);
            }
        }

        res.status(200).send({ received: true });
    } catch (err) {
        console.error('Webhook handler failed:', err);
        res.status(500).send('Server Error');
    }
}
