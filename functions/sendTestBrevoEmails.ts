import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Directly send test emails using Brevo transactional email templates
 * Bypasses workflows and sends emails immediately
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const brevoApiKey = Deno.env.get("BREVO_API_KEY");
        if (!brevoApiKey) {
            return Response.json({ error: "Brevo API key not configured" }, { status: 500 });
        }

        // Test emails to send
        const testEmails = [
            {
                tag: 'trial_started',
                subject: '🎉 Welcome to GroceryIntel™ - Your Trial Has Started!',
                htmlContent: `
                    <h1>Welcome to GroceryIntel™!</h1>
                    <p>Hi ${user.full_name},</p>
                    <p>Your free trial has started! You have access to all features for the next 30 days.</p>
                    <p>Get started by scanning your first receipt!</p>
                    <p><a href="${Deno.env.get('APP_BASE_URL')}/scan-receipt">Scan Your First Receipt</a></p>
                `
            },
            {
                tag: 'trial_ending',
                subject: '⏰ Your GroceryIntel Trial Ends in 3 Days',
                htmlContent: `
                    <h1>Your trial is ending soon</h1>
                    <p>Hi ${user.full_name},</p>
                    <p>Your free trial ends in 3 days. Upgrade now to keep tracking your groceries!</p>
                    <p><a href="${Deno.env.get('APP_BASE_URL')}/settings">View Subscription Options</a></p>
                `
            },
            {
                tag: 'trial_expired',
                subject: '⚠️ Your GroceryIntel Trial Has Expired',
                htmlContent: `
                    <h1>Your trial has expired</h1>
                    <p>Hi ${user.full_name},</p>
                    <p>Your trial has ended. Upgrade to continue using GroceryIntel™.</p>
                    <p><a href="${Deno.env.get('APP_BASE_URL')}/settings">Upgrade Now</a></p>
                `
            },
            {
                tag: 'first_scan_completed',
                subject: '🎯 First Scan Complete - Great Start!',
                htmlContent: `
                    <h1>Congratulations on your first scan!</h1>
                    <p>Hi ${user.full_name},</p>
                    <p>You've completed your first receipt scan. Keep it up to unlock powerful insights!</p>
                    <p><a href="${Deno.env.get('APP_BASE_URL')}/receipts">View Your Receipts</a></p>
                `
            },
            {
                tag: 'limit_reached',
                subject: '🚫 Monthly Scan Limit Reached',
                htmlContent: `
                    <h1>You've reached your monthly scan limit</h1>
                    <p>Hi ${user.full_name},</p>
                    <p>You've used all your scans for this month. Upgrade to scan more receipts!</p>
                    <p><a href="${Deno.env.get('APP_BASE_URL')}/settings">Upgrade Your Plan</a></p>
                `
            },
            {
                tag: 'renewal_due',
                subject: '🔔 Your Subscription Renews Soon',
                htmlContent: `
                    <h1>Subscription renewal reminder</h1>
                    <p>Hi ${user.full_name},</p>
                    <p>Your subscription will renew in 7 days. Make sure your payment method is up to date!</p>
                    <p><a href="${Deno.env.get('APP_BASE_URL')}/settings">Manage Subscription</a></p>
                `
            }
        ];

        const results = {
            success: true,
            email: user.email,
            emails_sent: [],
            errors: []
        };

        console.log(`[Brevo Direct Email Test] Sending ${testEmails.length} test emails to ${user.email}`);

        for (const emailData of testEmails) {
            try {
                const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'api-key': brevoApiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sender: {
                            name: 'GroceryIntel',
                            email: 'noreply@groceryintel.com'
                        },
                        to: [{
                            email: user.email,
                            name: user.full_name
                        }],
                        subject: emailData.subject,
                        htmlContent: emailData.htmlContent,
                        tags: [emailData.tag, 'test_email']
                    })
                });

                if (!brevoResponse.ok) {
                    const errorText = await brevoResponse.text();
                    throw new Error(`Brevo API error: ${errorText}`);
                }

                results.emails_sent.push(emailData.tag);
                console.log(`[Brevo Direct Email Test] Sent: ${emailData.tag}`);

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`[Brevo Direct Email Test] Failed for ${emailData.tag}:`, error);
                results.errors.push({
                    tag: emailData.tag,
                    error: error.message
                });
            }
        }

        console.log(`[Brevo Direct Email Test] Completed: ${results.emails_sent.length} sent, ${results.errors.length} errors`);

        return Response.json(results);

    } catch (error) {
        console.error('[Brevo Direct Email Test] Function error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});