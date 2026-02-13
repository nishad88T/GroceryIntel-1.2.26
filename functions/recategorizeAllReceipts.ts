Deno.serve(async (_req) => Response.json({ success: false, error: 'Historical recategorization is disabled.' }, { status: 501 }));
