TESTING STRIPE INTEGRATION - GROCERYINTEL

========================================
OVERVIEW
========================================
Your Stripe integration is complete with free trial and subscription upgrade flow.
Test it in Stripe test mode before going live.

========================================
STRIPE TEST MODE SETUP
========================================

1. ACCESS TEST MODE
   - Login: https://dashboard.stripe.com/test
   - Ensure toggle is in "Test Mode" (top-left corner)

2. WEBHOOK CONFIGURATION (for local testing)
   
   OPTION A: Stripe CLI (Recommended)
   - Install Stripe CLI:
     macOS: brew install stripe/stripe-cli/stripe
     Windows: scoop install stripe
   
   - Login: stripe login
   - Forward webhooks: stripe listen --forward-to https://YOUR_APP_URL/functions/handleStripeWebhook
   - Copy the webhook signing secret shown and add to your secrets

   OPTION B: Manual Webhook Setup
   - Dashboard > Developers > Webhooks > Add endpoint
   - URL: https://YOUR_APP_URL/functions/handleStripeWebhook
   - Select events:
     * checkout.session.completed
     * customer.subscription.deleted
     * customer.subscription.updated
     * invoice.payment_failed

3. TEST PAYMENT CARDS (test mode only)
   - Success: 4242 4242 4242 4242
   - 3D Secure: 4000 0025 0000 3155
   - Declined: 4000 0000 0000 0002
   - Any 3-digit CVC, any future expiry date

========================================
TESTING FLOW
========================================

TEST 1: FREE TRIAL USER
1. Create new user account
2. Verify user starts with:
   - tier: 'free'
   - trial_end_date: 1 month from signup
   - trial_scans_left: 4
   - trial_recipes_parsed: 0
3. Scan a receipt (should decrement trial_scans_left)
4. Parse a recipe (should increment trial_recipes_parsed)

TEST 2: UPGRADE TO STANDARD (YEARLY)
1. Go to Settings > Subscription Management
2. Click "Yearly" toggle (shows £35.99/year)
3. Click "Upgrade to Standard"
4. Use test card: 4242 4242 4242 4242
5. Complete checkout
6. Verify after redirect:
   - tier updated to 'standard'
   - billing_interval: 'yearly'
   - subscription_status: 'active'
   - trial fields cleared
   - monthly_scan_count: 0
   - scan limit: 12/month

TEST 3: UPGRADE TO PLUS (MONTHLY)
1. Settings > Subscription Management
2. Click "Monthly" toggle (shows £5.99/month)
3. Click "Upgrade to Plus"
4. Complete checkout with test card
5. Verify:
   - tier updated to 'plus'
   - billing_interval: 'monthly'
   - scan limit: 30/month

TEST 4: PAYMENT FAILURE
1. Stripe Dashboard > Customers > Find test customer
2. Subscription > Update payment method
3. Use declined card: 4000 0000 0000 0002
4. Trigger renewal: Subscription > "..." > Bill customer
5. Verify subscription_status becomes 'past_due'

TEST 5: SUBSCRIPTION CANCELLATION
1. Stripe Dashboard > Customers > Your customer > Subscriptions
2. Cancel subscription
3. Verify webhook updates:
   - subscription_status: 'canceled'
   - tier: 'free'
   - stripe_subscription_id cleared

========================================
MONITORING WEBHOOKS
========================================

VIEW EVENTS
- Dashboard > Developers > Webhooks
- Click your endpoint
- See recent events (succeeded/failed)

DEBUGGING
- Check backend function logs
- Look for console.log in handleStripeWebhook
- Failed webhooks show errors in Stripe Dashboard

========================================
PRICE IDS (in your code)
========================================
Standard Monthly: price_1SRrRJFtL0CRJ216uHpsOMBj
Standard Yearly:  price_1SRrRKFtL0CRJ216A1RI8VIw
Plus Monthly:     price_1SRrRKFtL0CRJ216Ipaj17Pf
Plus Yearly:      price_1SRrRLFtL0CRJ216CeDn4RAR

========================================
GOING LIVE
========================================

1. Switch to Live Mode in Stripe Dashboard
2. Add production webhook endpoint (live mode)
3. Update STRIPE_SECRET_KEY to live key (sk_live_...)
4. Update STRIPE_WEBHOOK_SECRET to live signing secret
5. Test with real card (small transaction first)

========================================
COMMON ISSUES
========================================

Webhook not receiving events:
- Check webhook URL is correct
- Verify STRIPE_WEBHOOK_SECRET matches
- Ensure events selected in webhook config

Checkout not redirecting:
- Check APP_BASE_URL environment variable
- Verify success/cancel URLs

User tier not updating:
- Check webhook receives checkout.session.completed
- Verify priceTierMap includes your price IDs
- Check email matches between Stripe and database

========================================
SUPPORT RESOURCES
========================================
Stripe Docs: https://stripe.com/docs
Test Cards: https://stripe.com/docs/testing
Stripe CLI: https://stripe.com/docs/stripe-cli
Dashboard: https://dashboard.stripe.com