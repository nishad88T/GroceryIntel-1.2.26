import { createServiceClient, requireUser } from './_helpers/supabase.ts';
import { getHouseholdMembers, resolveHouseholdId } from './_helpers/household.ts';

Deno.serve(async (req) => {
  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    const { user } = auth;
    const service = createServiceClient();

    const profileRes = await service
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .maybeSingle();

    const householdId = await resolveHouseholdId(user.id, profileRes.data?.household_id || null);

    if (!householdId) {
      return Response.json({ household: null, members: [], message: 'User has no household' });
    }

    const { data: household } = await service
      .from('households')
      .select('*')
      .eq('id', householdId)
      .maybeSingle();

    if (!household) {
      return Response.json({ household: null, members: [], message: 'Household not found' });
    }

    const { memberships, profiles } = await getHouseholdMembers(householdId);

    return Response.json({
      household,
      members: profiles,
      memberships,
      currentUserId: user.id
    });
  } catch (error) {
    console.error('[getMyHousehold] Error:', error);
    return Response.json({ error: error.message || 'Failed to load household' }, { status: 500 });
  }
});
