
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Reusable email header with actual logo
function getEmailHeader() {
    return `
        <div style="background: linear-gradient(to right, #10b981, #0d9488); padding: 30px 20px; text-align: center;">
            <div style="display: inline-block; background: white; padding: 15px 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/11796df5d_Screenshot2025-10-17at100323.png" alt="GroceryTrack Logo" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
            </div>
        </div>
    `;
}

// Reusable email footer
function getEmailFooter() {
    return `
        <div style="background-color: #f4f4f4; padding: 25px 20px; text-align: center; font-size: 13px; color: #666; border-top: 3px solid #10b981;">
            <p style="margin: 5px 0; color: #888;">This is an automated message. Please do not reply directly to this email.</p>
            <p style="margin: 5px 0;">For support or questions, contact us at <a href="mailto:support@groceryintel.com" style="color: #0d9488; text-decoration: none; font-weight: bold;">support@groceryintel.com</a></p>
            <p style="margin: 15px 0 5px 0; color: #999; font-size: 12px;">&copy; 2025 GroceryIntel™. All rights reserved.</p>
        </div>
    `;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return new Response(JSON.stringify({ error: "User not authenticated" }), { 
                status: 401, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // Check if welcome email has already been sent
        if (user.welcome_email_sent) {
            return new Response(JSON.stringify({ 
                message: "Welcome email already sent",
                skipped: true 
            }), { 
                status: 200, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // Construct the dashboard URL correctly - prioritize APP_BASE_URL
        const appBaseUrl = Deno.env.get('APP_BASE_URL') || Deno.env.get('BASE44_APP_URL');
        
        if (!appBaseUrl) {
            console.error("ERROR: Neither APP_BASE_URL nor BASE44_APP_URL environment variables are set!");
        }
        
        const dashboardUrl = appBaseUrl ? `${appBaseUrl}/Dashboard` : 'https://app.grocerytrack.co.uk/Dashboard';
        
        console.log("APP_BASE_URL:", Deno.env.get('APP_BASE_URL'));
        console.log("BASE44_APP_URL:", Deno.env.get('BASE44_APP_URL'));
        console.log("Final dashboard URL:", dashboardUrl);

        // Construct the HTML email body
        const emailBodyHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Welcome to GroceryIntel™!</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; background-color: #f0fdf4; margin: 0; padding: 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
                    <tr>
                        <td style="padding: 0;">
                            ${getEmailHeader()}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 35px 30px;">
                            <p style="color: #333333; font-size: 17px; margin-bottom: 10px;">Hello <strong style="color: #047857;">${user.full_name || 'there'}</strong>,</p>
                            <p style="color: #333333; font-size: 16px; margin-bottom: 25px;">Welcome to <strong>GroceryIntel™</strong>! We're thrilled to have you on board and excited to help you take control of your grocery spending.</p>
                            
                            <div style="background: linear-gradient(to right, #f0fdf4, #ecfdf5); padding: 20px; border-left: 4px solid #10b981; border-radius: 8px; margin: 25px 0;">
                                <h2 style="color: #047857; font-size: 20px; margin: 0 0 15px 0;">🛒 Get Started in 3 Simple Steps:</h2>
                                <ol style="color: #333333; font-size: 15px; padding-left: 20px; margin: 0;">
                                    <li style="margin-bottom: 12px; line-height: 1.5;">
                                        <strong style="color: #047857;">Scan Your First Receipt</strong><br>
                                        <span style="color: #666; font-size: 14px;">Use your camera or upload an image. For long receipts, fold and take multiple photos.</span><br>
                                        <span style="color: #d97706; font-size: 13px; font-weight: 600;">⚠️ IMPORTANT: Hide any sensitive information (credit card numbers, full addresses) before scanning.</span>
                                    </li>
                                    <li style="margin-bottom: 12px; line-height: 1.5;">
                                        <strong style="color: #047857;">Review & Validate</strong><br>
                                        <span style="color: #666; font-size: 14px;">Check the extracted items and make any corrections needed.</span>
                                    </li>
                                    <li style="margin-bottom: 0; line-height: 1.5;">
                                        <strong style="color: #047857;">Track Your Insights</strong><br>
                                        <span style="color: #666; font-size: 14px;">View spending trends, set budgets, and discover where your money goes.</span>
                                    </li>
                                </ol>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(to right, #10b981, #0d9488); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                                    Go to Your Dashboard →
                                </a>
                            </div>

                            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 25px 0;">
                                <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 10px 0;">📱 Install the Mobile App</h3>
                                <p style="color: #333; font-size: 14px; margin: 0;">Add GroceryIntel to your home screen for easy access:</p>
                                <ul style="color: #666; font-size: 14px; margin: 10px 0 0 20px; padding: 0;">
                                    <li><strong>iPhone:</strong> Tap the share button, then "Add to Home Screen"</li>
                                    <li><strong>Android:</strong> Tap the menu (⋮), then "Add to Home Screen"</li>
                                </ul>
                            </div>

                            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                <p style="color: #92400e; font-size: 14px; margin: 0;"><strong>💡 Need Help?</strong> Check out our "How to Use" guide in the app, or reach out anytime at <a href="mailto:support@groceryintel.com" style="color: #0d9488; text-decoration: none; font-weight: bold;">support@groceryintel.com</a></p>
                            </div>
                            
                            <p style="color: #333333; font-size: 16px; margin-top: 30px; margin-bottom: 5px;">Happy tracking!</p>
                            <p style="color: #047857; font-size: 16px; font-weight: 600; margin: 0;">The GroceryIntel Team</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0;">
                            ${getEmailFooter()}
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        // Send welcome email
        try {
            await base44.integrations.Core.SendEmail({
                to: user.email,
                from_name: "The GroceryIntel Team",
                subject: "Welcome to GroceryIntel™ - Start Tracking Your Grocery Spending!",
                body: emailBodyHtml
            });

            console.log(`Welcome email sent successfully to ${user.email}`);

            // Mark welcome email as sent
            await base44.auth.updateMe({ welcome_email_sent: true });

            // Log credit consumption
            try {
                await base44.asServiceRole.entities.CreditLog.create({
                    user_id: user.id,
                    user_email: user.email,
                    household_id: user.household_id || null,
                    event_type: 'welcome_email',
                    credits_consumed: 1,
                    reference_id: user.id,
                    timestamp: new Date().toISOString(),
                });
                console.log("Credit consumption logged for welcome email");
            } catch (creditLogError) {
                console.error("Failed to log credit consumption (non-critical):", creditLogError);
            }

            return new Response(JSON.stringify({ 
                message: "Welcome email sent successfully",
                email_sent: true 
            }), { 
                status: 200, 
                headers: { "Content-Type": "application/json" } 
            });

        } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
            return new Response(JSON.stringify({ 
                error: "Failed to send welcome email",
                details: emailError.message 
            }), { 
                status: 500, 
                headers: { "Content-Type": "application/json" } 
            });
        }

    } catch (error) {
        console.error("Error in sendWelcomeEmail function:", error);
        return new Response(JSON.stringify({ 
            error: error.message 
        }), { 
            status: 500, 
            headers: { "Content-Type": "application/json" } 
        });
    }
});
