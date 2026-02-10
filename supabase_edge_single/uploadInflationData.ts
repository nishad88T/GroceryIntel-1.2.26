import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        const { inflation_records } = await req.json();
        
        if (!inflation_records || !Array.isArray(inflation_records)) {
            return Response.json({ 
                error: 'Invalid request. Expected array of inflation_records' 
            }, { status: 400 });
        }

        const results = [];
        for (const record of inflation_records) {
            // Validate required fields
            if (!record.country_code || !record.statistical_source || !record.category_slug || 
                !record.period_start || record.inflation_rate === undefined) {
                results.push({ 
                    action: 'skipped', 
                    reason: 'missing_required_fields',
                    record 
                });
                continue;
            }

            // Check if record already exists for this period
            const existing = await base44.asServiceRole.entities.InflationData.filter({
                country_code: record.country_code,
                category_slug: record.category_slug,
                period_start: record.period_start
            });

            if (existing.length > 0) {
                // Update existing record
                await base44.asServiceRole.entities.InflationData.update(existing[0].id, {
                    inflation_rate: record.inflation_rate,
                    index_value: record.index_value,
                    period_end: record.period_end
                });
                results.push({ 
                    action: 'updated', 
                    id: existing[0].id,
                    country: record.country_code,
                    category: record.category_slug,
                    period: record.period_start
                });
            } else {
                // Create new record
                const created = await base44.asServiceRole.entities.InflationData.create(record);
                results.push({ 
                    action: 'created', 
                    id: created.id,
                    country: record.country_code,
                    category: record.category_slug,
                    period: record.period_start
                });
            }
        }

        return Response.json({
            success: true,
            message: 'Inflation data uploaded successfully',
            total_records: inflation_records.length,
            results
        });

    } catch (error) {
        console.error('Error uploading inflation data:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});