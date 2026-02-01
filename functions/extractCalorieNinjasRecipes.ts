import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
        }

        const { searchQueries, maxRecipesPerQuery = 10 } = await req.json().catch(() => ({}));
        
        if (!searchQueries || !Array.isArray(searchQueries)) {
            return Response.json({ 
                error: 'Please provide searchQueries array (e.g., ["chicken", "pasta", "salad"])' 
            }, { status: 400 });
        }

        const apiKey = Deno.env.get('CALORIE_NINJAS_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'CALORIE_NINJAS_API_KEY not configured' }, { status: 500 });
        }

        console.log(`Starting recipe extraction for ${searchQueries.length} queries`);
        
        const results = {
            totalQueries: searchQueries.length,
            successfulQueries: 0,
            totalRecipesExtracted: 0,
            failedQueries: [],
            recipes: []
        };

        for (const query of searchQueries) {
            try {
                console.log(`Fetching recipes for query: "${query}"`);
                
                const apiUrl = `https://api.calorieninjas.com/v1/recipe?query=${encodeURIComponent(query)}`;
                const response = await fetch(apiUrl, {
                    headers: { 'X-Api-Key': apiKey }
                });

                if (!response.ok) {
                    console.error(`API error for query "${query}": ${response.status}`);
                    results.failedQueries.push({ query, reason: `HTTP ${response.status}` });
                    continue;
                }

                const data = await response.json();
                
                if (!data || !Array.isArray(data)) {
                    console.warn(`No recipes returned for query "${query}"`);
                    results.failedQueries.push({ query, reason: 'No results' });
                    continue;
                }

                const recipesToProcess = data.slice(0, maxRecipesPerQuery);
                
                for (const recipeData of recipesToProcess) {
                    try {
                        // Check if recipe already exists by external_id or title
                        const existing = await base44.asServiceRole.entities.Recipe.filter({
                            title: recipeData.title
                        });

                        if (existing && existing.length > 0) {
                            console.log(`Recipe "${recipeData.title}" already exists, skipping`);
                            continue;
                        }

                        // Parse ingredients from the recipe
                        const ingredients = [];
                        if (recipeData.ingredients) {
                            // Calorie Ninjas returns ingredients as a string, parse it
                            const ingredientLines = recipeData.ingredients.split('|').map(line => line.trim());
                            for (const line of ingredientLines) {
                                if (line) {
                                    ingredients.push({
                                        name: line,
                                        quantity: '' // Will be extracted during canonicalization
                                    });
                                }
                            }
                        }

                        const recipe = await base44.asServiceRole.entities.Recipe.create({
                            title: recipeData.title || 'Untitled Recipe',
                            description: recipeData.instructions || recipeData.description || '',
                            ingredients: ingredients,
                            servings: recipeData.servings || 4,
                            prep_time_minutes: recipeData.prep_time_minutes || null,
                            cook_time_minutes: recipeData.cook_time_minutes || null,
                            tags: recipeData.tags || [],
                            image_url: recipeData.thumbnail_url || null,
                            source_url: recipeData.source_url || null,
                            external_id: recipeData.id || null,
                            is_curated: false,
                            canonicalized: false
                        });

                        results.recipes.push(recipe.id);
                        results.totalRecipesExtracted++;
                        
                        console.log(`Successfully saved recipe: "${recipeData.title}"`);
                        
                    } catch (recipeError) {
                        console.error(`Error saving recipe:`, recipeError);
                    }
                }

                results.successfulQueries++;
                
                // Rate limiting: pause between queries to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (queryError) {
                console.error(`Error processing query "${query}":`, queryError);
                results.failedQueries.push({ query, reason: queryError.message });
            }
        }

        console.log(`Recipe extraction complete: ${results.totalRecipesExtracted} recipes from ${results.successfulQueries}/${results.totalQueries} queries`);

        return Response.json({
            success: true,
            message: `Extracted ${results.totalRecipesExtracted} recipes from ${results.successfulQueries} successful queries`,
            results
        });

    } catch (error) {
        console.error('Error in extractCalorieNinjasRecipes:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});