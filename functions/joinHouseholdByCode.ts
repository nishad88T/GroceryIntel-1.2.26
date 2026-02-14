import { createServiceClient, requireUser } from './_helpers/supabase.ts';

Deno.serve(async (req) => {
  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    const { user } = auth;
    const { invite_code } = await req.json();

    if (!invite_code || typeof invite_code !== 'string') {
      return Response.json({ error: 'invite_code is required' }, { status: 400 });
    }

    const code = invite_code.trim().toUpperCase();
    const service = createServiceClient();

    const rpcResult = await service.rpc('join_household_by_code', { p_code: code });
    if (!rpcResult.error) {
      return Response.json({ success: true, message: 'Successfully joined household.' });
    }

    const { data: household } = await service
      .from('households')
      .select('*')
      .eq('invite_code', code)
      .maybeSingle();

    if (!household) {
      return Response.json({ error: 'Invalid invitation code. Please check and try again.' }, { status: 404 });
    }

    const { error: memberError } = await service
      .from('household_members')
      .upsert({ household_id: household.id, user_id: user.id, role: 'member' }, { onConflict: 'household_id,user_id' });

    if (memberError) {
      throw memberError;
    }

    await service.from('profiles').update({ household_id: household.id }).eq('id', user.id);

    return Response.json({
      success: true,
      household: { id: household.id, name: household.name },
      message: `Successfully joined ${household.name}!`
    });
  } catch (error) {
    console.error('[joinHouseholdByCode] Error:', error);
    return Response.json({ error: error.message || 'Failed to join household' }, { status: 500 });
  }
});
