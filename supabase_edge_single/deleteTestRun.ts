import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        const { test_run_id } = await req.json();

        if (!test_run_id) {
            return Response.json({ error: 'test_run_id is required' }, { status: 400 });
        }

        // Fetch the test run
        const testRun = await base44.asServiceRole.entities.TestRun.get(test_run_id);
        if (!testRun) {
            return Response.json({ error: 'Test run not found' }, { status: 404 });
        }

        // Delete all associated receipts
        const receiptIds = testRun.receipt_ids || [];
        for (const receiptId of receiptIds) {
            try {
                await base44.asServiceRole.entities.Receipt.delete(receiptId);
            } catch (err) {
                console.warn(`Failed to delete receipt ${receiptId}:`, err);
            }
        }

        // Delete all associated OCR quality logs
        const logs = await base44.asServiceRole.entities.OCRQualityLog.filter({ test_run_id });
        for (const log of logs) {
            try {
                await base44.asServiceRole.entities.OCRQualityLog.delete(log.id);
            } catch (err) {
                console.warn(`Failed to delete log ${log.id}:`, err);
            }
        }

        // Delete the test run itself
        await base44.asServiceRole.entities.TestRun.delete(test_run_id);

        return Response.json({
            success: true,
            message: `Test run "${testRun.name}" and all associated data deleted`,
            receipts_deleted: receiptIds.length,
            logs_deleted: logs.length
        });

    } catch (error) {
        console.error("Error deleting test run:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});