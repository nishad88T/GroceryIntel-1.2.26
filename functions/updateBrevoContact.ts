import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Brevo List ID Mapping (auto-assigned by Brevo, cannot be changed)
const BREVO_LIST_IDS = {
    trial_started: 9,
    subscription_cancelled: 8,
    payment_failed: 7,
    household_created: 15,
    welcome_sent: 12,
    trial_ending: 10,
    trial_expired: 14,
    first_scan_completed: 19,
    first_recipe_parsed: 18,
    household_joined: 13,
    limit_reached: 11,
    upgraded: 17,
    renewal_due: 16,
    recipe_limit_reached: 20
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const brevoApiKey = Deno.env.get("BREVO_API_KEY");
        if (!brevoApiKey) {
            console.error('[Brevo] API key not configured');
            return Response.json({ error: "Brevo API key not set" }, { status: 500 });
        }

        const { email, tags, attributes = {}, listIds, eventType } = await req.json();

        if (!email || !tags || !Array.isArray(tags)) {
            return Response.json({ 
                error: "Missing required parameters. Need: email (string) and tags (array)" 
            }, { status: 400 });
        }

        // Auto-resolve list ID if eventType is provided
        let resolvedListIds = listIds;
        if (eventType && BREVO_LIST_IDS[eventType]) {
            resolvedListIds = [BREVO_LIST_IDS[eventType]];
        }

        console.log(`[Brevo] Updating contact ${email} with tags:`, tags, resolvedListIds ? `and lists: ${resolvedListIds}` : '');

        // Brevo support requested tags as string in attributes instead of array
        const brevoPayload = {
            email: email,
            updateEnabled: true,
            attributes: {
                ...attributes,
                tags: tags[0] // Send first tag as string
            }
        };

        // Add listIds if provided (for instant transactional email triggers)
        if (resolvedListIds && Array.isArray(resolvedListIds) && resolvedListIds.length > 0) {
            brevoPayload.listIds = resolvedListIds;
        }

        const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
                'api-key': brevoApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(brevoPayload)
        });

        if (!brevoResponse.ok) {
            const errorText = await brevoResponse.text();
            console.error('[Brevo] API error:', errorText);
            return Response.json({ 
                error: "Failed to update Brevo contact", 
                details: errorText 
            }, { status: brevoResponse.status });
        }

        // Brevo returns empty body (204) for successful updates
        const responseData = brevoResponse.status === 204 ? { success: true } : await brevoResponse.json();

        console.log(`[Brevo] Successfully updated contact ${email}`);
        
        // Create in-app notification for certain tag types
        const notificationTags = [
            'trial_started', 'trial_ending', 'trial_expired', 
            'first_scan_completed', 'first_recipe_parsed', 
            'household_joined', 'limit_reached', 'upgraded', 
            'payment_failed', 'renewal_due'
        ];
        
        for (const tag of tags) {
            if (notificationTags.includes(tag)) {
                try {
                    await base44.asServiceRole.functions.invoke('createNotification', {
                        user_id: user.id,
                        user_email: email,
                        type: tag
                    });
                    console.log(`[Brevo] Created in-app notification for ${email}: ${tag}`);
                } catch (notifError) {
                    console.warn(`[Brevo] Failed to create notification (non-critical):`, notifError);
                }
            }
        }

        return Response.json({ 
            success: true, 
            message: "Brevo contact updated successfully", 
            email: email,
            tags: tags,
            listIds: resolvedListIds || null,
            eventType: eventType || null,
            data: responseData 
        });

    } catch (error) {
        console.error('[Brevo] Function error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});