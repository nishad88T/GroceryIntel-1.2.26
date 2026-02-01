import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
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

        const { priceId } = await req.json();

        if (!priceId) {
            return Response.json({ error: 'Price ID is required' }, { status: 400 });
        }

        // Get the app base URL from environment
        const baseUrl = Deno.env.get("APP_BASE_URL") || "https://app.groceryintel.com";

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            customer_email: user.email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: priceId.includes('month') ? 'subscription' : 'subscription', // All our products are subscriptions
            success_url: `${baseUrl}?payment=success`,
            cancel_url: `${baseUrl}?payment=canceled`,
            allow_promotion_codes: true,
            metadata: {
                user_id: user.id,
                user_email: user.email,
            },
        });

        return Response.json({ url: session.url }, { status: 200 });

    } catch (error) {
        console.error("Error creating checkout session:", error);
        return Response.json(
            { error: error.message },
            { status: 500 }
        );
    }
});