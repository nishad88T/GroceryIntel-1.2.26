Deno.serve(async (_req) => Response.json({ success: false, message: 'Budget rollover is not configured yet.', old_budget: null, new_budget: null }));
