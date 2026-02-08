import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        // Parse query parameters for batch processing
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get('limit') || '10'); // Reduced default to 10
        const skip = parseInt(url.searchParams.get('skip') || '0');
        const dryRun = url.searchParams.get('dryRun') === 'true';

        console.log(`Starting recategorization: limit=${limit}, skip=${skip}, dryRun=${dryRun}`);

        // The new 14 standardized categories
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
            'other_food'
        ];

        // Get receipts with pagination for Aug-Nov 2025
        const allReceipts = await base44.asServiceRole.entities.Receipt.filter({
            purchase_date: { $gte: '2025-08-01', $lte: '2025-11-30' }
        });
        
        console.log(`Found ${allReceipts.length} total receipts in date range`);
        
        const receipts = allReceipts.slice(skip, skip + limit);
        
        let totalReceipts = 0;
        let totalItemsProcessed = 0;
        let totalItemsUpdated = 0;
        let errors = [];

        console.log(`Processing ${receipts.length} receipts (skip: ${skip}, limit: ${limit})`);

        for (const receipt of receipts) {
            try {
                console.log(`Processing receipt ${receipt.id}...`);
                
                if (!receipt.items || receipt.items.length === 0) {
                    console.log(`Receipt ${receipt.id} has no items, skipping`);
                    continue;
                }

                const userEmail = receipt.user_email || receipt.created_by;
                if (!userEmail) {
                    errors.push({ 
                        receipt_id: receipt.id, 
                        error: 'Missing user_email and created_by' 
                    });
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
                const prompt = `You are a grocery categorization expert. Categorize each of the following grocery items into ONE of these 14 categories:

Categories:
1. hot_beverages (tea, coffee, cocoa, hot chocolate)
2. fruit (fresh and frozen fruits, berries)
3. vegetables (fresh and frozen vegetables, including frozen chips)
4. meat_poultry (all meat including chicken, beef, pork, frozen meats, burgers, nuggets)
5. fish_seafood (fresh and frozen fish, seafood, prawns)
6. dairy_eggs (milk, cheese, yogurt, butter, eggs, paneer)
7. bakery_grains (bread, bagels, wraps, chapatis, rice, pasta, flour, breakfast cereals)
8. oils_fats (cooking oils, olive oil, butter, margarine)
9. sweet_treats (chocolate, candy, cookies, desserts, ice cream)
10. pantry_staples (canned goods, condiments, sauces, spices, ketchup, oats, dosa batter)
11. soft_drinks (sodas, juices, bottled water, coconut drink, sports drinks)
12. ready_meals (frozen pizza, ready-to-eat meals, prepared foods)
13. alcohol (beer, wine, spirits, all alcoholic beverages)
14. other_food (anything that doesn't fit the above categories)

IMPORTANT RULES:
- Frozen items go into their parent category (frozen fish → fish_seafood, frozen vegetables → vegetables, frozen chicken → meat_poultry)
- Frozen chips go into vegetables category
- Coffee/tea products go into hot_beverages
- Condiments like ketchup go into pantry_staples
- Return ONLY valid JSON, no markdown formatting

Items to categorize:
${JSON.stringify(itemsToCategorizeCopy, null, 2)}

Return a JSON array with this exact structure:
[
  {"name": "item name from input", "category": "assigned_category"},
  ...
]`;

                console.log(`Calling LLM for receipt ${receipt.id}...`);
                
                // Call LLM for categorization
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
                
                totalReceipts++;

            } catch (receiptError) {
                console.error(`Error processing receipt ${receipt.id}:`, receiptError);
                errors.push({ receipt_id: receipt.id, error: receiptError.message });
            }
        }

        const hasMore = (skip + limit) < allReceipts.length;
        const nextSkip = hasMore ? skip + limit : null;

        console.log(`Completed processing. Receipts: ${totalReceipts}, Items processed: ${totalItemsProcessed}, Items updated: ${totalItemsUpdated}`);

        return Response.json({
            success: true,
            message: dryRun ? 'Dry run completed (no updates made)' : 'Historical receipts recategorized successfully',
            batch_info: {
                processed: receipts.length,
                skip,
                limit,
                has_more: hasMore,
                next_skip: nextSkip,
                total_receipts_in_range: allReceipts.length
            },
            total_receipts_updated: totalReceipts,
            total_items_processed: totalItemsProcessed,
            total_items_updated: totalItemsUpdated,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Error recategorizing historical receipts:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack,
            success: false
        }, { status: 500 });
    }
});