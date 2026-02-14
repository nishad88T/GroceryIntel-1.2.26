Deno.serve(async (_req) => {
  return Response.json({
    error: 'textractOCR is not implemented in Supabase-native mode yet',
    code: 'not_implemented'
  }, { status: 501 });
});
