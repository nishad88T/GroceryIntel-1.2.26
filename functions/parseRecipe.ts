import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { resolveHouseholdId } from './_helpers/household.ts';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        const householdId = await resolveHouseholdId(base44, user);

        if (!user || !householdId) {
            return Response.json({ error: 'Unauthorized or no household' }, { status: 401 });
        }

        const { recipe_url, recipe_text } = await req.json();

        if (!recipe_url && !recipe_text) {
            return Response.json({ error: 'Please provide either recipe_url or recipe_text' }, { status: 400 });
        }

        // Fetch household and check limits
        const household = await base44.asServiceRole.entities.Household.get(householdId);
        const parsedThisMonth = household.parsed_recipes_this_month || 0;

        // Check monthly limit (90 for both standard and plus)
        const monthlyLimit = 90;
        if (parsedThisMonth >= monthlyLimit) {
            return Response.json({
                error: 'Monthly parsing limit reached',
                limit: monthlyLimit,
                used: parsedThisMonth
            }, { status: 429 });
        }

        // Check storage limit (540 recipes per household)
        const existingRecipes = await base44.asServiceRole.entities.Recipe.filter({
            type: 'user_parsed',
            household_id: householdId
        });
        const storageLimit = 540;
        if (existingRecipes.length >= storageLimit) {
            return Response.json({
                error: 'Storage limit reached. Please delete some recipes before parsing new ones.',
                limit: storageLimit,
                current: existingRecipes.length
            }, { status: 429 });
        }

        // Fetch recipe content if URL provided
        let recipeContent = recipe_text || '';
        if (recipe_url) {
            try {
                const response = await fetch(recipe_url);
                if (!response.ok) {
                    throw new Error('Failed to fetch recipe from URL');
                }
                recipeContent = await response.text();
            } catch (error) {
                return Response.json({ 
                    error: 'Failed to fetch recipe from URL', 
                    details: error.message 
                }, { status: 400 });
            }
        }

        // Define the response schema
        const recipeSchema = {
            type: "object",
            properties: {
                title: { type: "string" },
                source_url: { type: "string" },
                image_url: { type: "string", description: "URL to the main recipe image from the page" },
                servings: { type: "number" },
                prep_time_minutes: { type: "number" },
                cook_time_minutes: { type: "number" },
                total_time_minutes: { type: "number" },
                ingredients: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            raw: { type: "string" },
                            quantity: { type: "string" },
                            unit: { type: "string" },
                            ingredient: { type: "string" },
                            comment: { type: "string" }
                        }
                    }
                },
                instructions: {
                    type: "array",
                    items: { type: "string" }
                },
                tags: {
                    type: "array",
                    items: { type: "string" }
                },
                allergens: {
                    type: "array",
                    items: {
                        type: "string",
                        enum: [
                            "celery", "cereals_gluten", "crustaceans", "eggs", "fish",
                            "lupin", "milk", "molluscs", "mustard", "peanuts",
                            "sesame_seeds", "soybeans", "sulphur_dioxide_sulphites", "tree_nuts"
                        ]
                    }
                }
            },
            required: ["title", "ingredients", "instructions"]
        };

        // Construct the LLM prompt
        const systemPrompt = `You are the GroceryIntel Recipe Importer. Your job is to take any recipe source submitted by the user — a URL or text — and transform it into a clean, structured recipe object for personal use.

SAFETY & COPYRIGHT RULES:
- Extract factual recipe content: title, ingredients, steps, servings, times
- ALSO extract the main recipe image URL (look for og:image, schema.org image, or the primary recipe photo)
- Do NOT include website prose, blog stories, or commentary
- Instructions should be rewritten in clear, concise language if they contain original website styling
- Each recipe is user-specific and private, stored for personal use only

IMAGE EXTRACTION:
- Look for the recipe's main image URL in meta tags (og:image), JSON-LD schema, or prominent img tags
- Return the full absolute URL (starting with https://)
- Prefer high-quality images over thumbnails
- If no image found, return empty string

INPUT HANDLING:
- Acceptable inputs: Recipe webpage URLs, copy-pasted text, OCRed text from image/PDF
- Handle messy inputs robustly: HTML tags, scripts, ads, extraneous text
- Handle missing times, servings, or unclear units
- Handle duplicate ingredients and ambiguous formatting

INGREDIENT PARSING RULES:
- Extract quantity, unit, ingredient, comment
- Normalize plurals → singular (e.g., tomatoes → tomato)
- Units: g, ml, l, tsp, tbsp, cup, whole, kg
- Parentheses or descriptors become comment
- Maintain raw field for traceability

Example: "2 large tomatoes, finely chopped" →
{
  "raw": "2 large tomatoes, finely chopped",
  "quantity": "2",
  "unit": "whole",
  "ingredient": "tomato",
  "comment": "large, finely chopped"
}

ALLERGEN DETECTION:
- Detect and list major UK allergens (FIR 2014): celery, cereals_gluten, crustaceans, eggs, fish, lupin, milk, molluscs, mustard, peanuts, sesame_seeds, soybeans, sulphur_dioxide_sulphites, tree_nuts
- Return as array of allergen codes

TAGGING:
- Add relevant tags: vegetarian, vegan, gluten-free, dairy-free, quick, budget-friendly, etc.

ROBUSTNESS:
- Always return a valid JSON object
- Handle messy or incomplete recipes gracefully
- If any field is missing, return an empty string, array, or 0
- Avoid any commentary, marketing language, or unnecessary explanations in output`;

        // Call LLM to parse the recipe
        const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `${systemPrompt}\n\nParse this recipe:\n\n${recipeContent}`,
            response_json_schema: recipeSchema
        });

        if (!llmResult || !llmResult.title) {
            return Response.json({ error: 'Failed to parse recipe. Please check the URL or text.' }, { status: 400 });
        }

        // Canonicalize ingredients and fetch cost/nutrition data
        const ingredientMatches = [];
        let totalEstimatedCost = 0;
        let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalFibre = 0;
        let nutritionConfidence = "low";

        if (llmResult.ingredients && llmResult.ingredients.length > 0) {
            for (const ing of llmResult.ingredients) {
                const ingredientName = ing.ingredient || ing.raw;
                
                // Try to find in IngredientMap for canonicalization
                const mappings = await base44.asServiceRole.entities.IngredientMap.filter({
                    raw_ingredient_string: ingredientName
                }, null, 1);
                
                const canonicalName = mappings.length > 0 ? mappings[0].canonical_name : ingredientName.toLowerCase();
                
                // Try to fetch cost data from AggregatedGroceryData
                const costData = await base44.asServiceRole.entities.AggregatedGroceryData.filter({
                    item_canonical_name: canonicalName
                }, null, 1);
                
                const estimatedPrice = costData.length > 0 ? costData[0].latest_price : null;
                
                // Try to fetch nutrition data
                const nutritionData = await base44.asServiceRole.entities.NutritionFact.filter({
                    canonical_name: canonicalName
                }, null, 1);
                
                ingredientMatches.push({
                    ingredient: ingredientName,
                    canonical_name: canonicalName,
                    matched_to: costData.length > 0 ? costData[0].item_canonical_name : null,
                    estimated_unit_price: estimatedPrice,
                    confidence: (costData.length > 0 && nutritionData.length > 0) ? 0.8 : 0.5
                });
                
                if (estimatedPrice) {
                    const qty = parseFloat(ing.quantity) || 1;
                    totalEstimatedCost += estimatedPrice * qty;
                }
                
                // Add nutrition data
                if (nutritionData.length > 0) {
                    const nutrient = nutritionData[0];
                    const qty = parseFloat(ing.quantity) || 1;
                    const servingMultiplier = qty / 100; // Assuming 100g serving
                    
                    totalCalories += (nutrient.calories || 0) * servingMultiplier;
                    totalProtein += (nutrient.protein_g || 0) * servingMultiplier;
                    totalCarbs += (nutrient.carbohydrate_g || 0) * servingMultiplier;
                    totalFat += (nutrient.fat_g || 0) * servingMultiplier;
                    totalFibre += (nutrient.fiber_g || 0) * servingMultiplier;
                    nutritionConfidence = "medium";
                }
            }
        }

        // Prepare recipe data with cost and nutrition estimation
        const recipeData = {
            ...llmResult,
            type: 'user_parsed',
            household_id: householdId,
            source_url: recipe_url || '',
            image_url: llmResult.image_url || '',
            description: llmResult.instructions ? llmResult.instructions.join('\n\n') : '',
            canonicalized: ingredientMatches.length > 0,
            is_curated: false,
            cost_estimation: {
                total_estimated_cost: totalEstimatedCost > 0 ? totalEstimatedCost : null,
                ingredient_matches: ingredientMatches
            },
            nutrition_estimation: totalCalories > 0 ? {
                per_serving: {
                    calories: Math.round(totalCalories / (llmResult.servings || 1)),
                    protein_g: Math.round(totalProtein / (llmResult.servings || 1) * 10) / 10,
                    carbs_g: Math.round(totalCarbs / (llmResult.servings || 1) * 10) / 10,
                    fat_g: Math.round(totalFat / (llmResult.servings || 1) * 10) / 10,
                    fibre_g: Math.round(totalFibre / (llmResult.servings || 1) * 10) / 10
                },
                confidence: nutritionConfidence
            } : null
        };

        // Create the recipe
        const newRecipe = await base44.asServiceRole.entities.Recipe.create(recipeData);

        // Update household parsed count
        await base44.asServiceRole.entities.Household.update(householdId, {
            parsed_recipes_this_month: parsedThisMonth + 1
        });

        // Log to CreditLog
        await base44.asServiceRole.entities.CreditLog.create({
            user_id: user.id,
            user_email: user.email,
            household_id: householdId,
            event_type: 'recipe_parsing',
            credits_consumed: 1,
            reference_id: newRecipe.id,
            timestamp: new Date().toISOString()
        });
        
        // Tag user in Brevo if first recipe parsed
        if (parsedThisMonth === 0) {
            try {
                await base44.asServiceRole.functions.invoke('updateBrevoContact', {
                    email: user.email,
                    tags: ['first_recipe_parsed']
                });
                console.log(`User ${user.email} tagged in Brevo: first_recipe_parsed`);
            } catch (brevoError) {
                console.warn("Brevo tagging failed (non-critical):", brevoError);
            }
        }

        return Response.json({
            success: true,
            recipe: newRecipe,
            usage: {
                parsed_this_month: parsedThisMonth + 1,
                monthly_limit: monthlyLimit,
                stored_recipes: existingRecipes.length + 1,
                storage_limit: storageLimit
            }
        });

    } catch (error) {
        console.error('Recipe parsing error:', error);
        return Response.json({ 
            error: 'Failed to parse recipe', 
            details: error.message 
        }, { status: 500 });
    }
});
