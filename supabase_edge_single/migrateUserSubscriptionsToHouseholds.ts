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
        
        // Verify admin access
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        console.log('[Migration] Starting user subscription to household migration...');

        // Get all users with active subscriptions who are in households
        const allUsers = await base44.asServiceRole.entities.User.filter({});
        
        const results = {
            total_users: allUsers.length,
            users_with_subscriptions: 0,
            households_updated: 0,
            skipped_no_household: 0,
            errors: []
        };

        const scanLimits = {
            'free': 4,
            'standard': 12,
            'plus': 30
        };

        for (const user of allUsers) {
            // Check if user has an active paid subscription
            const userTier = user.tier;
            const hasSubscription = userTier && userTier !== 'free' && userTier !== 'free_trial';
            
            if (hasSubscription) {
                results.users_with_subscriptions++;
                
                const householdId = await resolveHouseholdId(base44, user);
                if (householdId) {
                    try {
                        // Update the household's subscription tier
                        await base44.asServiceRole.entities.Household.update(householdId, {
                            subscription_tier: userTier,
                            household_scan_limit: scanLimits[userTier] || 12,
                        });
                        
                        console.log(`[Migration] Updated household ${householdId} to tier: ${userTier} for user ${user.email}`);
                        results.households_updated++;
                    } catch (error) {
                        console.error(`[Migration] Error updating household ${householdId}:`, error);
                        results.errors.push({
                            user_email: user.email,
                            household_id: householdId,
                            error: error.message
                        });
                    }
                } else {
                    console.log(`[Migration] User ${user.email} has subscription (${userTier}) but no household - individual billing applies`);
                    results.skipped_no_household++;
                }
            }
        }

        console.log('[Migration] Migration complete:', results);

        return Response.json({
            success: true,
            message: 'Migration completed',
            results
        });

    } catch (error) {
        console.error('[Migration] Function error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});
