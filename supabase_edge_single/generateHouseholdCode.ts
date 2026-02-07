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

// Generate a unique 6-character code
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking chars
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { household_id } = await req.json();
        const resolvedHouseholdId = household_id || await resolveHouseholdId(base44, user);

        if (!resolvedHouseholdId) {
            return Response.json({ error: 'household_id is required' }, { status: 400 });
        }

        // Check if household already has a code
        const household = await base44.entities.Household.get(resolvedHouseholdId);
        if (household.admin_id !== user.id) {
            return Response.json({ error: 'Only household admins can generate invite codes.' }, { status: 403 });
        }
        
        if (household.invite_code) {
            return Response.json({ 
                success: true, 
                invite_code: household.invite_code,
                message: 'Household already has an invite code'
            });
        }

        // Generate a unique code
        let code;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!isUnique && attempts < maxAttempts) {
            code = generateCode();
            
            // Check if code already exists
            const existing = await base44.entities.Household.filter({ invite_code: code });
            
            if (!existing || existing.length === 0) {
                isUnique = true;
            }
            
            attempts++;
        }

        if (!isUnique) {
            return Response.json({ error: 'Failed to generate unique code' }, { status: 500 });
        }

        // Update household with the code
        await base44.entities.Household.update(resolvedHouseholdId, { invite_code: code });

        return Response.json({ 
            success: true, 
            invite_code: code 
        });

    } catch (error) {
        console.error('Error generating household code:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});
