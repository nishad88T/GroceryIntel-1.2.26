import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Backend function to mark a HouseholdInvitation as accepted or expired.
 * 
 * This function uses service role privileges to update the invitation status,
 * bypassing RLS restrictions that would prevent a newly-invited user from
 * updating the invitation record before they've joined the household.
 * 
 * Called by: pages/JoinHousehold.js
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // 1. Authenticate the user making the request
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get parameters from request
        const { invitation_id, status } = await req.json();

        if (!invitation_id || !status) {
            return Response.json({ 
                error: 'Missing required parameters: invitation_id and status' 
            }, { status: 400 });
        }

        // Validate status value
        if (!['accepted', 'expired'].includes(status)) {
            return Response.json({ 
                error: 'Invalid status. Must be "accepted" or "expired"' 
            }, { status: 400 });
        }

        // 3. Fetch the invitation using service role to bypass RLS
        const invitations = await base44.asServiceRole.entities.HouseholdInvitation.filter({ 
            id: invitation_id 
        });

        if (invitations.length === 0) {
            return Response.json({ 
                error: 'Invitation not found' 
            }, { status: 404 });
        }

        const invitation = invitations[0];

        // 4. Verify the authenticated user is the intended recipient
        // This security check ensures users can only accept their own invitations
        if (invitation.invitee_email.toLowerCase() !== user.email.toLowerCase()) {
            return Response.json({ 
                error: 'This invitation is not for your email address' 
            }, { status: 403 });
        }

        // 5. Update the invitation status using service role
        await base44.asServiceRole.entities.HouseholdInvitation.update(invitation_id, {
            status: status
        });

        console.log(`Invitation ${invitation_id} marked as ${status} for user ${user.email}`);

        return Response.json({
            success: true,
            invitation_id: invitation_id,
            status: status,
            message: `Invitation successfully marked as ${status}`
        }, { status: 200 });

    } catch (error) {
        console.error('Error marking invitation:', error);
        return Response.json(
            { error: error.message || 'Failed to update invitation status' },
            { status: 500 }
        );
    }
});