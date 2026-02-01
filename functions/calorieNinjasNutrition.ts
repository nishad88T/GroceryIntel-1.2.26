import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { canonical_name, household_id } = await req.json();
        
        if (!canonical_name || !household_id) {
            return Response.json({ 
                error: 'Missing required fields: canonical_name and household_id' 
            }, { status: 400 });
        }

        // Check if we already have this nutrition data
        const existing = await base44.asServiceRole.entities.NutritionFact.filter({
            canonical_name,
            household_id
        });

        if (existing && existing.length > 0) {
            return Response.json({ 
                success: true, 
                data: existing[0],
                cached: true 
            });
        }

        // Check if this lookup has failed before
        const failedLookups = await base44.asServiceRole.entities.FailedNutritionLookup.filter({
            canonical_name,
            household_id
        });

        if (failedLookups && failedLookups.length > 0) {
            const lastAttempt = failedLookups[0];
            const daysSinceLastAttempt = (Date.now() - new Date(lastAttempt.last_attempt_date).getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSinceLastAttempt < 7) {
                return Response.json({ 
                    success: false, 
                    message: 'This item failed nutrition lookup recently. Will retry after 7 days.',
                    failed_previously: true 
                }, { status: 404 });
            }
        }

        const apiKey = Deno.env.get('CALORIE_NINJAS_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'API key not configured' }, { status: 500 });
        }

        console.log(`Fetching nutrition data for: ${canonical_name}`);
        const apiUrl = `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(canonical_name)}`;
        
        const response = await fetch(apiUrl, {
            headers: { 'X-Api-Key': apiKey }
        });

        console.log(`API Response Status: ${response.status}`);

        if (!response.ok) {
            await base44.asServiceRole.entities.FailedNutritionLookup.create({
                canonical_name,
                household_id,
                last_attempt_date: new Date().toISOString(),
                attempt_count: (failedLookups[0]?.attempt_count || 0) + 1,
                source: 'calorie_ninjas',
                user_email: user.email
            });

            return Response.json({ 
                success: false, 
                message: `Nutrition data not found for this item. API returned status: ${response.status}`,
                api_error: true,
                status_code: response.status
            }, { status: 404 });
        }

        const data = await response.json();
        console.log(`API Response Data:`, data);
        
        if (!data.items || data.items.length === 0) {
            await base44.asServiceRole.entities.FailedNutritionLookup.create({
                canonical_name,
                household_id,
                last_attempt_date: new Date().toISOString(),
                attempt_count: (failedLookups[0]?.attempt_count || 0) + 1,
                source: 'calorie_ninjas',
                user_email: user.email
            });

            return Response.json({ 
                success: false, 
                message: 'No nutrition data available for this item',
                no_results: true 
            }, { status: 404 });
        }

        const nutritionData = data.items[0];
        
        const nutritionFact = await base44.asServiceRole.entities.NutritionFact.create({
            canonical_name,
            household_id,
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

        await base44.asServiceRole.entities.CreditLog.create({
            user_id: user.id,
            user_email: user.email,
            household_id,
            event_type: 'nutrition_lookup_api',
            credits_consumed: 1,
            reference_id: nutritionFact.id,
            timestamp: new Date().toISOString()
        });

        console.log(`Successfully saved nutrition data for: ${canonical_name}`);

        return Response.json({ 
            success: true, 
            data: nutritionFact,
            cached: false 
        });
        
    } catch (error) {
        console.error('Error in calorieNinjasNutrition:', error);
        return Response.json({ 
            error: error.message
        }, { status: 500 });
    }
});