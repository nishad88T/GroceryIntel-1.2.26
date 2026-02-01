import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
        }

        const { batchSize = 75 } = await req.json().catch(() => ({}));
        
        console.log('[DEBUG] Starting ingredient canonicalization process');

        // Step 1: Fetch ALL recipes first to inspect them
        console.log('[DEBUG] Fetching all recipes without filter...');
        const allRecipes = await base44.asServiceRole.entities.Recipe.list('', 5000);
        
        console.log(`[DEBUG] Total recipes in database: ${allRecipes?.length || 0}`);
        
        if (!allRecipes || allRecipes.length === 0) {
            return Response.json({ 
                success: true,
                message: 'No recipes found in the database at all' 
            });
        }

        // Debug: Log the canonicalized status of each recipe
        allRecipes.forEach((recipe, index) => {
            console.log(`[DEBUG] Recipe ${index + 1}: "${recipe.title}" - canonicalized: ${recipe.canonicalized} (type: ${typeof recipe.canonicalized})`);
        });

        // Step 2: Manually filter for recipes that need canonicalization
        const recipes = allRecipes.filter(r => !r.canonicalized);
        
        console.log(`[DEBUG] Recipes needing canonicalization: ${recipes.length}`);
        
        if (recipes.length === 0) {
            return Response.json({ 
                success: true,
                message: `All ${allRecipes.length} recipes are already canonicalized`,
                debug_info: {
                    total_recipes: allRecipes.length,
                    recipes_status: allRecipes.map(r => ({
                        title: r.title,
                        canonicalized: r.canonicalized,
                        has_ingredients: !!(r.ingredients && r.ingredients.length > 0)
                    }))
                }
            });
        }

        console.log(`[DEBUG] Found ${recipes.length} recipes to process`);

        // Step 3: Extract unique ingredients
        const uniqueIngredients = new Set();
        for (const recipe of recipes) {
            console.log(`[DEBUG] Processing recipe: "${recipe.title}", ingredients count: ${recipe.ingredients?.length || 0}`);
            
            if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                for (const ingredient of recipe.ingredients) {
                    if (ingredient.name) {
                        const cleanedName = ingredient.name.toLowerCase().trim();
                        uniqueIngredients.add(cleanedName);
                        console.log(`[DEBUG] Added ingredient: "${cleanedName}"`);
                    }
                }
            }
        }

        const ingredientArray = Array.from(uniqueIngredients);
        console.log(`[DEBUG] Found ${ingredientArray.length} unique ingredient strings to canonicalize`);

        if (ingredientArray.length === 0) {
            console.warn('[DEBUG] No ingredients found in recipes to canonicalize');
            
            // Still mark recipes as canonicalized even if they have no ingredients
            for (const recipe of recipes) {
                await base44.asServiceRole.entities.Recipe.update(recipe.id, {
                    canonicalized: true
                });
            }
            
            return Response.json({ 
                success: true,
                message: `Marked ${recipes.length} recipes as canonicalized (no ingredients found)`,
                recipes_processed: recipes.length
            });
        }

        // Step 4: Check which ingredients are already in IngredientMap
        const existingMaps = await base44.asServiceRole.entities.IngredientMap.list('', 10000);
        const existingRawNames = new Set(existingMaps.map(m => m.raw_ingredient_string.toLowerCase()));
        
        const ingredientsToProcess = ingredientArray.filter(ing => !existingRawNames.has(ing));
        console.log(`[DEBUG] ${ingredientsToProcess.length} ingredients need canonicalization (${ingredientArray.length - ingredientsToProcess.length} already mapped)`);

        if (ingredientsToProcess.length === 0) {
            // All ingredients already mapped, just mark recipes as canonicalized
            for (const recipe of recipes) {
                await base44.asServiceRole.entities.Recipe.update(recipe.id, {
                    canonicalized: true
                });
            }
            
            return Response.json({ 
                success: true,
                message: `All ingredients already canonicalized. Marked ${recipes.length} recipes as complete.`,
                stats: {
                    totalUnique: ingredientArray.length,
                    alreadyMapped: ingredientArray.length
                }
            });
        }

        // Step 5: Process in batches using LLM
        const results = {
            totalIngredients: ingredientsToProcess.length,
            batchesProcessed: 0,
            ingredientsMapped: 0,
            creditsUsed: 0,
            errors: []
        };

        for (let i = 0; i < ingredientsToProcess.length; i += batchSize) {
            const batch = ingredientsToProcess.slice(i, i + batchSize);
            console.log(`[DEBUG] Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} ingredients)`);

            try {
                const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `You are a grocery ingredient expert. Given the following list of raw ingredient names (as they appear in recipes), please:
1. Provide a canonicalized name (standardized, singular form)
2. Assign the most appropriate category

Raw ingredients:
${batch.map((ing, idx) => `${idx + 1}. ${ing}`).join('\n')}

Respond with a JSON array of objects, one for each ingredient in order.`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            ingredients: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        raw_name: { type: "string" },
                                        canonical_name: { type: "string" },
                                        category: {
                                            type: "string",
                                            enum: [
                                                "meat_fish",
                                                "vegetables_fruits",
                                                "dairy_eggs",
                                                "bakery",
                                                "snacks_sweets",
                                                "beverages",
                                                "household_cleaning",
                                                "personal_care",
                                                "frozen_foods",
                                                "pantry_staples",
                                                "other"
                                            ]
                                        }
                                    },
                                    required: ["raw_name", "canonical_name", "category"]
                                }
                            }
                        },
                        required: ["ingredients"]
                    }
                });

                // Store the mappings
                if (llmResponse.ingredients && Array.isArray(llmResponse.ingredients)) {
                    for (const mapping of llmResponse.ingredients) {
                        try {
                            await base44.asServiceRole.entities.IngredientMap.create({
                                raw_ingredient_string: mapping.raw_name.toLowerCase().trim(),
                                canonical_name: mapping.canonical_name.toLowerCase().trim(),
                                category: mapping.category
                            });
                            results.ingredientsMapped++;
                        } catch (createError) {
                            console.error(`[DEBUG] Error creating IngredientMap for "${mapping.raw_name}":`, createError.message);
                            results.errors.push({ ingredient: mapping.raw_name, error: createError.message });
                        }
                    }
                }

                results.batchesProcessed++;
                results.creditsUsed++;

                console.log(`[DEBUG] Batch complete. ${results.ingredientsMapped}/${ingredientsToProcess.length} ingredients mapped so far`);

                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (batchError) {
                console.error(`[DEBUG] Error processing batch ${Math.floor(i / batchSize) + 1}:`, batchError);
                results.errors.push({ batch: Math.floor(i / batchSize) + 1, error: batchError.message });
            }
        }

        // Step 6: Mark recipes as canonicalized
        console.log(`[DEBUG] Marking ${recipes.length} recipes as canonicalized`);
        for (const recipe of recipes) {
            try {
                await base44.asServiceRole.entities.Recipe.update(recipe.id, { canonicalized: true });
            } catch (updateError) {
                console.error(`[DEBUG] Error updating recipe ${recipe.id}:`, updateError.message);
            }
        }

        console.log(`[DEBUG] Canonicalization complete: ${results.ingredientsMapped} ingredients mapped using ${results.creditsUsed} credits`);

        return Response.json({
            success: true,
            message: `Canonicalized ${results.ingredientsMapped} ingredients in ${results.batchesProcessed} batches`,
            results
        });

    } catch (error) {
        console.error('[DEBUG] Error in canonicalizeRecipeIngredients:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});