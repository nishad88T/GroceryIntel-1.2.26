import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        const { 
            test_run_id, 
            receipt_id, 
            feedback_items,
            receipt_quality,
            receipt_length_category,
            store_name
        } = await req.json();

        if (!test_run_id || !receipt_id || !feedback_items || !Array.isArray(feedback_items)) {
            return Response.json({ 
                error: 'test_run_id, receipt_id, and feedback_items array are required' 
            }, { status: 400 });
        }

        // Create all feedback entries
        const createdLogs = [];
        for (const item of feedback_items) {
            try {
                const log = await base44.asServiceRole.entities.OCRQualityLog.create({
                    test_run_id: test_run_id,
                    receipt_id: receipt_id,
                    item_index: item.item_index !== undefined ? item.item_index : null,
                    error_origin: item.error_origin || 'textract_raw',
                    error_type: item.error_type || 'other',
                    original_value: item.original_value || '',
                    corrected_value: item.corrected_value || '',
                    comment: item.comment || '',
                    is_critical_error: item.is_critical_error === true,
                    receipt_quality: receipt_quality || 'crisp',
                    receipt_length_category: receipt_length_category || 'medium',
                    store_name: store_name || 'Unknown',
                    reviewer_id: user.id,
                    reviewer_email: user.email
                });
                createdLogs.push(log);
            } catch (itemError) {
                console.error(`Error creating log for item ${item.item_index}:`, itemError);
                // Continue with other items
            }
        }

        // Update test run's reviewed_receipts count
        try {
            const testRun = await base44.asServiceRole.entities.TestRun.get(test_run_id);
            if (testRun) {
                const newReviewedCount = (testRun.reviewed_receipts || 0) + 1;
                const updateData = {
                    reviewed_receipts: newReviewedCount
                };

                // If all receipts have been reviewed, mark as completed
                if (testRun.total_receipts !== undefined && newReviewedCount >= testRun.total_receipts) {
                    updateData.status = 'completed';
                }

                await base44.asServiceRole.entities.TestRun.update(test_run_id, updateData);
            }
        } catch (updateError) {
            console.error("Error updating test run:", updateError);
            // Don't fail the whole request if this fails
        }

        return Response.json({ 
            success: true, 
            logs_created: createdLogs.length,
            message: `Feedback submitted for receipt ${receipt_id}`
        });

    } catch (error) {
        console.error("Error submitting OCR quality feedback:", error);
        return Response.json({ 
            error: error.message || 'Internal server error',
            details: error.toString()
        }, { status: 500 });
    }
});