export async function resolveHouseholdId(base44, user) {
    if (!user) {
        return null;
    }

    if (user.household_id) {
        return user.household_id;
    }

    const memberships = await base44.asServiceRole.entities.HouseholdMember.filter({
        user_id: user.id
    }, '-created_date', 1);

    if (memberships && memberships.length > 0) {
        return memberships[0].household_id;
    }

    return null;
}

export async function getHouseholdMembers(base44, householdId) {
    const memberships = await base44.asServiceRole.entities.HouseholdMember.filter({
        household_id: householdId
    });

    if (!memberships || memberships.length === 0) {
        return { memberships: [], profiles: [] };
    }

    const profiles = await Promise.all(
        memberships.map((member) => base44.asServiceRole.entities.User.get(member.user_id).catch(() => null))
    );

    return {
        memberships,
        profiles: profiles.filter(Boolean)
    };
}


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

        const currentHouseholdId = await resolveHouseholdId(base44, user);

        // Check if user is already in a household
        if (currentHouseholdId && currentHouseholdId === household.id) {
            return Response.json({ 
                error: 'You are already a member of this household.' 
            }, { status: 400 });
        }

        // Create household membership (profiles + household_members model)
        try {
            await base44.asServiceRole.entities.HouseholdMember.create({
                household_id: household.id,
                user_id: user.id,
                role: 'member'
            });
        } catch (membershipError) {
            await base44.asServiceRole.entities.HouseholdMember.create({
                household_id: household.id,
                user_id: user.id
            });
        }

        // Backward compatibility: keep profile in sync if still present
        if (user.household_id !== household.id) {
            await base44.auth.updateMe({ household_id: household.id });
        }
        
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
