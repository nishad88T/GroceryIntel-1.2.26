
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

const USER_DATA_ENTITIES = [
    'Receipt',
    'Budget',
    'CorrectionLog',
    'OCRFeedback',
    'FailedScanLog',
    'NutritionFact',
    'FailedNutritionLookup',
    'CreditLog',
    'HouseholdInvitation'
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.email) {
            return new Response(JSON.stringify({ error: 'Unauthorized: User not found.' }), { status: 401, headers: { "Content-Type": "application/json" } });
        }
        
        console.log(`[Account Deletion] Initiating data wipe for user: ${user.email}`);
        
        // Construct HTML email body
        const emailBodyHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>GroceryTrack Account Deletion Confirmation</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; background-color: #fef2f2; margin: 0; padding: 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
                    <tr>
                        <td style="padding: 0;">
                            ${getEmailHeader()}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 35px 30px;">
                            <p style="color: #333333; font-size: 17px; margin-bottom: 10px;">Hello <strong style="color: #047857;">${user.full_name || 'there'}</strong>,</p>
                            <p style="color: #333333; font-size: 16px; margin-bottom: 25px;">This email confirms that your <strong>GroceryTrack™</strong> account has been successfully deleted.</p>
                            
                            <div style="background: linear-gradient(to right, #fee2e2, #fecaca); padding: 20px; border-left: 4px solid #dc2626; border-radius: 8px; margin: 25px 0;">
                                <h2 style="color: #991b1b; font-size: 18px; margin: 0 0 15px 0;">🗑️ Data Permanently Removed</h2>
                                <p style="color: #7f1d1d; font-size: 14px; margin: 0 0 10px 0;">All of your data has been permanently removed from our systems, including:</p>
                                <ul style="color: #7f1d1d; font-size: 14px; margin: 0; padding-left: 20px;">
                                    <li>All receipts and purchase history</li>
                                    <li>All budgets and financial tracking data</li>
                                    <li>All analytics and insights</li>
                                    <li>All household information</li>
                                </ul>
                            </div>
                            
                            <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 25px 0;">
                                <p style="color: #1e40af; font-size: 14px; margin: 0;"><strong>💙 We're sorry to see you go.</strong></p>
                                <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">If you deleted your account by mistake or change your mind, you're welcome to sign up again at any time with a fresh start.</p>
                            </div>

                            <p style="color: #333333; font-size: 15px; margin-top: 25px;">Thank you for using GroceryTrack™.</p>
                            <p style="color: #047857; font-size: 15px; font-weight: 600; margin: 5px 0;">The GroceryTrack Team</p>
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
        
        // Send account deletion confirmation email BEFORE deleting data
        try {
            await base44.integrations.Core.SendEmail({
                to: user.email,
                from_name: "GroceryTrack",
                subject: "GroceryTrack Account Deletion Confirmation",
                body: emailBodyHtml
            });
            
            console.log(`Account deletion confirmation email sent to ${user.email}`);

            // Log credit consumption for the email
            try {
                await base44.asServiceRole.entities.CreditLog.create({
                    user_id: user.id,
                    user_email: user.email,
                    household_id: user.household_id || null,
                    event_type: 'account_deletion_email',
                    credits_consumed: 1,
                    reference_id: user.id,
                    timestamp: new Date().toISOString(),
                });
                console.log("Credit consumption logged for account deletion email");
            } catch (creditLogError) {
                console.error("Failed to log credit consumption (non-critical):", creditLogError);
            }

        } catch (emailError) {
            console.error("Failed to send account deletion email (non-critical):", emailError);
        }

        // Proceed with data deletion
        const deletionPromises = USER_DATA_ENTITIES.map(async (entityName) => {
            try {
                const records = await base44.asServiceRole.entities[entityName].filter({ user_email: user.email });
                
                if (records.length > 0) {
                    console.log(`[Account Deletion] Found ${records.length} records in ${entityName} for user ${user.email}. Deleting...`);
                    const deleteRecordPromises = records.map(record => base44.asServiceRole.entities[entityName].delete(record.id));
                    await Promise.all(deleteRecordPromises);
                    return { entity: entityName, count: records.length, status: 'success' };
                } else {
                    return { entity: entityName, count: 0, status: 'success' };
                }
            } catch (entityError) {
                console.error(`[Account Deletion] Error deleting data from ${entityName} for user ${user.email}:`, entityError.message);
                return { entity: entityName, count: 0, status: 'failed', error: entityError.message };
            }
        });
        
        const results = await Promise.all(deletionPromises);
        
        console.log(`[Account Deletion] Data wipe process completed for user: ${user.email}`);

        try {
            await base44.asServiceRole.entities.User.update(user.id, {
                currency: 'GBP',
                tier: 'lite',
                monthly_scan_count: 0,
                last_scan_reset_date: null,
                hasTrialAdvancedAnalytics: false,
                hasTrialNutritionDiagnostics: false,
                hasTrialFeatureGuide: false,
                hasTrialDataModeler: false,
                welcome_email_sent: false,
            });
            console.log(`[Account Deletion] Reset custom user data for user: ${user.email}`);
        } catch (userUpdateError) {
             console.error(`[Account Deletion] Failed to reset custom user data for ${user.email}:`, userUpdateError.message);
        }

        return new Response(JSON.stringify({ 
            message: "Account data successfully deleted. You will be logged out.",
            results: results
        }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (error) {
        console.error('CRITICAL Error in deleteUserAccount function:', error);
        return new Response(JSON.stringify({ error: 'An internal server error occurred during account deletion.', details: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});
