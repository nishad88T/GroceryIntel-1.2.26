import Stripe from 'npm:stripe@17.5.0';
import { requireUser } from './_helpers/supabase.ts';

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' }) : null;

Deno.serve(async (req) => {
  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    if (!stripe) {
      return Response.json({ error: 'Stripe is not configured yet' }, { status: 503 });
    }

    const { user } = auth;
    const { priceId } = await req.json();

    if (!priceId) {
      return Response.json({ error: 'Price ID is required' }, { status: 400 });
    }

    const baseUrl = Deno.env.get('APP_BASE_URL') || 'https://app.groceryintel.com';

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}?payment=success`,
      cancel_url: `${baseUrl}?payment=canceled`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id, user_email: user.email || '' }
    });

    return Response.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error('[createCheckoutSession] Error:', error);
    return Response.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 });
  }
});
