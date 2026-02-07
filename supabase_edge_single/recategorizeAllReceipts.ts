import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        // Parse request body for parameters (not query params!)
        const body = await req.json();
        const limit = parseInt(body.limit || '5');
        const skip = parseInt(body.skip || '0');
        const dryRun = body.dryRun === true;

        console.log(`Starting recategorization: limit=${limit}, skip=${skip}, dryRun=${dryRun}`);

        // The new 20 standardized categories (14 food + 6 non-food)
        const validCategories = [
            'hot_beverages',
            'fruit',
            'vegetables',
            'meat_poultry',
            'fish_seafood',
            'dairy_eggs',
            'bakery_grains',
            'oils_fats',
            'sweet_treats',
            'pantry_staples',
            'soft_drinks',
            'ready_meals',
            'alcohol',
            'other_food',
            'toiletries',
            'household_cleaning',
            'pet_care',
            'baby_care',
            'health_beauty',
            'other_non_food'
        ];

        // Get ALL receipts (just get count first for progress tracking)
        const allReceipts = await base44.asServiceRole.entities.Receipt.list();
        const totalReceipts = allReceipts.length;
        
        console.log(`Found ${totalReceipts} total receipts`);
        
        // Get just this batch
        const receipts = allReceipts.slice(skip, skip + limit);
        
        let processedCount = 0;
        let totalItemsProcessed = 0;
        let totalItemsUpdated = 0;
        let errors = [];

        console.log(`Processing ${receipts.length} receipts (skip: ${skip}, limit: ${limit})`);

        for (const receipt of receipts) {
            try {
                console.log(`Processing receipt ${receipt.id}...`);
                
                if (!receipt.items || receipt.items.length === 0) {
                    console.log(`Receipt ${receipt.id} has no items, skipping`);
                    processedCount++;
                    continue;
                }

                // Prepare item names for LLM categorization
                const itemsToCategorizeCopy = receipt.items.map(item => ({
                    name: item.name,
                    canonical_name: item.canonical_name,
                    current_category: item.category
                }));

                console.log(`Receipt ${receipt.id} has ${itemsToCategorizeCopy.length} items`);
                totalItemsProcessed += itemsToCategorizeCopy.length;

                // Build LLM prompt with all items from this receipt
                const prompt = `You are a grocery categorization expert. Categorize each of the following items into ONE of these 20 categories:

FOOD CATEGORIES (14):
1. hot_beverages (tea, coffee, cocoa, hot chocolate)
2. fruit (fresh and frozen fruits, berries)
3. vegetables (fresh and frozen vegetables, including frozen chips)
4. meat_poultry (all meat including chicken, beef, pork, lamb, frozen meats, burgers, nuggets, sausages, bacon)
5. fish_seafood (fresh and frozen fish, seafood, prawns)
6. dairy_eggs (milk, cheese, yogurt, butter, eggs, paneer, cream)
7. bakery_grains (bread, bagels, wraps, chapatis, rice, pasta, flour, breakfast cereals, plain pizza bases)
8. oils_fats (cooking oils, olive oil, butter, margarine, ghee)
9. sweet_treats (chocolate, candy, cookies, desserts, ice cream, cakes, pastries)
10. pantry_staples (canned goods, condiments, sauces, spices, ketchup, oats, dosa batter, herbs)
11. soft_drinks (sodas, juices, bottled water, coconut drink, sports drinks, smoothies)
12. ready_meals (frozen pizza, ready-to-eat meals, prepared foods, sausage rolls, sandwiches, takeaway items)
13. alcohol (beer, wine, spirits, all alcoholic beverages)
14. other_food (any food items that don't fit the above categories)

NON-FOOD CATEGORIES (6):
15. toiletries (tissues, toilet paper, personal hygiene items, soaps, shampoos, toothpaste)
16. household_cleaning (cleaning products, detergents, dishwasher tablets, bin bags, kitchen roll)
17. pet_care (pet food, pet treats, cat litter, pet supplies)
18. baby_care (diapers, baby wipes, baby formula, baby food)
19. health_beauty (cosmetics, medicines, supplements, vitamins, pain relief)
20. other_non_food (any non-food items that don't fit the above categories)

IMPORTANT CATEGORIZATION RULES:
- Frozen items go into their parent category (frozen fish → fish_seafood, frozen vegetables → vegetables, frozen chicken → meat_poultry)
- Frozen chips/fries → vegetables (potato-based)
- Coffee/tea products → hot_beverages
- Sausage rolls, sandwiches, wraps with fillings → ready_meals (composite prepared foods)
- Plain bread/rolls/wraps → bakery_grains
- Tissues, toilet paper, kitchen roll → toiletries
- Cleaning products, detergents → household_cleaning
- Items with meat as the primary ingredient → meat_poultry (e.g., sausages, bacon)
- Smoothies, fruit drinks → soft_drinks
- Return ONLY valid JSON, no markdown formatting

Items to categorize:
${JSON.stringify(itemsToCategorizeCopy, null, 2)}

Return a JSON array with this exact structure:
[
  {"name": "item name from input", "category": "assigned_category"},
  ...
]`;

                console.log(`Calling LLM for receipt ${receipt.id}...`);
                
                // Call LLM for categorization with timeout handling
                try {
                    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                        prompt: prompt,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                items: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            name: { type: "string" },
                                            category: { type: "string", enum: validCategories }
                                        },
                                        required: ["name", "category"]
                                    }
                                }
                            },
                            required: ["items"]
                        }
                    });

                    console.log(`LLM response received for receipt ${receipt.id}`);

                    // Parse LLM response and update items
                    const categorizedItems = llmResponse.items || [];
                    const updatedItems = receipt.items.map(item => {
                        const categorization = categorizedItems.find(c => c.name === item.name);
                        if (categorization && validCategories.includes(categorization.category)) {
                            totalItemsUpdated++;
                            return { ...item, category: categorization.category };
                        }
                        return item;
                    });

                    // Update receipt if not dry run
                    if (!dryRun) {
                        console.log(`Updating receipt ${receipt.id}...`);
                        await base44.asServiceRole.entities.Receipt.update(receipt.id, {
                            items: updatedItems
                        });
                        console.log(`Receipt ${receipt.id} updated successfully`);
                    }
                    
                    processedCount++;

                } catch (llmError) {
                    console.error(`LLM error for receipt ${receipt.id}:`, llmError);
                    errors.push({ receipt_id: receipt.id, error: `LLM failed: ${llmError.message}` });
                    processedCount++;
                }

            } catch (receiptError) {
                console.error(`Error processing receipt ${receipt.id}:`, receiptError);
                errors.push({ receipt_id: receipt.id, error: receiptError.message });
                processedCount++;
            }
        }

        const hasMore = (skip + limit) < totalReceipts;
        const nextSkip = hasMore ? skip + limit : null;

        console.log(`Batch complete. Processed: ${processedCount}, Items: ${totalItemsProcessed}, Updated: ${totalItemsUpdated}, Next skip: ${nextSkip}`);

        return Response.json({
            success: true,
            message: dryRun ? 'Dry run completed (no updates made)' : 'Receipts recategorized successfully',
            batch_info: {
                processed: processedCount,
                skip,
                limit,
                has_more: hasMore,
                next_skip: nextSkip,
                total_receipts: totalReceipts
            },
            total_receipts_updated: processedCount,
            total_items_processed: totalItemsProcessed,
            total_items_updated: totalItemsUpdated,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Error recategorizing receipts:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack,
            success: false
        }, { status: 500 });
    }
});