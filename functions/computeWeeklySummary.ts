Deno.serve(async (_req) => Response.json({ success: true, summary_generated: false, message: 'Weekly summary generation is currently disabled.' }));
