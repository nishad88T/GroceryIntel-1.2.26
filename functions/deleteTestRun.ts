Deno.serve(async (_req) => Response.json({ success: false, message: 'OCR testing is disabled.' }, { status: 501 }));
