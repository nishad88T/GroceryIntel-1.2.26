import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
        }

        // Try reading with service role to bypass RLS
        const allInflationData = await base44.asServiceRole.entities.InflationData.list("-period_date", 1000);

        // Group by category for easier debugging
        const byCategory = {};
        allInflationData.forEach(record => {
            if (!byCategory[record.category_slug]) {
                byCategory[record.category_slug] = [];
            }
            byCategory[record.category_slug].push(record);
        });

        return Response.json({
            success: true,
            total_count: allInflationData.length,
            categories_found: Object.keys(byCategory).length,
            by_category: byCategory,
            sample_records: allInflationData.slice(0, 10)
        });

    } catch (error) {
        console.error('Error in listAllInflationData:', error);
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});