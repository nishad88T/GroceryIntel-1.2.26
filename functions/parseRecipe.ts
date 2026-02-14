import { createServiceClient, requireUser } from './_helpers/supabase.ts';
import { resolveHouseholdId } from './_helpers/household.ts';

Deno.serve(async (req) => {
  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    const { user } = auth;
    const { recipe_url, recipe_text } = await req.json();

    if (!recipe_url && !recipe_text) {
      return Response.json({ error: 'Please provide either recipe_url or recipe_text' }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: profile } = await service.from('profiles').select('household_id').eq('id', user.id).maybeSingle();
    const householdId = await resolveHouseholdId(user.id, profile?.household_id || null);

    if (!householdId) {
      return Response.json({ error: 'Unauthorized or no household' }, { status: 401 });
    }

    const { data: household } = await service.from('households').select('parsed_recipes_this_month').eq('id', householdId).maybeSingle();

    const llmEndpoint = Deno.env.get('VERCEL_LLM_ENDPOINT');
    let parsed;

    if (llmEndpoint) {
      const llmResp = await fetch(llmEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse_recipe',
          recipe_url,
          recipe_text
        })
      });

      if (!llmResp.ok) {
        throw new Error(`Recipe parser endpoint failed: ${llmResp.status}`);
      }

      const llmData = await llmResp.json();
      parsed = llmData.recipe || llmData;
    } else {
      parsed = {
        title: recipe_url ? new URL(recipe_url).hostname.replace('www.', '') : 'Imported Recipe',
        source_url: recipe_url || null,
        ingredients: [],
        instructions: recipe_text ? [recipe_text] : [],
        servings: null
      };
    }

    const payload = {
      household_id: householdId,
      created_by: user.id,
      type: 'user_parsed',
      title: parsed.title || 'Imported Recipe',
      source_url: parsed.source_url || recipe_url || null,
      image_url: parsed.image_url || null,
      ingredients: parsed.ingredients || [],
      instructions: parsed.instructions || [],
      servings: parsed.servings || null,
      prep_time_minutes: parsed.prep_time_minutes || null,
      cook_time_minutes: parsed.cook_time_minutes || null,
      total_time_minutes: parsed.total_time_minutes || null,
      tags: parsed.tags || [],
      allergens: parsed.allergens || []
    };

    const { data: recipe, error: recipeError } = await service
      .from('recipes')
      .insert(payload)
      .select('*')
      .single();

    if (recipeError) {
      throw recipeError;
    }

    await service
      .from('households')
      .update({ parsed_recipes_this_month: (household?.parsed_recipes_this_month || 0) + 1 })
      .eq('id', householdId);

    return Response.json({
      recipe,
      usage: {
        parsedThisMonthIncremented: true,
        householdId
      }
    });
  } catch (error) {
    console.error('[parseRecipe] Error:', error);
    return Response.json({ error: error.message || 'Failed to parse recipe' }, { status: 500 });
  }
});
