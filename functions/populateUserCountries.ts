Deno.serve(async (_req) => {
  return Response.json({
    error: 'populateUserCountries is not implemented in Supabase-native mode yet',
    code: 'not_implemented'
  }, { status: 501 });
});
