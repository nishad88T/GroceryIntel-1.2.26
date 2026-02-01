import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            week_start_date,
            dietary_restrictions = [],
            preferred_cuisines = [],
            available_ingredients = [],
            meals_per_day = 3,
            servings = 2,
            swap_day = null,
            swap_meal = null,
            existing_plan = null
        } = await req.json();

        if (!week_start_date || !user.household_id) {
            return Response.json({ 
                error: 'Missing required parameters: week_start_date and household_id' 
            }, { status: 400 });
        }

        // Get household recipes
        const householdRecipes = await base44.asServiceRole.entities.Recipe.filter({
            household_id: user.household_id
        }, null, 200);

        const curatedRecipes = await base44.asServiceRole.entities.Recipe.filter({
            type: 'curated'
        }, null, 500);

        const allRecipes = [...householdRecipes, ...curatedRecipes];

        if (allRecipes.length === 0) {
            return Response.json({ 
                error: 'No recipes available. Please add some recipes first.' 
            }, { status: 400 });
        }

        // Build the prompt for AI
        let prompt = `You are an AI meal planning assistant. Generate a weekly meal plan based on the following preferences:

**Dietary Restrictions:** ${dietary_restrictions.length > 0 ? dietary_restrictions.join(', ') : 'None'}
**Preferred Cuisines:** ${preferred_cuisines.length > 0 ? preferred_cuisines.join(', ') : 'Any'}
**Available Ingredients:** ${available_ingredients.length > 0 ? available_ingredients.join(', ') : 'Any'}
**Meals Per Day:** ${meals_per_day}
**Servings:** ${servings}

**Available Recipes:**
${allRecipes.map((r, idx) => `${idx + 1}. "${r.title}" (ID: ${r.id})
   - Tags: ${r.tags?.join(', ') || 'None'}
   - Servings: ${r.servings || 'N/A'}
   - Prep: ${r.prep_time_minutes || 'N/A'}m, Cook: ${r.cook_time_minutes || 'N/A'}m
   - Ingredients: ${r.ingredients?.length || 0} items`).slice(0, 100).join('\n')}

${swap_day && swap_meal ? `
**SWAP REQUEST:** Replace only the ${swap_meal} on ${swap_day} with a different recipe that matches preferences.
**Current Plan to Modify:**
${JSON.stringify(existing_plan, null, 2)}
` : ''}

**Task:** ${swap_day && swap_meal ? 
    `Modify only the ${swap_meal} on ${swap_day}. Keep all other meals exactly the same. Return the updated full plan.` :
    `Create a complete 7-day meal plan (Monday-Sunday) with ${meals_per_day} meals per day.`}

**Output Format (STRICT JSON):**
{
  "recipe_selections": [
    {
      "day": "monday|tuesday|wednesday|thursday|friday|saturday|sunday",
      "meal": "breakfast|lunch|dinner|snack",
      "recipe_id": "<exact recipe ID from list>",
      "servings": ${servings}
    }
  ],
  "reasoning": "Brief explanation of meal selections"
}

**Rules:**
1. Respect dietary restrictions (exclude recipes with restricted tags)
2. Prefer recipes matching cuisine preferences
3. Prioritize recipes with available ingredients
4. Balance variety across the week
5. Consider prep/cook time for weekday vs weekend meals
6. Use ONLY recipe IDs from the provided list
7. Each recipe_id must appear only ONCE in the plan
8. Include exactly ${meals_per_day * 7} meal selections`;

        // Call LLM
        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    recipe_selections: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                day: { type: "string" },
                                meal: { type: "string" },
                                recipe_id: { type: "string" },
                                servings: { type: "number" }
                            }
                        }
                    },
                    reasoning: { type: "string" }
                }
            }
        });

        // Validate and clean the response
        const mealPlan = response.recipe_selections || [];
        const validRecipeIds = new Set(allRecipes.map(r => r.id));
        
        const validatedPlan = mealPlan.filter(selection => 
            validRecipeIds.has(selection.recipe_id) &&
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(selection.day) &&
            ['breakfast', 'lunch', 'dinner', 'snack'].includes(selection.meal)
        );

        // If swapping, merge with existing plan
        if (swap_day && swap_meal && existing_plan) {
            const existingSelections = existing_plan.filter(
                s => !(s.day === swap_day && s.meal === swap_meal)
            );
            const newSelection = validatedPlan.find(
                s => s.day === swap_day && s.meal === swap_meal
            );
            
            if (newSelection) {
                validatedPlan.splice(0, validatedPlan.length, ...existingSelections, newSelection);
            }
        }

        return Response.json({
            success: true,
            recipe_selections: validatedPlan,
            reasoning: response.reasoning,
            recipes_used: validatedPlan.length,
            expected: meals_per_day * 7
        });

    } catch (error) {
        console.error('[AI Meal Plan] Error:', error);
        return Response.json({ 
            error: error.message || 'Failed to generate meal plan' 
        }, { status: 500 });
    }
});