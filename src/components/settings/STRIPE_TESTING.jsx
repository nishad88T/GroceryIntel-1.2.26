# Testing Stripe Integration

## Overview
Your Stripe integration is now complete with a free trial tier and subscription upgrade flow. Here's how to test it in Stripe's test mode.

## Stripe Test Mode Setup

### 1. Access Test Mode
- Log into your Stripe Dashboard: https://dashboard.stripe.com/test
- Ensure you're in **Test Mode** (toggle in top-left corner)

### 2. Webhook Configuration
To receive webhook events locally during development:

**Option A: Stripe CLI (Recommended)**
```bash
# Install Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Login to Stripe
stripe login

# Forward webhooks to your local backend function
stripe listen --forward-to https://YOUR_APP_URL/functions/handleStripeWebhook
```

**Option B: Ngrok + Webhook Endpoint**
1. Install ngrok: `npm install -g ngrok`
2. Start ngrok: `ngrok http 3000` (or your port)
3. Copy the HTTPS URL
4. In Stripe Dashboard → Developers → Webhooks → Add endpoint
5. Paste: `https://YOUR_NGROK_URL/functions/handleStripeWebhook`
6. Select events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`, `invoice.payment_failed`

### 3. Test Payment Cards
Use these test card numbers (test mode only):

| Card Type | Number | CVC | Expiry |
|-----------|--------|-----|--------|
| Success | `4242 4242 4242 4242` | Any 3 digits | Any future date |
| Requires authentication (3D Secure) | `4000 0025 0000 3155` | Any 3 digits | Any future date |
| Declined | `4000 0000 0000 0002` | Any 3 digits | Any future date |

## Testing Flow

### Test 1: Free Trial User
1. Create a new user account in your app
2. Verify they start with:
   - `tier: 'free'`
   - `trial_end_date`: 1 month from signup
   - `trial_scans_left: 4`
   - `trial_recipes_parsed: 0`
3. Try scanning a receipt (should decrement `trial_scans_left`)
4. Try parsing a recipe (should increment `trial_recipes_parsed`)

### Test 2: Upgrade to Standard (Yearly)
1. Go to Settings → Subscription Management
2. Click "Yearly" toggle (should show £35.99/year)
3. Click "Upgrade to Standard"
4. You'll be redirected to Stripe Checkout
5. Use test card: `4242 4242 4242 4242`
6. Complete checkout
7. You'll be redirected back to your app
8. Verify:
   - User's `tier` updated to `'standard'`
   - `billing_interval` set to `'yearly'`
   - `subscription_status` is `'active'`
   - `trial_end_date` and `trial_scans_left` cleared
   - `monthly_scan_count` reset to 0
   - New scan limit: 12/month

### Test 3: Upgrade to Plus (Monthly)
1. Go to Settings → Subscription Management
2. Click "Monthly" toggle (should show £5.99/month)
3. Click "Upgrade to Plus"
4. Complete checkout with test card
5. Verify:
   - User's `tier` updated to `'plus'`
   - `billing_interval` set to `'monthly'`
   - New scan limit: 30/month

### Test 4: Payment Failure
1. In Stripe Dashboard (test mode) → Customers
2. Find your test customer
3. Go to their subscription → Update payment method
4. Use declined card: `4000 0000 0000 0002`
5. Trigger a renewal (Stripe Dashboard → Subscription → "..." → Bill customer)
6. Verify webhook updates `subscription_status` to `'past_due'`

### Test 5: Subscription Cancellation
1. In Stripe Dashboard → Customers → Your customer → Subscriptions
2. Cancel the subscription
3. Verify webhook updates:
   - `subscription_status` to `'canceled'`
   - `tier` back to `'free_trial'` (or `'free'`)
   - `stripe_subscription_id` cleared

## Monitoring Webhooks

### View Webhook Events
- Stripe Dashboard → Developers → Webhooks
- Click on your endpoint
- See recent events and their status (succeeded/failed)

### Debugging
- Check your backend function logs for webhook handling
- Look for console.log outputs in `handleStripeWebhook`
- Failed webhooks will show error messages in Stripe Dashboard

## Going Live

### 1. Switch to Live Mode
- Toggle from Test Mode to Live Mode in Stripe Dashboard

### 2. Update Webhook Endpoint
- Add production webhook endpoint in Live Mode
- Use your production URL: `https://app.groceryintel.com/functions/handleStripeWebhook`

### 3. Verify Secrets
- Ensure `STRIPE_SECRET_KEY` uses live key (starts with `sk_live_`)
- Update `STRIPE_WEBHOOK_SECRET` with live webhook signing secret

### 4. Test with Real Card
- Complete a small transaction with a real card
- Verify all data flows correctly

## Common Issues

### Webhook not receiving events
- Check webhook endpoint URL is correct
- Ensure `STRIPE_WEBHOOK_SECRET` matches webhook signing secret
- Verify events are selected in webhook configuration

### Checkout session not redirecting
- Check `APP_BASE_URL` environment variable is set correctly
- Verify success/cancel URLs in `createCheckoutSession`

### User tier not updating after payment
- Check webhook is receiving `checkout.session.completed` event
- Verify `priceTierMap` in `handleStripeWebhook` includes your price IDs
- Check user email matches between Stripe and your database

## Support Resources
- Stripe Docs: https://stripe.com/docs
- Stripe Test Cards: https://stripe.com/docs/testing
- Stripe CLI: https://stripe.com/docs/stripe-cli
- Your Stripe Dashboard: https://dashboard.stripe.com