import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
    apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate the user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user has an active subscription
        if (!user.stripe_subscription_id) {
            return Response.json({ error: 'No active subscription found' }, { status: 400 });
        }

        // Cancel the subscription at period end (so user keeps access until billing period ends)
        const subscription = await stripe.subscriptions.update(
            user.stripe_subscription_id,
            {
                cancel_at_period_end: true,
            }
        );

        // Update user record
        await base44.auth.updateMe({
            subscription_status: 'canceled',
        });

        return Response.json({ 
            success: true,
            message: 'Subscription will be canceled at the end of the billing period',
            cancel_at: subscription.cancel_at,
        }, { status: 200 });

    } catch (error) {
        console.error("Error canceling subscription:", error);
        return Response.json(
            { error: error.message },
            { status: 500 }
        );
    }
});