import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ONS API endpoints for different food categories (MM23 = CPI Index)
const ONS_ENDPOINTS = {
    'overall': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/mm23/data', // CPI All Items
    'hot_beverages': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7bz/mm23/data', // Coffee, tea, cocoa
    'meat_poultry': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7c2/mm23/data', // Meat
    'fish_seafood': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7c3/mm23/data', // Fish
    'dairy_eggs': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7c4/mm23/data', // Milk, cheese, eggs
    'fruit': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7c6/mm23/data', // Fruit
    'vegetables': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7c7/mm23/data', // Vegetables
    'bakery_grains': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7d5/mm23/data', // Bread and cereals
    'soft_drinks': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7cb/mm23/data', // Mineral waters, soft drinks
    'oils_fats': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7c5/mm23/data', // Oils and fats
    'sweet_treats': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7c9/mm23/data', // Sugar, jam, honey, chocolate and confectionery
    'alcohol': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7cd/mm23/data', // Alcoholic beverages
    'pantry_staples': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7d8/mm23/data', // Food products n.e.c. (Sauces, salt, spices, baby food)
    'ready_meals': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7d8/mm23/data', // Mapping ready meals to Food products n.e.c.
    'household_cleaning': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7e4/mm23/data', // Goods and services for routine household maintenance
    'toiletries': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7nn/mm23/data', // Personal care (closest proxy)
    'health_beauty': 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7nn/mm23/data' // Personal care
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        // Check for a scheduler secret key to allow automatic execution without user session
        const schedulerSecret = Deno.env.get("SCHEDULER_SECRET");
        const headerSecret = req.headers.get("x-scheduler-secret");
        const isScheduledRun = schedulerSecret && headerSecret === schedulerSecret;

        // Require admin authentication or valid scheduler secret
        if (!isScheduledRun) {
            if (!user || user.role !== 'admin') {
                return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
            }
        }

        const results = {
            success: true,
            categories_processed: 0,
            records_created: 0,
            errors: []
        };

        // Fetch and process each category with delay to avoid rate limits
        const categoryEntries = Object.entries(ONS_ENDPOINTS);
        for (let i = 0; i < categoryEntries.length; i++) {
            const [categorySlug, url] = categoryEntries[i];
            
            // Add 6 second delay between requests (except for first request) to respect ONS API limits
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 6000));
            }
            
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // ONS returns data in format: { months: [...], years: [...] }
                // We need to parse and store the last 24 months of index values
                if (data.months && data.months.length > 0) {
                    const recentMonths = data.months.slice(-24); // Last 24 months
                    const recordsToCreate = [];

                    // Fetch existing records for this category to avoid duplicates
                    const existingRecords = await base44.asServiceRole.entities.InflationData.filter({
                        country_code: 'GB',
                        statistical_source: 'ONS',
                        category_slug: categorySlug
                    });
                    const existingPeriodDates = new Set(existingRecords.map(r => r.period_date));
                    
                    for (const monthData of recentMonths) {
                        // Parse date from ONS format (e.g., "2024 OCT")
                        const dateStr = monthData.date || monthData.label;
                        const periodDate = parseONSDate(dateStr);
                        
                        if (!periodDate) continue;
                        
                        const indexValue = parseFloat(monthData.value);
                        if (isNaN(indexValue)) continue;
                        
                        // Only add to recordsToCreate if it doesn't already exist
                        if (!existingPeriodDates.has(periodDate)) {
                            recordsToCreate.push({
                                country_code: 'GB',
                                statistical_source: 'ONS',
                                category_slug: categorySlug,
                                period_date: periodDate,
                                index_value: indexValue
                            });
                        }
                    }

                    if (recordsToCreate.length > 0) {
                        await base44.asServiceRole.entities.InflationData.bulkCreate(recordsToCreate);
                        results.records_created += recordsToCreate.length;
                    }
                    results.categories_processed++;
                }
            } catch (categoryError) {
                console.error(`Error processing ${categorySlug}:`, categoryError);
                results.errors.push({
                    category: categorySlug,
                    error: categoryError.message
                });
            }
        }

        // Log credit consumption (only if triggered by a user to avoid spamming logs for system runs, or log as system)
        if (user) {
            try {
                await base44.asServiceRole.entities.CreditLog.create({
                    user_id: user.id,
                    user_email: user.email,
                    household_id: user.household_id,
                    event_type: 'ons_data_api',
                    credits_consumed: 1,
                    timestamp: new Date().toISOString()
                });
            } catch (e) {
                // Ignore credit log error
            }
        }

        return Response.json(results);

    } catch (error) {
        console.error('Error in fetchONSInflationData:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});

function parseONSDate(dateStr) {
    // ONS format: "2024 OCT" or "2024 SEP"
    const match = dateStr.match(/(\d{4})\s+([A-Z]{3})/);
    if (!match) return null;
    
    const [, year, monthAbbr] = match;
    const monthMap = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
        'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
        'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    
    const month = monthMap[monthAbbr];
    if (!month) return null;
    
    return `${year}-${month}-01`;
}