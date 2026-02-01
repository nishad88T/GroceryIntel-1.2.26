
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

        // Construct the dashboard URL correctly - prioritize APP_BASE_URL
        const appBaseUrl = Deno.env.get('APP_BASE_URL') || Deno.env.get('BASE44_APP_URL');
        
        if (!appBaseUrl) {
            console.error("ERROR: Neither APP_BASE_URL nor BASE44_APP_URL environment variables are set!");
        }
        
        const dashboardUrl = appBaseUrl ? `${appBaseUrl}/Dashboard` : 'https://app.grocerytrack.co.uk/Dashboard';
        
        console.log("APP_BASE_URL:", Deno.env.get('APP_BASE_URL'));
        console.log("BASE44_APP_URL:", Deno.env.get('BASE44_APP_URL'));
        console.log("Final dashboard URL:", dashboardUrl);

        // Construct a comprehensive test email showcasing the new HTML formatting
        const emailBodyHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>GroceryTrack™ Email Format Test</title>
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
                            <p style="color: #333333; font-size: 16px; margin-bottom: 25px;">This is a <strong>test email</strong> to demonstrate the new HTML formatting for all GroceryTrack™ emails.</p>
                            
                            <div style="background: linear-gradient(to right, #f0fdf4, #ecfdf5); padding: 20px; border-left: 4px solid #10b981; border-radius: 8px; margin: 25px 0;">
                                <h2 style="color: #047857; font-size: 20px; margin: 0 0 15px 0;">✨ New Email Features:</h2>
                                <ul style="color: #333333; font-size: 15px; padding-left: 20px; margin: 0;">
                                    <li style="margin-bottom: 10px;">Professional HTML formatting with inline CSS</li>
                                    <li style="margin-bottom: 10px;">Your actual app logo displayed consistently</li>
                                    <li style="margin-bottom: 10px;">Brand-consistent colors and styling</li>
                                    <li style="margin-bottom: 10px;">Mobile-responsive design</li>
                                    <li style="margin-bottom: 10px;">Clear call-to-action buttons</li>
                                    <li style="margin-bottom: 0;">Organized content sections</li>
                                </ul>
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(to right, #10b981, #0d9488); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                                    Go to Dashboard →
                                </a>
                            </div>

                            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 25px 0;">
                                <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 10px 0;">📧 Email Types Updated:</h3>
                                <ul style="color: #666; font-size: 14px; margin: 0; padding-left: 20px;">
                                    <li>Welcome Email (triggered on signup)</li>
                                    <li>Household Invitation Email</li>
                                    <li>Account Deletion Confirmation</li>
                                    <li>Test Email (this one!)</li>
                                </ul>
                            </div>

                            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                <p style="color: #92400e; font-size: 14px; margin: 0;"><strong>💡 Technical Details:</strong></p>
                                <p style="color: #78350f; font-size: 13px; margin: 5px 0 0 0;">
                                    • APP_BASE_URL: <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">${Deno.env.get('APP_BASE_URL') || 'Not set'}</code><br>
                                    • BASE44_APP_URL: <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">${Deno.env.get('BASE44_APP_URL') || 'Not set'}</code><br>
                                    • Dashboard Link: <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">${dashboardUrl}</code><br>
                                    • All emails now use your actual logo from the dashboard<br>
                                    • Links now use the explicitly configured APP_BASE_URL for reliability
                                </p>
                            </div>
                            
                            <p style="color: #333333; font-size: 16px; margin-top: 30px; margin-bottom: 5px;">This test email was sent at: <strong>${new Date().toLocaleString()}</strong></p>
                            <p style="color: #047857; font-size: 16px; font-weight: 600; margin: 0;">The GroceryTrack Team</p>
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

        // Send test email
        try {
            await base44.integrations.Core.SendEmail({
                to: user.email,
                from_name: "The GroceryTrack Team",
                subject: "GroceryTrack™ Email Format Test - Logo & Links Updated",
                body: emailBodyHtml
            });

            console.log(`Test email sent successfully to ${user.email}`);

            return new Response(JSON.stringify({ 
                message: "Test email sent successfully",
                sent_to: user.email,
                sent_at: new Date().toISOString(),
                dashboard_url: dashboardUrl,
                app_base_url: Deno.env.get('APP_BASE_URL'),
                base44_app_url: Deno.env.get('BASE44_APP_URL')
            }), { 
                status: 200, 
                headers: { "Content-Type": "application/json" } 
            });

        } catch (emailError) {
            console.error("Failed to send test email:", emailError);
            return new Response(JSON.stringify({ 
                error: "Failed to send test email",
                details: emailError.message 
            }), { 
                status: 500, 
                headers: { "Content-Type": "application/json" } 
            });
        }

    } catch (error) {
        console.error("Error in sendTestEmail function:", error);
        return new Response(JSON.stringify({ 
            error: error.message 
        }), { 
            status: 500, 
            headers: { "Content-Type": "application/json" } 
        });
    }
});
