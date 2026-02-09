import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { receiptId } = await req.json();

        if (!receiptId) {
            return Response.json({ 
                error: 'Missing receiptId parameter' 
            }, { status: 400 });
        }

        console.log(`[LLM Enhancement] Starting enhancement for receipt ${receiptId}`);

        // Fetch the receipt
        const receipt = await base44.asServiceRole.entities.Receipt.get(receiptId);
        if (!receipt) {
            console.error(`[LLM Enhancement] Receipt ${receiptId} not found`);
            return Response.json({ error: 'Receipt not found' }, { status: 404 });
        }

        if (!receipt.items || receipt.items.length === 0) {
            console.warn(`[LLM Enhancement] Receipt ${receiptId} has no items to enhance`);
            // Mark as review_insights even with no items (rare edge case)
            await base44.asServiceRole.entities.Receipt.update(receiptId, {
                validation_status: 'review_insights'
            });
            return Response.json({ 
                success: true, 
                message: 'No items to enhance, marked as review_insights',
                receiptId 
            });
        }

        console.log(`[LLM Enhancement] Enhancing ${receipt.items.length} items for receipt ${receiptId}`);

        // Prepare items for LLM enhancement
        const itemsForEnhancement = receipt.items.map((item, idx) => ({
            original_index: idx,
            name: item.name,
            category: item.category || 'other',
            brand: item.brand || '',
            quantity: item.quantity,
            total_price: item.total_price,
            discount_applied: item.discount_applied || 0
        }));

        // Enhanced prompt for more actionable insights
        const enhancementPrompt = `You are a grocery data analyst helping users make smarter shopping decisions. Given the following items from a receipt, please:

1. Provide a canonical_name (standardized product name) for each item
2. Identify the brand if not already present
3. Assign a specific category from this EXACT list (CRITICAL - use these exact values):
   FOOD: fruit, vegetables, meat_poultry, fish_seafood, dairy_eggs, bakery_grains, oils_fats, sweet_treats, pantry_staples, soft_drinks, hot_beverages, ready_meals, alcohol, other_food
   NON-FOOD: toiletries, household_cleaning, pet_care, baby_care, health_beauty, other_non_food
4. Determine if it's an own-brand/private label product
5. Extract pack size information if mentioned in the name

CRITICAL CATEGORY EXAMPLES:
- Apples, bananas → fruit
- Carrots, lettuce → vegetables  
- Chicken, bacon → meat_poultry
- Salmon, prawns → fish_seafood
- Milk, cheese → dairy_eggs
- Bread, pasta → bakery_grains
- Chocolate, biscuits → sweet_treats
- Water, juice → soft_drinks
- Coffee, tea → hot_beverages

NEVER use: meat_fish, vegetables_fruits, beverages, bakery, snacks_sweets - these are WRONG!

Items:
${JSON.stringify(itemsForEnhancement, null, 2)}

Store: ${receipt.supermarket}
Total Amount: £${receipt.total_amount}

Respond with a JSON object containing:
{
  "enhanced_items": [
    {
      "original_index": 0,
      "canonical_name": "...",
      "brand": "...",
      "category": "..." (MUST be one of: fruit, vegetables, meat_poultry, fish_seafood, dairy_eggs, bakery_grains, oils_fats, sweet_treats, pantry_staples, soft_drinks, hot_beverages, ready_meals, alcohol, toiletries, household_cleaning, pet_care, baby_care, health_beauty, other_food, other_non_food),
      "is_own_brand": true/false,
      "pack_size_value": number or null,
      "pack_size_unit": "g"/"kg"/"ml"/"l"/"each"/"pack" or null
    },
    ...
  ],
  "receipt_insights": {
    "summary": "A compelling, actionable one-sentence summary that highlights the most interesting aspect of this shopping trip (e.g., cost savings, healthy choices, unusual purchases, or spending patterns)",
    "highlights": [
      "First key insight - focus on actionable information like cost-saving opportunities, health considerations, or unusual purchases",
      "Second key insight - could highlight a particularly good deal, a healthier alternative available, or a spending pattern",
      "Third key insight - might suggest how this compares to typical shopping or point out a category with high spending"
    ],
    "categories_purchased": ["category1", "category2"],
    "total_items": number,
    "estimated_healthy_items": number (count items from fruit, vegetables, fish_seafood, low-processed dairy_eggs, etc.),
    "estimated_processed_items": number (count snacks_sweets, highly processed foods, etc.)
  }
}

IMPORTANT for receipt_insights:
- Make the summary engaging and specific to THIS receipt, not generic
- Highlights should be actionable and personalized - mention specific items, prices, or patterns
- Focus on helping the user understand their spending and make better decisions
- Point out any particularly good deals, expensive items, or health considerations
- If there are many processed foods, gently suggest healthier alternatives
- If there's a good balance of healthy items, celebrate that
- Mention any unusual or interesting purchases that stand out`;

        console.log(`[LLM Enhancement] Invoking LLM for receipt ${receiptId}`);
        
        let llmResponse;
        try {
            const vercelLlmEndpoint = Deno.env.get('VERCEL_LLM_ENDPOINT');
            if (vercelLlmEndpoint) {
                const response = await fetch(vercelLlmEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: enhancementPrompt,
                        response_schema: {
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
                    })
                });
                llmResponse = await response.json();
            } else {
                llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
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
            }
        } catch (llmError) {
            console.error(`[LLM Enhancement] LLM invocation failed for receipt ${receiptId}:`, llmError);
            // If LLM fails, throw error so processReceiptInBackground can mark as failed_processing
            throw new Error(`LLM enhancement failed: ${llmError.message}`);
        }

        console.log(`[LLM Enhancement] LLM response received for receipt ${receiptId}`);
        console.log(`[LLM Enhancement] Receipt Insights:`, JSON.stringify(llmResponse.receipt_insights, null, 2));
        console.log(`[LLM Enhancement] Sample enhanced item:`, JSON.stringify(llmResponse.enhanced_items[0], null, 2));

        // Merge enhanced data back into items
        const enhancedItems = receipt.items.map((item, idx) => {
            const enhancement = llmResponse.enhanced_items.find(e => e.original_index === idx);
            if (enhancement) {
                return {
                    ...item,
                    canonical_name: enhancement.canonical_name || item.canonical_name || item.name,
                    brand: enhancement.brand || item.brand || '',
                    category: enhancement.category || item.category || 'other',
                    is_own_brand: enhancement.is_own_brand !== undefined ? enhancement.is_own_brand : item.is_own_brand,
                    pack_size_value: enhancement.pack_size_value || item.pack_size_value || null,
                    pack_size_unit: enhancement.pack_size_unit || item.pack_size_unit || null
                };
            }
            return item;
        });

        console.log(`[LLM Enhancement] Updating receipt ${receiptId} with enhanced data, insights, and review_insights status`);

        // Calculate total_amount from items if not already set or is 0
        let calculatedTotal = receipt.total_amount || 0;
        if (calculatedTotal === 0 && enhancedItems.length > 0) {
            calculatedTotal = enhancedItems.reduce((sum, item) => {
                return sum + (item.total_price || 0);
            }, 0);
            calculatedTotal = Math.round(calculatedTotal * 100) / 100;
            console.log(`[LLM Enhancement] Calculated total_amount from items: ${calculatedTotal}`);
        }

        // Calculate total discounts from items
        let calculatedDiscounts = enhancedItems.reduce((sum, item) => {
            return sum + (item.discount_applied || 0);
        }, 0);
        calculatedDiscounts = Math.round(calculatedDiscounts * 100) / 100;
        console.log(`[LLM Enhancement] Calculated total_discounts from items: ${calculatedDiscounts}`);

        // Update the receipt with enhanced items, insights, AND mark as review_insights
        const updatePayload = {
            items: enhancedItems,
            receipt_insights: llmResponse.receipt_insights,
            validation_status: 'review_insights', // AI complete, ready for user review
            total_amount: calculatedTotal,
            total_discounts: calculatedDiscounts > 0 ? calculatedDiscounts : (receipt.total_discounts || 0)
        };

        console.log(`[LLM Enhancement] Update payload validation_status: ${updatePayload.validation_status}`);

        await base44.asServiceRole.entities.Receipt.update(receiptId, updatePayload);

        console.log(`[LLM Enhancement] Receipt ${receiptId} enhanced successfully and marked as review_insights`);

        return Response.json({
            success: true,
            message: 'Receipt enhanced successfully and marked as review_insights',
            receiptId: receiptId,
            itemsEnhanced: enhancedItems.length,
            insightsGenerated: !!llmResponse.receipt_insights,
            validation_status: 'review_insights'
        });

    } catch (error) {
        console.error('[LLM Enhancement] Error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});
