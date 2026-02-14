import { requireUser, createServiceClient } from './_helpers/supabase.ts';

Deno.serve(async (req) => {
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;
  const service = createServiceClient();
  await service.from('profiles').delete().eq('id', auth.user.id);
  return Response.json({ success: true, message: 'Account data deletion requested.' });
});
