import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { v4 as uuidv4 } from 'npm:uuid@9.0.1';
import { resolveHouseholdId } from './_helpers/household.ts';

// Reusable email header with actual logo
function getEmailHeader() {
    return `
        <div style="background: linear-gradient(to right, #10b981, #0d9488); padding: 30px 20px; text-align: center;">
            <div style="display: inline-block; background: white; padding: 15px 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/11796df5d_Screenshot2025-10-17at100323.png" alt="GroceryIntel Logo" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
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
        const { invitee_email, inviter_name } = await req.json();
        
        if (!invitee_email || !inviter_name) {
            return Response.json({ 
                error: "Missing required fields: invitee_email and inviter_name" 
            }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        const householdId = await resolveHouseholdId(base44, user);
        if (!user || !householdId) {
            return Response.json({ 
                error: "User not authenticated or not in a household" 
            }, { status: 401 });
        }
        
        const household = await base44.entities.Household.get(householdId);
        if (household.admin_id !== user.id) {
            return Response.json({ 
                error: "Only the household admin can send invitations." 
            }, { status: 403 });
        }

        const token = uuidv4();
        const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        
        // 1. Create invitation record first
        const newInvitation = await base44.entities.HouseholdInvitation.create({
            household_id: householdId,
            invitee_email,
            inviter_name: user.full_name,
            token,
            expires_at
        });

        console.log("Invitation record created successfully:", newInvitation.id);

        // 2. Generate invitation link - CRITICAL FIX: Use APP_BASE_URL correctly
        const appBaseUrl = Deno.env.get('APP_BASE_URL');
        
        if (!appBaseUrl) {
            console.error("CRITICAL: APP_BASE_URL environment variable is not set!");
            return Response.json({ 
                error: "Server configuration error: APP_BASE_URL not set" 
            }, { status: 500 });
        }
        
        // Ensure the URL points to the correct route (no leading slash on route name)
        const joinUrl = `${appBaseUrl}/join-household?token=${token}`;
        
        console.log("Generated invitation URL:", joinUrl);

        // 3. Construct HTML email body
        const emailBodyHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>You're Invited to Join ${user.full_name}'s Household</title>
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
                            <p style="color: #333333; font-size: 17px; margin-bottom: 10px;">Hello!</p>
                            <p style="color: #333333; font-size: 16px; margin-bottom: 25px;"><strong style="color: #047857;">${user.full_name}</strong> has invited you to join their household on <strong>GroceryIntel™</strong>!</p>
                            
                            <div style="background: linear-gradient(to right, #fef3c7, #fef08a); padding: 20px; border-left: 4px solid #f59e0b; border-radius: 8px; margin: 25px 0;">
                                <h2 style="color: #92400e; font-size: 18px; margin: 0 0 10px 0;">🏠 What is Household Sharing?</h2>
                                <p style="color: #78350f; font-size: 14px; margin: 0; line-height: 1.6;">
                                    By joining a household, you'll be able to collaborate on tracking grocery expenses together. All household members can scan receipts, view shared budgets, and access combined spending insights.
                                </p>
                            </div>
                            
                            <p style="color: #333333; font-size: 15px; margin: 20px 0;">Click the button below to accept the invitation and join the household:</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${joinUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(to right, #10b981, #0d9488); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                                    Accept Invitation & Join →
                                </a>
                            </div>

                            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 25px 0;">
                                <p style="color: #1e40af; font-size: 13px; margin: 0;"><strong>📅 This invitation expires in 7 days.</strong></p>
                                <p style="color: #666; font-size: 13px; margin: 8px 0 0 0;">If the button doesn't work, copy and paste this link into your browser:</p>
                                <p style="color: #0d9488; font-size: 12px; word-break: break-all; margin: 5px 0 0 0; font-family: monospace;">${joinUrl}</p>
                            </div>
                            
                            <p style="color: #333333; font-size: 15px; margin-top: 25px;">We're excited to have you join GroceryIntel™!</p>
                            <p style="color: #047857; font-size: 15px; font-weight: 600; margin: 5px 0;">The GroceryIntel Team</p>
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

        // 4. Attempt to send email
        let emailSent = false;
        let emailError = null;
        
        try {
            await base44.integrations.Core.SendEmail({
                to: invitee_email,
                from_name: `${user.full_name} via GroceryIntel`,
                subject: `You're invited to join ${user.full_name}'s household on GroceryIntel!`,
                body: emailBodyHtml
            });
            emailSent = true;
            console.log("Email sent successfully to:", invitee_email);
        } catch (sendEmailError) {
            emailError = sendEmailError.message || "Email sending failed";
            console.log("Email sending failed (user not on Base44 platform):", emailError);
        }

        // 5. Log the credit event (only if email was actually sent)
        if (emailSent) {
            try {
                await base44.asServiceRole.entities.CreditLog.create({
                    user_id: user.id,
                    user_email: user.email,
                    household_id: householdId,
                    event_type: 'email_invite',
                    credits_consumed: 1,
                    reference_id: newInvitation.id,
                    timestamp: new Date().toISOString(),
                });
                console.log("Credit consumption logged for email invite");
            } catch (creditLogError) {
                console.error("Failed to log credit consumption (non-critical):", creditLogError);
            }
        }

        // 6. Return success with email status info
        return Response.json({
            success: true,
            invitation_id: newInvitation.id,
            invitation_link: joinUrl,
            email_sent: emailSent,
            email_error: emailError,
            invitee_email: invitee_email
        }, { status: 200 });

    } catch (error) {
        console.error("Critical invitation error:", error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { 
            status: 500 
        });
    }
});
