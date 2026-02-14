import { requireUser } from './_helpers/supabase.ts';

Deno.serve(async (req) => {
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;
  return Response.json({ success: false, error: 'Shared content handler is not configured yet.' }, { status: 501 });
});
