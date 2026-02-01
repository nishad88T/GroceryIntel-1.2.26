import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { receiptId, receiptData } = await req.json();

        // If receiptId is provided, fetch the receipt data
        let finalReceiptData = receiptData;
        if (receiptId) {
            const receipt = await base44.asServiceRole.entities.Receipt.get(receiptId);
            if (!receipt) {
                return Response.json({ error: 'Receipt not found' }, { status: 404 });
            }
            finalReceiptData = receipt;
        }

        if (!finalReceiptData || !finalReceiptData.items || finalReceiptData.items.length === 0) {
            return Response.json({ error: 'No receipt data or items to enhance' }, { status: 400 });
        }

        console.log(`Enhancing receipt with ${finalReceiptData.items.length} items using LLM`);

        // Prepare items for LLM enhancement
        const itemsForEnhancement = finalReceiptData.items.map((item, idx) => ({
            original_index: idx,
            name: item.name,
            category: item.category,
            brand: item.brand || '',
            quantity: item.quantity,
            total_price: item.total_price
        }));

        // Call LLM for item enhancement
        const enhancementPrompt = `You are a grocery data analyst. Given the following items from a receipt, please:
        1. Provide a canonical_name (standardized product name) for each item
        2. Identify the brand if not already present
        3. Assign the CORRECT category from this exact list (you MUST use one of these values):
        FOOD CATEGORIES: fruit, vegetables, meat_poultry, fish_seafood, dairy_eggs, bakery_grains, oils_fats, sweet_treats, pantry_staples, soft_drinks, hot_beverages, ready_meals, alcohol, other_food
        NON-FOOD CATEGORIES: toiletries, household_cleaning, pet_care, baby_care, health_beauty, other_non_food
        4. Determine if it's an own-brand/private label product
        5. Extract pack size information if mentioned in the name

        CRITICAL CATEGORY EXAMPLES (you MUST use exact values from the list above):
        - Apples, strawberries, bananas → fruit
        - Carrots, lettuce, tomatoes → vegetables
        - Chicken, beef, bacon, sausages → meat_poultry
        - Salmon, tuna, prawns → fish_seafood
        - Milk, cheese, eggs → dairy_eggs
        - Bread, pasta, rice, cereal → bakery_grains
        - Olive oil, butter → oils_fats
        - Chocolate, biscuits, cake → sweet_treats
        - Canned beans, flour, sugar → pantry_staples
        - Water, juice, cola → soft_drinks
        - Coffee, tea → hot_beverages
        - Pizza, ready curry → ready_meals
        - Wine, beer → alcohol
        - Shampoo, toothpaste → toiletries
        - Washing liquid, bleach → household_cleaning

        NEVER use categories like 'meat_fish', 'vegetables_fruits', 'beverages', 'bakery', 'snacks_sweets' - these are WRONG!

Items:
${JSON.stringify(itemsForEnhancement, null, 2)}

Respond with a JSON object containing:
{
  "enhanced_items": [
    {
      "original_index": 0,
      "canonical_name": "...",
      "brand": "...",
      "category": "...",
      "is_own_brand": true/false,
      "pack_size_value": number or null,
      "pack_size_unit": "g"/"kg"/"ml"/"l"/"each"/"pack" or null
    },
    ...
  ],
  "receipt_insights": {
    "summary": "A one-sentence summary of this shopping trip",
    "highlights": ["Key observation 1", "Key observation 2", "Key observation 3"],
    "categories_purchased": ["category1", "category2"],
    "total_items": number,
    "estimated_healthy_items": number,
    "estimated_processed_items": number
  }
}`;

        const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: enhancementPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    enhanced_items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                original_index: { type: "number" },
                                canonical_name: { type: "string" },
                                brand: { type: "string" },
                                category: { type: "string" },
                                is_own_brand: { type: "boolean" },
                                pack_size_value: { type: ["number", "null"] },
                                pack_size_unit: { type: ["string", "null"] }
                            }
                        }
                    },
                    receipt_insights: {
                        type: "object",
                        properties: {
                            summary: { type: "string" },
                            highlights: { type: "array", items: { type: "string" } },
                            categories_purchased: { type: "array", items: { type: "string" } },
                            total_items: { type: "number" },
                            estimated_healthy_items: { type: "number" },
                            estimated_processed_items: { type: "number" }
                        }
                    }
                }
            }
        });

        console.log('LLM enhancement response received');

        // Merge enhanced data back into items
        const enhancedItems = finalReceiptData.items.map((item, idx) => {
            const enhancement = llmResponse.enhanced_items.find(e => e.original_index === idx);
            if (enhancement) {
                return {
                    ...item,
                    canonical_name: enhancement.canonical_name || item.canonical_name || item.name,
                    brand: enhancement.brand || item.brand || '',
                    category: enhancement.category || item.category,
                    is_own_brand: enhancement.is_own_brand !== undefined ? enhancement.is_own_brand : item.is_own_brand,
                    pack_size_value: enhancement.pack_size_value || item.pack_size_value || null,
                    pack_size_unit: enhancement.pack_size_unit || item.pack_size_unit || null
                };
            }
            return item;
        });

        // If receiptId was provided, update the receipt entity
        if (receiptId) {
            await base44.asServiceRole.entities.Receipt.update(receiptId, {
                items: enhancedItems,
                receipt_insights: llmResponse.receipt_insights
            });
            
            console.log(`Receipt ${receiptId} enhanced successfully`);
        }

        return Response.json({
            success: true,
            enhanced_items: llmResponse.enhanced_items,
            receipt_insights: llmResponse.receipt_insights
        });

    } catch (error) {
        console.error('LLM enhancement error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});