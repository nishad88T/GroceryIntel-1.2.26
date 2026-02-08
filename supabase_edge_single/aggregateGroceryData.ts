import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Inline store name normalization (copied from frontend utils)
function normalizeStoreName(storeName) {
    if (!storeName) return 'Unknown';
    
    const normalized = storeName.trim().toLowerCase();
    
    const storeMap = {
        'tesco': 'Tesco',
        'sainsbury': 'Sainsbury\'s',
        'sainsburys': 'Sainsbury\'s',
        'asda': 'Asda',
        'morrisons': 'Morrisons',
        'aldi': 'Aldi',
        'lidl': 'Lidl',
        'waitrose': 'Waitrose',
        'marks & spencer': 'M&S',
        'm&s': 'M&S',
        'marks and spencer': 'M&S',
        'co-op': 'Co-op',
        'coop': 'Co-op',
        'iceland': 'Iceland',
        'farmfoods': 'Farmfoods',
        'costco': 'Costco'
    };
    
    for (const [key, value] of Object.entries(storeMap)) {
        if (normalized.includes(key)) {
            return value;
        }
    }
    
    // If no match, capitalize first letter of each word
    return storeName.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function parseLocationCity(storeLocation) {
    if (!storeLocation) return 'Unknown';
    
    // Extract city from location string
    // e.g., "Wigston Leicester" -> "Leicester"
    // e.g., "Birmingham City Centre" -> "Birmingham"
    const parts = storeLocation.split(' ').filter(p => p.length > 0);
    
    // Return last part if it exists (usually the city)
    // For single-word locations, return that word
    return parts.length > 0 ? parts[parts.length - 1] : 'Unknown';
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // This function should only be callable by admins or system-level scheduled tasks
        const user = await base44.auth.me().catch(() => null);
        if (user && user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('Starting aggregated grocery data processing...');

        // Calculate date ranges
        const now = new Date();
        const threeDaysAgo = new Date(now);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const tenDaysAgo = new Date(now);
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        // Fetch all validated receipts from the last 3 days
        const recentReceipts = await base44.asServiceRole.entities.Receipt.filter(
            { validation_status: 'validated' },
            '-purchase_date',
            1000
        );

        // Filter receipts from the last 3 days in JavaScript
        const last3DaysReceipts = recentReceipts.filter(r => {
            if (!r.purchase_date) return false;
            const purchaseDate = new Date(r.purchase_date);
            return purchaseDate >= threeDaysAgo;
        });

        console.log(`Found ${last3DaysReceipts.length} receipts from the last 3 days`);

        // Aggregate item data
        const aggregationMap = {};

        last3DaysReceipts.forEach(receipt => {
            const storeName = normalizeStoreName(receipt.supermarket);
            const locationCity = parseLocationCity(receipt.store_location);

            (receipt.items || []).forEach(item => {
                const canonicalName = item.canonical_name || item.name;
                if (!canonicalName || !item.price_per_unit || item.price_per_unit <= 0) return;

                const key = `${storeName}|${locationCity}|${canonicalName}`;

                if (!aggregationMap[key]) {
                    aggregationMap[key] = {
                        store_name: storeName,
                        location_city: locationCity,
                        item_canonical_name: canonicalName,
                        prices: [],
                        category: item.category || 'other'
                    };
                }

                aggregationMap[key].prices.push(item.price_per_unit);
            });
        });

        // Calculate averages and prepare records for upsert
        const recordsToUpsert = [];
        for (const [key, data] of Object.entries(aggregationMap)) {
            if (data.prices.length === 0) continue;

            const latestPrice = data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length;

            recordsToUpsert.push({
                store_name: data.store_name,
                location_city: data.location_city,
                item_canonical_name: data.item_canonical_name,
                latest_price: latestPrice,
                price_observations: data.prices.length,
                last_updated_date: now.toISOString().split('T')[0],
                category: data.category
            });
        }

        console.log(`Prepared ${recordsToUpsert.length} aggregated records for upsert`);

        // Upsert aggregated data
        let upsertedCount = 0;
        for (const record of recordsToUpsert) {
            try {
                // Check if record exists
                const existing = await base44.asServiceRole.entities.AggregatedGroceryData.filter({
                    store_name: record.store_name,
                    location_city: record.location_city,
                    item_canonical_name: record.item_canonical_name
                }, '', 1);

                if (existing && existing.length > 0) {
                    // Update existing record
                    await base44.asServiceRole.entities.AggregatedGroceryData.update(existing[0].id, record);
                } else {
                    // Create new record
                    await base44.asServiceRole.entities.AggregatedGroceryData.create(record);
                }
                upsertedCount++;
            } catch (error) {
                console.error(`Failed to upsert record for ${record.item_canonical_name}:`, error);
            }
        }

        console.log(`Upserted ${upsertedCount} aggregated records`);

        // Purge records older than 10 days
        const allAggregated = await base44.asServiceRole.entities.AggregatedGroceryData.list();
        let deletedCount = 0;

        for (const record of allAggregated) {
            if (!record.last_updated_date) continue;
            const recordDate = new Date(record.last_updated_date);
            if (recordDate < tenDaysAgo) {
                try {
                    await base44.asServiceRole.entities.AggregatedGroceryData.delete(record.id);
                    deletedCount++;
                } catch (error) {
                    console.error(`Failed to delete old record ${record.id}:`, error);
                }
            }
        }

        console.log(`Deleted ${deletedCount} records older than 10 days`);

        // Log credit consumption for this aggregation run
        try {
            await base44.asServiceRole.entities.CreditLog.create({
                user_id: 'system',
                user_email: 'system@grocerytrack.internal',
                household_id: 'system',
                event_type: 'aggregated_data_processing',
                credits_consumed: 1,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to log credit consumption:', error);
        }

        return Response.json({
            success: true,
            receiptsProcessed: last3DaysReceipts.length,
            recordsUpserted: upsertedCount,
            recordsDeleted: deletedCount
        });

    } catch (error) {
        console.error('Aggregation error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});