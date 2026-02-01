import { NutritionFact, FailedNutritionLookup, User } from '@/entities/all';

/**
 * Processes a list of receipts to fetch nutrition data for all items and calculate cost-effectiveness.
 * Currently works with cached data only while the nutrition API is paused.
 * @param {Array<object>} receipts - The array of receipt objects.
 * @returns {Promise<object>} - An object containing enhanced items, item stats, and potential error.
 */
export const fetchAndProcessNutritionData = async (receipts) => {
    try {
        if (!receipts || receipts.length === 0) {
            return { enhancedItems: [], itemStats: { total: 0, withNutrition: 0, error: null } };
        }

        const allItems = receipts.flatMap(r => r.items || []);
        const uniqueItemNames = [...new Set(allItems.map(item => item.canonical_name?.trim().toLowerCase()).filter(Boolean))];

        if (uniqueItemNames.length === 0) {
            const itemsWithDefaults = allItems.map(item => ({
                ...item, 
                nutrition: null, 
                cost_per_100g_macro: {}, 
                nutrient_value: {}, 
                health_score: 0, 
                hasNutrition: false
            }));
            return { enhancedItems: itemsWithDefaults, itemStats: { total: allItems.length, withNutrition: 0, error: null } };
        }

        // Step 1: Check local nutrition database (cached data)
        const localNutritionData = await NutritionFact.list();
        const localNutritionMap = localNutritionData.reduce((acc, fact) => {
            const key = fact.canonical_name.toLowerCase().trim();
            acc[key] = {
                name: fact.canonical_name,
                calories: fact.calories || 0,
                protein_g: fact.protein_g || 0,
                carbohydrate_g: fact.carbohydrate_g || 0,
                fat_g: fact.fat_g || 0,
                fiber_g: fact.fiber_g || 0,
                sugar_g: fact.sugar_g || 0,
                sodium_mg: fact.sodium_mg || 0,
                serving_size_g: fact.serving_size_g || 100
            };
            return acc;
        }, {});

        console.log(`[DEBUG] Working with ${Object.keys(localNutritionMap).length} cached nutrition facts`);

        // NOTE: Skipping API calls entirely while nutrition API is paused
        // When API is re-enabled, we would call calorieNinjasNutrition here
        
        // Process items with available cached nutrition data
        let itemsWithNutrition = 0;
        const enhancedItems = allItems.map((item) => {
            const sanitizedName = item.canonical_name?.trim().toLowerCase();
            const nutrition = sanitizedName ? localNutritionMap[sanitizedName] : null;
            let cost_per_100g_macro = {};
            let nutrient_value = {};
            let health_score = 0;
            
            if (!nutrition || !item.total_price || item.total_price <= 0) {
                return { 
                    ...item, 
                    nutrition: null, 
                    cost_per_100g_macro, 
                    nutrient_value, 
                    health_score, 
                    hasNutrition: false 
                };
            }
            
            itemsWithNutrition++;
            const itemWeightG = (item.pack_size_unit === 'kg' ? item.pack_size_value * 1000 : 
                                 item.pack_size_unit === 'g' ? item.pack_size_value :
                                 item.pack_size_unit === 'l' ? item.pack_size_value * 1000 : 
                                 item.pack_size_unit === 'ml' ? item.pack_size_value : 100) * (item.quantity || 1);

            const totalProteinInItem = nutrition.protein_g * (itemWeightG / 100);
            if (totalProteinInItem > 0) {
                cost_per_100g_macro.protein = (item.total_price / totalProteinInItem) * 100;
                nutrient_value.proteinPerCurrency = totalProteinInItem / item.total_price;
            }

            const totalCarbsInItem = nutrition.carbohydrate_g * (itemWeightG / 100);
            if (totalCarbsInItem > 0) {
                cost_per_100g_macro.carbs = (item.total_price / totalCarbsInItem) * 100;
            }

            const totalFatInItem = nutrition.fat_g * (itemWeightG / 100);
            if (totalFatInItem > 0) {
                cost_per_100g_macro.fat = (item.total_price / totalFatInItem) * 100;
            }

            const totalFiberInItem = nutrition.fiber_g * (itemWeightG / 100);
            if (totalFiberInItem > 0) {
                nutrient_value.fiberPerCurrency = totalFiberInItem / item.total_price;
            }

            const totalSugarInItem = nutrition.sugar_g * (itemWeightG / 100);
            if (totalSugarInItem > 0) {
                nutrient_value.sugarPerCurrency = totalSugarInItem / item.total_price;
            }

            // Calculate simple health score: (Protein + Fiber) / (Sugar + Fat + 1)
            const beneficial = (nutrition.protein_g || 0) + (nutrition.fiber_g || 0);
            const detrimental = (nutrition.sugar_g || 0) + (nutrition.fat_g || 0);
            health_score = beneficial / (detrimental + 1);

            // Give a boost to fruits and vegetables to prevent them being flagged as unhealthy due to natural sugar
            if (item.category === 'vegetables_fruits') {
                health_score += 0.5;
            }

            return { 
                ...item, 
                nutrition, 
                cost_per_100g_macro, 
                nutrient_value, 
                health_score, 
                hasNutrition: true 
            };
        });

        return { 
            enhancedItems, 
            itemStats: { 
                total: allItems.length, 
                withNutrition: itemsWithNutrition, 
                error: null,
                fromCache: Object.keys(localNutritionMap).length,
                fromAPI: 0,
                apiPaused: true,
                skippedPreviousFailures: 0,
                newlySaved: 0
            }
        };
    } catch (error) {
        console.log("[DEBUG] Error in fetchAndProcessNutritionData:", error.message);
        
        // Still return usable data structure instead of failing completely
        const allItems = receipts.flatMap(r => r.items || []);
        const enhancedItemsWithError = allItems.map(item => ({
            ...item, 
            nutrition: null, 
            cost_per_100g_macro: {}, 
            nutrient_value: {}, 
            health_score: 0, 
            hasNutrition: false
        }));
        
        return { 
            enhancedItems: enhancedItemsWithError, 
            itemStats: { 
                total: allItems.length, 
                withNutrition: 0, 
                error: null,
                apiPaused: true
            }
        };
    }
};