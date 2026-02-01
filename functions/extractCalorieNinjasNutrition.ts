import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
        }

        const { maxItems = 1000 } = await req.json().catch(() => ({}));
        
        console.log('Starting nutrition data extraction');

        // Step 1: Get all unique canonical names from IngredientMap
        const ingredientMaps = await base44.asServiceRole.entities.IngredientMap.list('', 10000);
        
        if (!ingredientMaps || ingredientMaps.length === 0) {
            return Response.json({ 
                error: 'No ingredients found in IngredientMap. Please run canonicalizeRecipeIngredients first.' 
            }, { status: 400 });
        }

        const uniqueCanonicalNames = [...new Set(ingredientMaps.map(m => m.canonical_name))];
        console.log(`Found ${uniqueCanonicalNames.length} unique canonical ingredient names`);

        // Step 2: Check which ones already have nutrition data
        const existingNutrition = await base44.asServiceRole.entities.NutritionFact.list('', 10000);
        const existingCanonicalNames = new Set(existingNutrition.map(n => n.canonical_name.toLowerCase()));

        const itemsToFetch = uniqueCanonicalNames
            .filter(name => !existingCanonicalNames.has(name.toLowerCase()))
            .slice(0, maxItems);

        console.log(`${itemsToFetch.length} items need nutrition data (${uniqueCanonicalNames.length - itemsToFetch.length} already have data)`);

        if (itemsToFetch.length === 0) {
            return Response.json({ 
                success: true,
                message: 'All canonical ingredients already have nutrition data'
            });
        }

        const apiKey = Deno.env.get('CALORIE_NINJAS_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'CALORIE_NINJAS_API_KEY not configured' }, { status: 500 });
        }

        // Step 3: Fetch nutrition data for each canonical name
        const results = {
            totalItems: itemsToFetch.length,
            successfulFetches: 0,
            failedFetches: 0,
            apiCallsMade: 0,
            nutritionFactsCreated: 0,
            errors: []
        };

        for (const canonicalName of itemsToFetch) {
            try {
                console.log(`Fetching nutrition for: "${canonicalName}"`);
                
                const apiUrl = `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(canonicalName)}`;
                const response = await fetch(apiUrl, {
                    headers: { 'X-Api-Key': apiKey }
                });

                results.apiCallsMade++;

                if (!response.ok) {
                    console.error(`API error for "${canonicalName}": ${response.status}`);
                    results.failedFetches++;
                    results.errors.push({ item: canonicalName, reason: `HTTP ${response.status}` });
                    
                    // Log failed lookup
                    await base44.asServiceRole.entities.FailedNutritionLookup.create({
                        canonical_name: canonicalName,
                        household_id: 'bulk_import',
                        last_attempt_date: new Date().toISOString(),
                        attempt_count: 1,
                        source: 'calorie_ninjas',
                        user_email: user.email
                    });
                    
                    continue;
                }

                const data = await response.json();
                
                if (!data.items || data.items.length === 0) {
                    console.warn(`No nutrition data for "${canonicalName}"`);
                    results.failedFetches++;
                    results.errors.push({ item: canonicalName, reason: 'No results from API' });
                    
                    await base44.asServiceRole.entities.FailedNutritionLookup.create({
                        canonical_name: canonicalName,
                        household_id: 'bulk_import',
                        last_attempt_date: new Date().toISOString(),
                        attempt_count: 1,
                        source: 'calorie_ninjas',
                        user_email: user.email
                    });
                    
                    continue;
                }

                const nutritionData = data.items[0];
                
                await base44.asServiceRole.entities.NutritionFact.create({
                    canonical_name: canonicalName,
                    household_id: 'bulk_import',
                    source: 'calorie_ninjas',
                    calories: nutritionData.calories || 0,
                    protein_g: nutritionData.protein_g || 0,
                    carbohydrate_g: nutritionData.carbohydrates_total_g || 0,
                    fat_g: nutritionData.fat_total_g || 0,
                    fiber_g: nutritionData.fiber_g || 0,
                    sugar_g: nutritionData.sugar_g || 0,
                    sodium_mg: nutritionData.sodium_mg || 0,
                    serving_size_g: nutritionData.serving_size_g || 100,
                    user_email: user.email
                });

                results.successfulFetches++;
                results.nutritionFactsCreated++;
                
                console.log(`Successfully saved nutrition for: "${canonicalName}"`);

                // Rate limiting: pause between requests
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (itemError) {
                console.error(`Error processing "${canonicalName}":`, itemError);
                results.failedFetches++;
                results.errors.push({ item: canonicalName, error: itemError.message });
            }
        }

        console.log(`Nutrition extraction complete: ${results.successfulFetches}/${results.totalItems} successful, ${results.apiCallsMade} API calls made`);

        return Response.json({
            success: true,
            message: `Extracted nutrition data for ${results.successfulFetches} ingredients`,
            results
        });

    } catch (error) {
        console.error('Error in extractCalorieNinjasNutrition:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});