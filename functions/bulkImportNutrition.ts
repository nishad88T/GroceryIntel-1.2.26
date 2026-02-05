import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { resolveHouseholdId } from './_helpers/household.ts';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body
        const { ingredients } = await req.json();
        
        if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
            return Response.json({ 
                error: 'Invalid input. Please provide an array of ingredient names.',
                example: '{ "ingredients": ["shrimp", "olive oil", "garlic cloves"] }'
            }, { status: 400 });
        }

        console.log(`Starting bulk import for ${ingredients.length} ingredients requested by ${user.email}`);

        const results = {
            total: ingredients.length,
            successful: 0,
            skipped: 0,
            failed: 0,
            details: []
        };

        // Get household_id from user
        const householdId = await resolveHouseholdId(base44, user);
        if (!householdId) {
            return Response.json({ 
                error: 'User does not have a household_id. Cannot store nutrition facts.' 
            }, { status: 400 });
        }

        // Process each ingredient
        for (const ingredientName of ingredients) {
            if (!ingredientName || typeof ingredientName !== 'string' || ingredientName.trim() === '') {
                results.failed++;
                results.details.push({
                    ingredient: ingredientName,
                    status: 'failed',
                    reason: 'Invalid ingredient name'
                });
                continue;
            }

            const canonicalName = ingredientName.trim().toLowerCase();

            try {
                // Check if this ingredient already exists in NutritionFact
                const existing = await base44.entities.NutritionFact.filter({ 
                    canonical_name: canonicalName,
                    household_id: householdId
                });

                if (existing && existing.length > 0) {
                    console.log(`Skipping ${canonicalName} - already exists in database`);
                    results.skipped++;
                    results.details.push({
                        ingredient: canonicalName,
                        status: 'skipped',
                        reason: 'Already exists in database'
                    });
                    continue;
                }

                // Call the existing calorieNinjasNutrition function with BOTH parameters
                const nutritionResponse = await base44.functions.invoke('calorieNinjasNutrition', {
                    canonical_name: canonicalName,
                    household_id: householdId
                });

                if (nutritionResponse.data && nutritionResponse.data.success) {
                    console.log(`Successfully fetched and stored nutrition data for: ${canonicalName}`);
                    results.successful++;
                    results.details.push({
                        ingredient: canonicalName,
                        status: 'success',
                        data: nutritionResponse.data.data
                    });
                } else if (nutritionResponse.data && nutritionResponse.data.no_results) {
                    console.log(`No nutrition data found for: ${canonicalName}`);
                    results.failed++;
                    results.details.push({
                        ingredient: canonicalName,
                        status: 'failed',
                        reason: 'No nutrition data found in Calorie Ninjas API'
                    });
                } else {
                    console.log(`Failed to fetch nutrition data for: ${canonicalName}`);
                    results.failed++;
                    results.details.push({
                        ingredient: canonicalName,
                        status: 'failed',
                        reason: nutritionResponse.data?.message || 'API call failed or returned unexpected response'
                    });
                }

                // Add a small delay to avoid rate limiting (optional, adjust as needed)
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.error(`Error processing ${canonicalName}:`, error.message);
                results.failed++;
                results.details.push({
                    ingredient: canonicalName,
                    status: 'failed',
                    reason: error.message
                });
            }
        }

        console.log(`Bulk import completed. Success: ${results.successful}, Skipped: ${results.skipped}, Failed: ${results.failed}`);

        return Response.json({
            success: true,
            message: `Bulk import completed. ${results.successful} ingredients imported successfully.`,
            results: results
        });

    } catch (error) {
        console.error('Bulk import error:', error);
        return Response.json({ 
            error: 'Failed to process bulk import',
            details: error.message 
        }, { status: 500 });
    }
});
