import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        const { original_test_run_id } = await req.json();

        if (!original_test_run_id) {
            return Response.json({ error: 'original_test_run_id is required' }, { status: 400 });
        }

        // Fetch the original test run
        const originalTestRun = await base44.asServiceRole.entities.TestRun.get(original_test_run_id);
        if (!originalTestRun) {
            return Response.json({ error: 'Original test run not found' }, { status: 404 });
        }

        // Fetch all receipts from the original test run to get their image URLs
        const originalReceipts = await Promise.all(
            (originalTestRun.receipt_ids || []).map(id => 
                base44.asServiceRole.entities.Receipt.get(id).catch(() => null)
            )
        );
        const validReceipts = originalReceipts.filter(r => r !== null);

        if (validReceipts.length === 0) {
            return Response.json({ error: 'No valid receipts found in original test run' }, { status: 400 });
        }

        // Calculate new version number
        const originalVersion = parseFloat(originalTestRun.version || "1.0");
        const newMinorVersion = Math.floor((originalVersion % 1) * 10) + 1;
        const newVersion = `${Math.floor(originalVersion)}.${newMinorVersion}`;

        // Create new test run
        const newTestRun = await base44.asServiceRole.entities.TestRun.create({
            name: `${originalTestRun.name} (Rerun v${newVersion})`,
            description: `Rerun of test run: ${originalTestRun.name}`,
            version: newVersion,
            parent_test_run_id: original_test_run_id,
            status: 'in_progress',
            receipt_ids: [],
            total_receipts: 0,
            total_items: 0,
            reviewed_receipts: 0,
            created_by_email: user.email
        });

        // Re-upload and process all receipts
        const newReceiptIds = [];
        for (const originalReceipt of validReceipts) {
            const imageUrls = originalReceipt.receipt_image_urls || [];
            if (imageUrls.length === 0) continue;

            // Create new receipt with is_test_data flag
            const newReceipt = await base44.asServiceRole.entities.Receipt.create({
                supermarket: "Test Receipt (Rerun)",
                store_location: "Test Location",
                purchase_date: new Date().toISOString().split('T')[0],
                total_amount: 0,
                receipt_image_urls: imageUrls,
                currency: user.currency || 'GBP',
                validation_status: 'processing_background',
                household_id: user.household_id,
                user_email: user.email,
                is_test_data: true,
                items: []
            });

            newReceiptIds.push(newReceipt.id);

            // Trigger background processing
            base44.asServiceRole.functions.invoke('processReceiptInBackground', {
                receiptId: newReceipt.id,
                imageUrls: imageUrls,
                storeName: "Test Receipt (Rerun)",
                totalAmount: 0,
                householdId: user.household_id,
                userEmail: user.email
            }).catch(err => console.log("Background processing started for rerun receipt"));
        }

        // Update new test run with receipt IDs
        await base44.asServiceRole.entities.TestRun.update(newTestRun.id, {
            receipt_ids: newReceiptIds,
            total_receipts: newReceiptIds.length
        });

        return Response.json({
            success: true,
            new_test_run: newTestRun,
            message: `Rerun test created with ${newReceiptIds.length} receipts`
        });

    } catch (error) {
        console.error("Error rerunning test:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});