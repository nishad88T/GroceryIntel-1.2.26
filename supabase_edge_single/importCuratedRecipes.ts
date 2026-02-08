import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
        }

        const { recipes } = await req.json();
        
        if (!recipes || !Array.isArray(recipes)) {
            return Response.json({ 
                error: 'Please provide a "recipes" array in the request body' 
            }, { status: 400 });
        }

        if (recipes.length === 0) {
            return Response.json({ 
                error: 'The recipes array is empty' 
            }, { status: 400 });
        }

        console.log(`Starting import of ${recipes.length} recipes`);
        
        const results = {
            totalRecipes: recipes.length,
            imported: 0,
            skipped: 0,
            errors: []
        };

        for (const recipe of recipes) {
            try {
                // Validate required fields
                if (!recipe.title || !recipe.description) {
                    console.warn(`Skipping recipe without title or description:`, recipe);
                    results.skipped++;
                    results.errors.push({ 
                        recipe: recipe.title || 'Untitled', 
                        reason: 'Missing required fields (title or description)' 
                    });
                    continue;
                }

                // Check if recipe already exists by title
                const existing = await base44.asServiceRole.entities.Recipe.filter({
                    title: recipe.title
                });

                if (existing && existing.length > 0) {
                    console.log(`Recipe "${recipe.title}" already exists, skipping`);
                    results.skipped++;
                    continue;
                }

                // Prepare recipe data with defaults for missing fields
                const recipeData = {
                    title: recipe.title,
                    description: recipe.description,
                    ingredients: recipe.ingredients || [],
                    servings: recipe.servings || 4,
                    prep_time_minutes: recipe.prep_time_minutes || null,
                    cook_time_minutes: recipe.cook_time_minutes || null,
                    tags: recipe.tags || [],
                    image_url: recipe.image_url || null,
                    source_url: recipe.source_url || null,
                    external_id: recipe.external_id || null,
                    is_curated: recipe.is_curated !== undefined ? recipe.is_curated : true,
                    canonicalized: recipe.canonicalized !== undefined ? recipe.canonicalized : false
                };

                await base44.asServiceRole.entities.Recipe.create(recipeData);
                results.imported++;
                
                console.log(`Successfully imported recipe: "${recipe.title}"`);
                
            } catch (recipeError) {
                console.error(`Error importing recipe "${recipe.title}":`, recipeError);
                results.errors.push({ 
                    recipe: recipe.title || 'Unknown', 
                    reason: recipeError.message 
                });
            }
        }

        console.log(`Import complete: ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors`);

        return Response.json({
            success: true,
            message: `Successfully imported ${results.imported} recipes (${results.skipped} skipped, ${results.errors.length} errors)`,
            results
        });

    } catch (error) {
        console.error('Error in importCuratedRecipes:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});