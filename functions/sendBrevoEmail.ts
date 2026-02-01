import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate the user (optional - depends on use case)
        // For system emails, you might use service role instead
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { to, subject, htmlContent, textContent, fromName, fromEmail } = await req.json();

        if (!to || !subject || (!htmlContent && !textContent)) {
            return Response.json({ 
                error: 'Missing required fields: to, subject, and either htmlContent or textContent are required' 
            }, { status: 400 });
        }

        // Prepare email payload for Brevo API
        const emailPayload = {
            sender: {
                name: fromName || "GroceryIntel",
                email: fromEmail || "noreply@groceryintel.com"
            },
            to: [
                {
                    email: to,
                    name: to.split('@')[0] // Use email prefix as name if not provided
                }
            ],
            subject: subject,
            htmlContent: htmlContent,
            textContent: textContent
        };

        // Send email via Brevo API
        const response = await fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Brevo API error:", errorData);
            return Response.json({ 
                error: 'Failed to send email via Brevo',
                details: errorData 
            }, { status: response.status });
        }

        const result = await response.json();
        console.log("Email sent successfully via Brevo:", result);

        return Response.json({ 
            success: true,
            messageId: result.messageId,
            message: 'Email sent successfully'
        }, { status: 200 });

    } catch (error) {
        console.error("Error sending email via Brevo:", error);
        return Response.json(
            { error: error.message },
            { status: 500 }
        );
    }
});