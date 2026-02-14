Deno.serve(async (_req) => {
  return Response.json({
    error: 'enforceDataRetention is not implemented in Supabase-native mode yet',
    code: 'not_implemented'
  }, { status: 501 });
});
