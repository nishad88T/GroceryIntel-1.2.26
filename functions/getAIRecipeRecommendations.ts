Deno.serve(async (_req) => Response.json({ recommendations: [], reasoning: '', message: 'AI recommendations unavailable until configured.' }));
