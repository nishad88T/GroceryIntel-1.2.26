import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const url = new URL(req.url);
        const country_code = url.searchParams.get('country_code');

        let mappings;
        if (country_code) {
            mappings = await base44.asServiceRole.entities.OfficialCategoryMapping.filter({ country_code });
        } else {
            mappings = await base44.asServiceRole.entities.OfficialCategoryMapping.list();
        }

        // Group by country for easier viewing
        const grouped = mappings.reduce((acc, mapping) => {
            if (!acc[mapping.country_code]) {
                acc[mapping.country_code] = [];
            }
            acc[mapping.country_code].push(mapping);
            return acc;
        }, {});

        return Response.json({
            success: true,
            mappings: grouped,
            total_count: mappings.length
        });

    } catch (error) {
        console.error('Error fetching category mappings:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});