import { createServiceClient, requireUser } from './_helpers/supabase.ts';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req) => {
  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    const { user } = auth;
    const body = await req.json().catch(() => ({}));
    const householdId = body.household_id;

    if (!householdId) {
      return Response.json({ error: 'household_id is required' }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: household } = await service
      .from('households')
      .select('*')
      .eq('id', householdId)
      .maybeSingle();

    if (!household) {
      return Response.json({ error: 'Household not found' }, { status: 404 });
    }

    if (household.admin_id !== user.id) {
      return Response.json({ error: 'Only household admins can generate invite codes.' }, { status: 403 });
    }

    const rpcResult = await service.rpc('create_household_invite_code', { p_household_id: householdId });
    if (!rpcResult.error && rpcResult.data) {
      return Response.json({ success: true, invite_code: rpcResult.data });
    }

    const existingCode = household.invite_code;
    if (existingCode) {
      return Response.json({ success: true, invite_code: existingCode, message: 'Household already has an invite code' });
    }

    let code = '';
    for (let i = 0; i < 10; i += 1) {
      code = generateCode();
      const { data: existing } = await service.from('households').select('id').eq('invite_code', code).maybeSingle();
      if (!existing) break;
    }

    const { error: updateError } = await service.from('households').update({ invite_code: code }).eq('id', householdId);
    if (updateError) {
      throw updateError;
    }

    return Response.json({ success: true, invite_code: code });
  } catch (error) {
    console.error('[generateHouseholdCode] Error:', error);
    return Response.json({ error: error.message || 'Failed to generate code' }, { status: 500 });
  }
});
