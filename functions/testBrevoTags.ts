import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Test function to trigger all Brevo tags for testing email campaigns
 * This will tag the current user with all possible tags to trigger test emails
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // All Brevo tags used in the app
        const tagsToTest = [
            'trial_started',
            'trial_ending',
            'trial_expired',
            'renewal_due',
            'first_scan_completed',
            'first_recipe_parsed',
            'household_joined',
            'limit_reached',
            'upgraded',
            'payment_failed'
        ];

        const results = {
            success: true,
            email: user.email,
            tags_applied: [],
            errors: []
        };

        console.log(`[Brevo Test] Testing all tags for ${user.email}`);

        // Apply each tag
        for (const tag of tagsToTest) {
            try {
                await base44.functions.invoke('updateBrevoContact', {
                    email: user.email,
                    tags: [tag],
                    attributes: {
                        first_name: user.full_name?.split(' ')[0] || 'Test User'
                    }
                });
                results.tags_applied.push(tag);
                console.log(`[Brevo Test] Applied tag: ${tag}`);
            } catch (error) {
                console.error(`[Brevo Test] Failed to apply tag ${tag}:`, error);
                results.errors.push({
                    tag,
                    error: error.message
                });
            }
        }

        console.log(`[Brevo Test] Completed: ${results.tags_applied.length} tags applied, ${results.errors.length} errors`);

        return Response.json(results);

    } catch (error) {
        console.error('[Brevo Test] Function error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});