import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { invite_code } = await req.json();

        if (!invite_code) {
            return Response.json({ error: 'invite_code is required' }, { status: 400 });
        }

        // Find household with this code (normalize to uppercase for comparison)
        const normalizedCode = invite_code.trim().toUpperCase();
        const households = await base44.asServiceRole.entities.Household.filter({ 
            invite_code: normalizedCode
        });

        if (!households || households.length === 0) {
            return Response.json({ 
                error: 'Invalid invitation code. Please check and try again.' 
            }, { status: 404 });
        }

        const household = households[0];

        // Check if user is already in a household
        if (user.household_id && user.household_id === household.id) {
            return Response.json({ 
                error: 'You are already a member of this household.' 
            }, { status: 400 });
        }

        // Update user's household_id
        await base44.auth.updateMe({ household_id: household.id });
        
        // Tag user in Brevo as household_joined
        try {
            await base44.asServiceRole.functions.invoke('updateBrevoContact', {
                email: user.email,
                tags: ['household_joined']
            });
            console.log(`User ${user.email} tagged in Brevo: household_joined`);
        } catch (brevoError) {
            console.warn("Brevo tagging failed (non-critical):", brevoError);
        }

        // Blended billing: If the joining user has a paid subscription, 
        // check if it's better than the household's current tier and upgrade the household
        const userTier = user.tier;
        const householdTier = household.subscription_tier || 'free';
        
        const tierPriority = { 'free': 0, 'free_trial': 0, 'standard': 1, 'plus': 2 };
        const userTierPriority = tierPriority[userTier] || 0;
        const householdTierPriority = tierPriority[householdTier] || 0;
        
        if (userTierPriority > householdTierPriority) {
            const scanLimits = { 'free': 4, 'standard': 12, 'plus': 30 };
            
            await base44.asServiceRole.entities.Household.update(household.id, {
                subscription_tier: userTier,
                household_scan_limit: scanLimits[userTier] || 12,
            });
            
            console.log(`[JoinHousehold] Upgraded household ${household.id} to tier: ${userTier} (from joining user ${user.email})`);
        }

        return Response.json({ 
            success: true,
            household: {
                id: household.id,
                name: household.name
            },
            message: `Successfully joined ${household.name}!`
        });

    } catch (error) {
        console.error('Error joining household:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});