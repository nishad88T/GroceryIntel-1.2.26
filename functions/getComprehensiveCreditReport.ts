Deno.serve(async (_req) => Response.json({ monthly_data: [], summary: { total_credits: 0, total_textract_scans: 0, total_base_credits: 0 } }));
