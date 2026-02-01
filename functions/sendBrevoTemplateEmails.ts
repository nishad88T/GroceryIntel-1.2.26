import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Send emails using Brevo transactional email templates
 * You need to get your template IDs from Brevo dashboard: 
 * Brevo > Transactional > Templates > Click template > Copy template ID
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

        // TODO: Replace these with your actual Brevo template IDs
        // Get them from: Brevo Dashboard > Transactional > Templates
        const templates = [
            {
                id: 1, // Replace with your "Trial Started" template ID
                name: 'trial_started',
                params: {
                    FIRSTNAME: user.full_name?.split(' ')[0] || 'User',
                    APP_URL: Deno.env.get('APP_BASE_URL') || 'https://your-app.base44.app'
                }
            },
            {
                id: 2, // Replace with your "Trial Ending" template ID
                name: 'trial_ending',
                params: {
                    FIRSTNAME: user.full_name?.split(' ')[0] || 'User',
                    APP_URL: Deno.env.get('APP_BASE_URL') || 'https://your-app.base44.app',
                    DAYS_LEFT: '3'
                }
            },
            {
                id: 3, // Replace with your "Trial Expired" template ID
                name: 'trial_expired',
                params: {
                    FIRSTNAME: user.full_name?.split(' ')[0] || 'User',
                    APP_URL: Deno.env.get('APP_BASE_URL') || 'https://your-app.base44.app'
                }
            },
            {
                id: 4, // Replace with your "First Scan" template ID
                name: 'first_scan_completed',
                params: {
                    FIRSTNAME: user.full_name?.split(' ')[0] || 'User',
                    APP_URL: Deno.env.get('APP_BASE_URL') || 'https://your-app.base44.app'
                }
            },
            {
                id: 5, // Replace with your "Limit Reached" template ID
                name: 'limit_reached',
                params: {
                    FIRSTNAME: user.full_name?.split(' ')[0] || 'User',
                    APP_URL: Deno.env.get('APP_BASE_URL') || 'https://your-app.base44.app'
                }
            },
            {
                id: 6, // Replace with your "Renewal Due" template ID
                name: 'renewal_due',
                params: {
                    FIRSTNAME: user.full_name?.split(' ')[0] || 'User',
                    APP_URL: Deno.env.get('APP_BASE_URL') || 'https://your-app.base44.app',
                    DAYS_UNTIL_RENEWAL: '7'
                }
            }
        ];

        const results = {
            success: true,
            email: user.email,
            emails_sent: [],
            errors: [],
            instructions: "Update template IDs in this function with your actual Brevo template IDs"
        };

        console.log(`[Brevo Template Test] Sending ${templates.length} template emails to ${user.email}`);

        for (const template of templates) {
            try {
                const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'api-key': brevoApiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        to: [{
                            email: user.email,
                            name: user.full_name
                        }],
                        templateId: template.id,
                        params: template.params,
                        tags: [template.name, 'test_email']
                    })
                });

                if (!brevoResponse.ok) {
                    const errorText = await brevoResponse.text();
                    throw new Error(`Brevo API error: ${errorText}`);
                }

                const responseData = await brevoResponse.json();
                results.emails_sent.push({
                    template: template.name,
                    messageId: responseData.messageId
                });
                console.log(`[Brevo Template Test] Sent: ${template.name} (template ID: ${template.id})`);

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`[Brevo Template Test] Failed for ${template.name}:`, error);
                results.errors.push({
                    template: template.name,
                    template_id: template.id,
                    error: error.message
                });
            }
        }

        console.log(`[Brevo Template Test] Completed: ${results.emails_sent.length} sent, ${results.errors.length} errors`);

        return Response.json(results);

    } catch (error) {
        console.error('[Brevo Template Test] Function error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});