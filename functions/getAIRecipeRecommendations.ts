import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            dietary_preferences = [],
            cuisine_preferences = [],
            available_ingredients = [],
            max_cooking_time = null,
            exclude_allergens = [],
            limit = 10
        } = await req.json();

        // Get user's meal plan history
        const mealPlans = await base44.asServiceRole.entities.MealPlan.filter({
            household_id: user.household_id
        }, '-created_date', 50);

        // Get all recipes used in past meal plans
        const usedRecipeIds = new Set();
        mealPlans.forEach(plan => {
            (plan.recipe_selections || []).forEach(sel => {
                usedRecipeIds.add(sel.recipe_id);
            });
        });

        // Get all available recipes
        const householdRecipes = await base44.asServiceRole.entities.Recipe.filter({
            household_id: user.household_id
        }, null, 200);

        const curatedRecipes = await base44.asServiceRole.entities.Recipe.filter({
            type: 'curated'
        }, null, 500);

        const allRecipes = [...householdRecipes, ...curatedRecipes];

        if (allRecipes.length === 0) {
            return Response.json({ 
                recommendations: [],
                reasoning: 'No recipes available in the database.'
            });
        }

        // Build context for AI
        const usedRecipes = allRecipes.filter(r => usedRecipeIds.has(r.id));
        const unusedRecipes = allRecipes.filter(r => !usedRecipeIds.has(r.id));

        const prompt = `You are an AI recipe recommendation engine. Analyze the user's preferences and history to suggest personalized recipes.

**User Preferences:**
- Dietary Restrictions: ${dietary_preferences.length > 0 ? dietary_preferences.join(', ') : 'None'}
- Preferred Cuisines: ${cuisine_preferences.length > 0 ? cuisine_preferences.join(', ') : 'Any'}
- Available Ingredients: ${available_ingredients.length > 0 ? available_ingredients.join(', ') : 'None specified'}
- Max Cooking Time: ${max_cooking_time ? `${max_cooking_time} minutes` : 'No limit'}
- Exclude Allergens: ${exclude_allergens.length > 0 ? exclude_allergens.join(', ') : 'None'}

**Recently Used Recipes (${usedRecipes.length} total):**
${usedRecipes.slice(0, 20).map((r, idx) => `${idx + 1}. "${r.title}" - Tags: ${r.tags?.join(', ') || 'None'}`).join('\n')}

**Available Recipes to Recommend From (${allRecipes.length} total):**
${allRecipes.map((r, idx) => `${idx + 1}. ID: ${r.id}
   Title: "${r.title}"
   Tags: ${r.tags?.join(', ') || 'None'}
   Time: ${(r.prep_time_minutes || 0) + (r.cook_time_minutes || 0)}m
   Servings: ${r.servings || 'N/A'}
   Allergens: ${r.allergens?.join(', ') || 'None'}
   Ingredients Count: ${r.ingredients?.length || 0}`).slice(0, 150).join('\n\n')}

**Task:**
Recommend ${limit} recipes that:
1. Match dietary restrictions (exclude recipes with restricted tags)
2. Prefer cuisine preferences if specified
3. Prioritize recipes with available ingredients
4. Respect max cooking time if specified
5. Exclude recipes with specified allergens
6. Balance variety - mix familiar patterns with new experiences
7. Prefer recipes NOT recently used in meal plans (explore the unused ${unusedRecipes.length} recipes)

**Output Format (STRICT JSON):**
{
  "recommendations": [
    {
      "recipe_id": "<exact recipe ID>",
      "score": <0-100 match score>,
      "reason": "<brief explanation why this recipe is recommended>",
      "highlight": "<what makes this recipe special for the user>"
    }
  ],
  "reasoning": "<overall recommendation strategy explanation>"
}

**Rules:**
- Use ONLY recipe IDs from the provided list
- Each recipe_id must be unique
- Score based on preference match, variety, and novelty
- Return exactly ${limit} recommendations`;

        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                recipe_id: { type: "string" },
                                score: { type: "number" },
                                reason: { type: "string" },
                                highlight: { type: "string" }
                            }
                        }
                    },
                    reasoning: { type: "string" }
                }
            }
        });

        // Validate recommendations
        const validRecipeIds = new Set(allRecipes.map(r => r.id));
        const validatedRecommendations = (response.recommendations || [])
            .filter(rec => validRecipeIds.has(rec.recipe_id))
            .slice(0, limit);

        return Response.json({
            success: true,
            recommendations: validatedRecommendations,
            reasoning: response.reasoning,
            total_available: allRecipes.length,
            unused_count: unusedRecipes.length
        });

    } catch (error) {
        console.error('[AI Recipe Recommendations] Error:', error);
        return Response.json({ 
            error: error.message || 'Failed to generate recommendations'
        }, { status: 500 });
    }
});