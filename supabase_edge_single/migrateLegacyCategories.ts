import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Mapping of old category names to new schema-compliant names
const CATEGORY_MIGRATION_MAP = {
    'meat_fish': 'meat_poultry',
    'vegetables_fruits': 'vegetables',
    'bakery': 'bakery_grains',
    'snacks_sweets': 'sweet_treats',
    'beverages': 'soft_drinks',
    'personal_care': 'toiletries',
    'frozen_foods': 'ready_meals',
    'other': 'other_food'
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify admin user
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
        }

        console.log('[Category Migration] Starting migration of legacy categories...');

        // Fetch all receipts
        const allReceipts = await base44.asServiceRole.entities.Receipt.list();
        console.log(`[Category Migration] Found ${allReceipts.length} receipts to process`);

        let receiptsUpdated = 0;
        let itemsUpdated = 0;

        for (const receipt of allReceipts) {
            if (!receipt.items || receipt.items.length === 0) {
                continue;
            }

            let receiptNeedsUpdate = false;
            const updatedItems = receipt.items.map(item => {
                if (!item.category) {
                    return item;
                }

                const newCategory = CATEGORY_MIGRATION_MAP[item.category];
                if (newCategory) {
                    console.log(`[Category Migration] Migrating "${item.category}" → "${newCategory}" for item "${item.name}"`);
                    itemsUpdated++;
                    receiptNeedsUpdate = true;
                    return {
                        ...item,
                        category: newCategory
                    };
                }

                return item;
            });

            if (receiptNeedsUpdate) {
                await base44.asServiceRole.entities.Receipt.update(receipt.id, {
                    items: updatedItems
                });
                receiptsUpdated++;
                console.log(`[Category Migration] Updated receipt ${receipt.id}`);
            }
        }

        console.log(`[Category Migration] Migration complete! Updated ${receiptsUpdated} receipts, ${itemsUpdated} items`);

        return Response.json({
            success: true,
            receiptsUpdated,
            itemsUpdated,
            message: `Successfully migrated ${itemsUpdated} items across ${receiptsUpdated} receipts`
        });

    } catch (error) {
        console.error('[Category Migration] Error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});