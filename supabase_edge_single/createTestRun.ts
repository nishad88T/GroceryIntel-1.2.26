import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        const { name, description, parent_test_run_id } = await req.json();

        if (!name) {
            return Response.json({ error: 'Test run name is required' }, { status: 400 });
        }

        // Determine version number
        let version = "1.0";
        if (parent_test_run_id) {
            const parentRun = await base44.asServiceRole.entities.TestRun.get(parent_test_run_id);
            if (parentRun) {
                const parentVersion = parseFloat(parentRun.version || "1.0");
                const minorVersion = Math.floor((parentVersion % 1) * 10) + 1;
                version = `${Math.floor(parentVersion)}.${minorVersion}`;
            }
        }

        const testRun = await base44.asServiceRole.entities.TestRun.create({
            name,
            description: description || '',
            version,
            parent_test_run_id: parent_test_run_id || null,
            status: 'in_progress',
            receipt_ids: [],
            total_receipts: 0,
            total_items: 0,
            reviewed_receipts: 0,
            created_by_email: user.email
        });

        return Response.json({ 
            success: true, 
            test_run: testRun,
            message: `Test run "${name}" (v${version}) created successfully`
        });

    } catch (error) {
        console.error("Error creating test run:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});