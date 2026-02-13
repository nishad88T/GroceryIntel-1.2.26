Deno.serve(async (_req) => Response.json({ success: false, error: 'Meal plan generation is not configured yet.' }, { status: 501 }));
