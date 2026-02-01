import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
    apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
    try {
        const signature = req.headers.get("stripe-signature");
        const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

        if (!signature || !webhookSecret) {
            console.error("Missing signature or webhook secret");
            return Response.json(
                { error: "Webhook signature or secret not configured" },
                { status: 400 }
            );
        }

        // Get the raw body for signature verification
        const body = await req.text();

        // Verify the webhook signature (must use async version in Deno)
        let event;
        try {
            event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        } catch (err) {
            console.error("Webhook signature verification failed:", err.message);
            return Response.json(
                { error: `Webhook Error: ${err.message}` },
                { status: 400 }
            );
        }

        console.log("Received Stripe webhook event:", event.type);

        // Initialize Base44 client with service role for admin operations
        const base44 = createClientFromRequest(req);

        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                console.log("Checkout session completed:", session.id);

                // Extract subscription information
                const customerId = session.customer;
                const subscriptionId = session.subscription;
                const customerEmail = session.customer_details?.email;

                if (!customerEmail) {
                    console.error("No customer email in checkout session");
                    break;
                }

                // Retrieve the subscription to get more details
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const priceId = subscription.items.data[0]?.price.id;

                // Determine tier and billing interval based on price ID
                let tier = 'standard';
                let billingInterval = 'monthly';

                // Map your Stripe Price IDs to tiers and intervals
                const priceTierMap = {
                    // Standard plans
                    'price_1SRrRJFtL0CRJ216uHpsOMBj': { tier: 'standard', interval: 'month' },  // Standard Monthly £3.59
                    'price_1SRrRKFtL0CRJ216A1RI8VIw': { tier: 'standard', interval: 'year' },   // Standard Yearly £35.99
                    // Plus plans
                    'price_1SRrRKFtL0CRJ216Ipaj17Pf': { tier: 'plus', interval: 'month' },     // Plus Monthly £5.99
                    'price_1SRrRLFtL0CRJ216CeDn4RAR': { tier: 'plus', interval: 'year' },      // Plus Yearly £59.99
                };

                const priceInfo = priceTierMap[priceId];
                if (priceInfo) {
                    tier = priceInfo.tier;
                    billingInterval = priceInfo.interval + 'ly'; // 'month' -> 'monthly', 'year' -> 'yearly'
                }

                // Update user record with subscription details using service role
                try {
                    const users = await base44.asServiceRole.entities.User.filter({ email: customerEmail });
                    
                    if (users && users.length > 0) {
                        const user = users[0];
                        const userId = user.id;
                        
                        // Update user's subscription details
                        await base44.asServiceRole.entities.User.update(userId, {
                            stripe_customer_id: customerId,
                            stripe_subscription_id: subscriptionId,
                            subscription_status: 'active',
                            tier: tier,
                            billing_interval: billingInterval,
                            trial_end_date: null,
                            trial_scans_left: null,
                        });
                        console.log(`User ${customerEmail} subscription activated: ${tier} (${billingInterval})`);
                        
                        // Tag user in Brevo as upgraded
                        try {
                            await base44.asServiceRole.functions.invoke('updateBrevoContact', {
                                email: customerEmail,
                                tags: ['upgraded']
                            });
                            console.log(`User ${customerEmail} tagged in Brevo: upgraded`);
                        } catch (brevoError) {
                            console.warn("Brevo tagging failed (non-critical):", brevoError);
                        }

                        // If user is in a household, update the household's subscription tier and limits
                        if (user.household_id) {
                            const scanLimits = {
                                'free': 4,
                                'standard': 12,
                                'plus': 30
                            };
                            
                            await base44.asServiceRole.entities.Household.update(user.household_id, {
                                subscription_tier: tier,
                                household_scan_limit: scanLimits[tier] || 12,
                            });
                            console.log(`Household ${user.household_id} subscription updated to: ${tier}`);
                        }
                    } else {
                        console.error(`User not found with email: ${customerEmail}`);
                    }
                } catch (error) {
                    console.error("Error updating user after checkout:", error);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                console.log("Subscription deleted:", subscription.id);

                try {
                    const users = await base44.asServiceRole.entities.User.filter({ 
                        stripe_subscription_id: subscription.id 
                    });

                    if (users && users.length > 0) {
                        const user = users[0];
                        const userId = user.id;
                        
                        await base44.asServiceRole.entities.User.update(userId, {
                            subscription_status: 'canceled',
                            stripe_subscription_id: null,
                            tier: 'free',
                        });
                        console.log(`User subscription canceled for user ID: ${userId}`);

                        // If user is in a household, reset household subscription to free
                        if (user.household_id) {
                            await base44.asServiceRole.entities.Household.update(user.household_id, {
                                subscription_tier: 'free',
                                household_scan_limit: 4,
                            });
                            console.log(`Household ${user.household_id} subscription reset to free`);
                        }
                    }
                } catch (error) {
                    console.error("Error handling subscription deletion:", error);
                }
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                console.log("Payment failed for invoice:", invoice.id);

                const subscriptionId = invoice.subscription;
                if (subscriptionId) {
                    try {
                        const users = await base44.asServiceRole.entities.User.filter({ 
                            stripe_subscription_id: subscriptionId 
                        });

                        if (users && users.length > 0) {
                            const userId = users[0].id;
                            const userEmail = users[0].email;
                            await base44.asServiceRole.entities.User.update(userId, {
                                subscription_status: 'past_due',
                            });
                            console.log(`User subscription marked as past_due for user ID: ${userId}`);
                            
                            // Tag user in Brevo as payment_failed
                            try {
                                await base44.asServiceRole.functions.invoke('updateBrevoContact', {
                                    email: userEmail,
                                    tags: ['payment_failed']
                                });
                                console.log(`User ${userEmail} tagged in Brevo: payment_failed`);
                            } catch (brevoError) {
                                console.warn("Brevo tagging failed (non-critical):", brevoError);
                            }
                        }
                    } catch (error) {
                        console.error("Error handling payment failure:", error);
                    }
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                console.log("Subscription updated:", subscription.id);

                const priceId = subscription.items.data[0]?.price.id;
                let tier = 'standard';
                let billingInterval = 'monthly';

                // Map price IDs to tiers (same as above)
                const priceTierMap = {
                    'price_1SRrRJFtL0CRJ216uHpsOMBj': { tier: 'standard', interval: 'month' },
                    'price_1SRrRKFtL0CRJ216A1RI8VIw': { tier: 'standard', interval: 'year' },
                    'price_1SRrRKFtL0CRJ216Ipaj17Pf': { tier: 'plus', interval: 'month' },
                    'price_1SRrRLFtL0CRJ216CeDn4RAR': { tier: 'plus', interval: 'year' },
                };

                const priceInfo = priceTierMap[priceId];
                if (priceInfo) {
                    tier = priceInfo.tier;
                    billingInterval = priceInfo.interval + 'ly';
                }

                try {
                    const users = await base44.asServiceRole.entities.User.filter({ 
                        stripe_subscription_id: subscription.id 
                    });

                    if (users && users.length > 0) {
                        const user = users[0];
                        const userId = user.id;
                        
                        await base44.asServiceRole.entities.User.update(userId, {
                            subscription_status: subscription.status,
                            tier: tier,
                            billing_interval: billingInterval,
                        });
                        console.log(`User subscription updated for user ID: ${userId}`);

                        // If user is in a household, update household subscription
                        if (user.household_id) {
                            const scanLimits = {
                                'free': 4,
                                'standard': 12,
                                'plus': 30
                            };
                            
                            await base44.asServiceRole.entities.Household.update(user.household_id, {
                                subscription_tier: tier,
                                household_scan_limit: scanLimits[tier] || 12,
                            });
                            console.log(`Household ${user.household_id} subscription updated to: ${tier}`);
                        }
                    }
                } catch (error) {
                    console.error("Error handling subscription update:", error);
                }
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        // Return a 200 response to acknowledge receipt of the event
        return Response.json({ received: true }, { status: 200 });

    } catch (error) {
        console.error("Webhook handler error:", error);
        return Response.json(
            { error: error.message },
            { status: 500 }
        );
    }
});