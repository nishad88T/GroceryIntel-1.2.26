Deno.serve(async (_req) => {
  return Response.json({
    error: 'migrateUserSubscriptionsToHouseholds is not implemented in Supabase-native mode yet',
    code: 'not_implemented'
  }, { status: 501 });
});
