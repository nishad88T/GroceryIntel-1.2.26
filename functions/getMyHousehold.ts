import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log("[getMyHousehold] User:", user.email, "household_id:", user.household_id);

        if (!user.household_id) {
            return Response.json({ 
                household: null,
                members: [],
                message: 'User has no household'
            });
        }

        // Use service role to bypass RLS and get the household
        const households = await base44.asServiceRole.entities.Household.filter({ 
            id: user.household_id 
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
        const members = await base44.asServiceRole.entities.User.filter({ 
            household_id: user.household_id 
        });

        console.log("[getMyHousehold] Members found:", members?.length);

        return Response.json({ 
            household,
            members: members || [],
            currentUserId: user.id
        });

    } catch (error) {
        console.error('[getMyHousehold] Error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});