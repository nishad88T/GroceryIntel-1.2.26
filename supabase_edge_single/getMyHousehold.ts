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

        const householdId = await resolveHouseholdId(base44, user);
        console.log("[getMyHousehold] User:", user.email, "household_id:", householdId);

        if (!householdId) {
            return Response.json({ 
                household: null,
                members: [],
                message: 'User has no household'
            });
        }

        // Use service role to bypass RLS and get the household
        const households = await base44.asServiceRole.entities.Household.filter({ 
            id: householdId 
        });

        console.log("[getMyHousehold] Households found:", households?.length);

        if (!households || households.length === 0) {
            return Response.json({ 
                household: null,
                members: [],
                message: 'Household not found'
            });
        }

        const household = households[0];

        // Get all members of this household
        const { memberships, profiles } = await getHouseholdMembers(base44, householdId);
        console.log("[getMyHousehold] Members found:", profiles.length);

        return Response.json({ 
            household,
            members: profiles,
            memberships,
            currentUserId: user.id
        });

    } catch (error) {
        console.error('[getMyHousehold] Error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});
