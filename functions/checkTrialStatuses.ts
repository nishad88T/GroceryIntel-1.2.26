import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Scheduled function to check trial statuses and tag users in Brevo
 * Run this daily via a cron job or scheduled task
 * 
 * To set up: Create a Make.com scenario that calls this function daily
 * OR use a service like cron-job.org to hit this endpoint daily
 * URL: https://your-app-url.base44.app/api/functions/checkTrialStatuses
 * Method: POST
 * Headers: X-API-KEY: your-secret-key
 */

Deno.serve(async (req) => {
    try {
        // Validate API key for scheduled calls (prevent unauthorized access)
        const apiKey = req.headers.get('X-API-KEY');
        const expectedKey = Deno.env.get('SCHEDULED_TASK_SECRET') || Deno.env.get('MAKE_COM_SECRET');
        
        if (!apiKey || apiKey !== expectedKey) {
            console.error('[Trial Check] Invalid or missing API key');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const base44 = createClientFromRequest(req);
        const today = new Date();
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        console.log(`[Trial Check] Starting daily trial status check for ${today.toISOString()}`);

        // Fetch all users with trial_end_date set
        const allUsers = await base44.asServiceRole.entities.User.filter({});
        const usersWithTrials = allUsers.filter(u => u.trial_end_date);

        let expiredCount = 0;
        let endingCount = 0;
        let renewalCount = 0;

        for (const user of usersWithTrials) {
            const trialEndDate = new Date(user.trial_end_date);
            const daysUntilExpiry = Math.ceil((trialEndDate - today) / (1000 * 60 * 60 * 24));

            try {
                // Trial expired
                if (daysUntilExpiry < 0 && user.tier === 'free') {
                    await base44.asServiceRole.functions.invoke('updateBrevoContact', {
                        email: user.email,
                        tags: ['trial_expired']
                    });
                    expiredCount++;
                    console.log(`[Trial Check] Tagged ${user.email} as trial_expired`);
                }
                // Trial ending in 3 days
                else if (daysUntilExpiry > 0 && daysUntilExpiry <= 3) {
                    await base44.asServiceRole.functions.invoke('updateBrevoContact', {
                        email: user.email,
                        tags: ['trial_ending']
                    });
                    endingCount++;
                    console.log(`[Trial Check] Tagged ${user.email} as trial_ending (${daysUntilExpiry} days left)`);
                }
                // Renewal due (for paid users with subscription_status = 'active' and billing cycle ending soon)
                else if (user.subscription_status === 'active' && user.stripe_subscription_id) {
                    // Check if renewal is within 7 days
                    // Note: You'd need to fetch subscription details from Stripe to get exact renewal date
                    // For now, we'll tag based on monthly/yearly cycles
                    const accountAge = Math.ceil((today - new Date(user.created_date)) / (1000 * 60 * 60 * 24));
                    const isMonthly = user.billing_interval === 'monthly';
                    const isYearly = user.billing_interval === 'yearly';
                    
                    if ((isMonthly && accountAge % 30 === 27) || (isYearly && accountAge % 365 === 358)) {
                        await base44.asServiceRole.functions.invoke('updateBrevoContact', {
                            email: user.email,
                            tags: ['renewal_due']
                        });
                        renewalCount++;
                        console.log(`[Trial Check] Tagged ${user.email} as renewal_due`);
                    }
                }
            } catch (brevoError) {
                console.warn(`[Trial Check] Failed to tag ${user.email}:`, brevoError.message);
            }
        }

        console.log(`[Trial Check] Completed: ${expiredCount} expired, ${endingCount} ending, ${renewalCount} renewals`);

        return Response.json({
            success: true,
            message: 'Trial status check completed',
            results: {
                total_users_checked: usersWithTrials.length,
                trial_expired: expiredCount,
                trial_ending: endingCount,
                renewal_due: renewalCount
            }
        });

    } catch (error) {
        console.error('[Trial Check] Function error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});