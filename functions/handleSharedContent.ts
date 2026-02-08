import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { resolveHouseholdId } from './_helpers/household.ts';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type, url, file_urls, user_id, user_email, household_id } = await req.json();

        if (!type) {
            return Response.json({ error: 'Content type is required' }, { status: 400 });
        }

        const resolvedHouseholdId = await resolveHouseholdId(base44, user);
        const effectiveHouseholdId = household_id || resolvedHouseholdId;
        const effectiveUserEmail = user_email || user.email;

        if (!effectiveHouseholdId) {
            return Response.json({ error: 'No household associated with user' }, { status: 400 });
        }

        // Handle recipe URL
        if (type === 'recipe') {
            if (!url) {
                return Response.json({ error: 'URL is required for recipe sharing' }, { status: 400 });
            }

            // Use existing parseRecipe function logic
            try {
                const parseResponse = await base44.functions.invoke('parseRecipe', {
                    recipe_url: url
                });

                if (parseResponse.data?.success) {
                    return Response.json({
                        success: true,
                        type: 'recipe',
                        recipe: parseResponse.data.recipe,
                        message: 'Recipe saved successfully'
                    });
                } else {
                    return Response.json({
                        success: false,
                        error: parseResponse.data?.error || 'Failed to parse recipe'
                    }, { status: 400 });
                }
            } catch (parseError) {
                console.error('Recipe parsing error:', parseError);
                return Response.json({
                    success: false,
                    error: parseError.message || 'Failed to parse recipe'
                }, { status: 500 });
            }
        }

        // Handle receipt images
        if (type === 'receipt') {
            if (!file_urls || file_urls.length === 0) {
                return Response.json({ error: 'File URLs are required for receipt sharing' }, { status: 400 });
            }

            try {
                // Create a placeholder receipt record
                const today = new Date().toISOString().split('T')[0];
                const newReceipt = await base44.asServiceRole.entities.Receipt.create({
                    supermarket: 'Processing...',
                    purchase_date: today,
                    total_amount: 0,
                    receipt_image_urls: file_urls,
                    validation_status: 'processing_background',
                    household_id: effectiveHouseholdId,
                    user_email: effectiveUserEmail,
                    items: []
                });

                // Trigger background processing
                await base44.asServiceRole.functions.invoke('processReceiptInBackground', {
                    receiptId: newReceipt.id,
                    imageUrls: file_urls,
                    storeName: '',
                    totalAmount: 0,
                    householdId: effectiveHouseholdId,
                    userEmail: effectiveUserEmail
                });

                // Update user's scan count
                const currentScanCount = user.monthly_scan_count || 0;
                await base44.auth.updateMe({
                    monthly_scan_count: currentScanCount + 1
                });

                // Log to CreditLog
                await base44.asServiceRole.entities.CreditLog.create({
                    user_id: user.id,
                    user_email: effectiveUserEmail,
                    household_id: effectiveHouseholdId,
                    event_type: 'ocr_scan',
                    credits_consumed: 1,
                    reference_id: newReceipt.id,
                    timestamp: new Date().toISOString()
                });

                return Response.json({
                    success: true,
                    type: 'receipt',
                    receiptId: newReceipt.id,
                    message: 'Receipt uploaded and processing started'
                });
            } catch (receiptError) {
                console.error('Receipt processing error:', receiptError);
                return Response.json({
                    success: false,
                    error: receiptError.message || 'Failed to process receipt'
                }, { status: 500 });
            }
        }

        return Response.json({ error: 'Invalid content type' }, { status: 400 });

    } catch (error) {
        console.error('handleSharedContent error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
