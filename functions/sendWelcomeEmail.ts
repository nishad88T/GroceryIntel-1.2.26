Deno.serve(async (_req) => Response.json({ success: true, message: 'Welcome email disabled until sendEmail/Brevo is configured.' }));
