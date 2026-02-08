import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { resolveHouseholdId } from './_helpers/household.ts';

// BLS Series IDs for food categories
const BLS_SERIES = {
    'overall': 'CUSR0000SAF11', // Food at home
    'hot_beverages': 'CUSR0000SAF116', // Coffee and tea
    'meat_poultry': 'CUSR0000SAF112', // Meats, poultry, fish, eggs
    'fish_seafood': 'CUSR0000SAF114', // Fish and seafood
    'dairy_eggs': 'CUSR0000SAF115', // Dairy and related products
    'fruit': 'CUSR0000SAF111', // Fresh fruits
    'vegetables': 'CUSR0000SAF113', // Fresh vegetables
    'bakery_grains': 'CUSR0000SAF111A', // Cereals and bakery products
    'soft_drinks': 'CUSR0000SAF117' // Nonalcoholic beverages
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
        }
        const householdId = await resolveHouseholdId(base44, user);

        const results = {
            success: true,
            categories_processed: 0,
            records_created: 0,
            errors: []
        };

        // Get current year and last year for data fetch
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 2; // Fetch last 2 years
        
        // Batch fetch all series
        const seriesIds = Object.values(BLS_SERIES);
        const batchSize = 10; // BLS allows up to 25 series per request
        
        for (let i = 0; i < seriesIds.length; i += batchSize) {
            const batch = seriesIds.slice(i, i + batchSize);
            
            try {
                const requestBody = {
                    seriesid: batch,
                    startyear: startYear.toString(),
                    endyear: currentYear.toString(),
                    registrationkey: Deno.env.get('BLS_API_KEY') || undefined
                };

                const response = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    throw new Error(`BLS API error: ${response.status}`);
                }

                const data = await response.json();
                
                if (data.status === 'REQUEST_SUCCEEDED' && data.Results?.series) {
                    for (const series of data.Results.series) {
                        const categorySlug = Object.keys(BLS_SERIES).find(
                            key => BLS_SERIES[key] === series.seriesID
                        );
                        
                        if (!categorySlug || !series.data) continue;
                        
                        // Process each data point
                        for (const dataPoint of series.data) {
                            const year = dataPoint.year;
                            const month = dataPoint.period.replace('M', '').padStart(2, '0');
                            const periodDate = `${year}-${month}-01`;
                            const indexValue = parseFloat(dataPoint.value);
                            
                            if (isNaN(indexValue)) continue;
                            
                            // Check if record exists
                            const existing = await base44.asServiceRole.entities.InflationData.filter({
                                country_code: 'US',
                                statistical_source: 'BLS',
                                category_slug: categorySlug,
                                period_date: periodDate
                            });
                            
                            if (existing.length === 0) {
                                await base44.asServiceRole.entities.InflationData.create({
                                    country_code: 'US',
                                    statistical_source: 'BLS',
                                    category_slug: categorySlug,
                                    period_date: periodDate,
                                    index_value: indexValue
                                });
                                results.records_created++;
                            }
                        }
                        results.categories_processed++;
                    }
                }
            } catch (batchError) {
                console.error('Error processing BLS batch:', batchError);
                results.errors.push({
                    batch: i / batchSize + 1,
                    error: batchError.message
                });
            }
        }

        // Log credit consumption
        await base44.asServiceRole.entities.CreditLog.create({
            user_id: user.id,
            user_email: user.email,
            household_id: householdId,
            event_type: 'ons_data_api',
            credits_consumed: 1,
            timestamp: new Date().toISOString()
        });

        return Response.json(results);

    } catch (error) {
        console.error('Error in fetchBLSInflationData:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});
