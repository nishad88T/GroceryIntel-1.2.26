import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        // Define the 13 standardized grocery categories aligned with national statistics
        const categories = [
            { category_slug: 'bread_cereals', display_name: 'Bread & Cereals', description: 'Bread, rice, pasta, flour, breakfast cereals', sort_order: 1 },
            { category_slug: 'meat_fish', display_name: 'Meat & Fish', description: 'Fresh and processed meat, poultry, fish, seafood', sort_order: 2 },
            { category_slug: 'dairy_eggs', display_name: 'Dairy & Eggs', description: 'Milk, cheese, yogurt, butter, eggs', sort_order: 3 },
            { category_slug: 'fresh_fruit', display_name: 'Fresh Fruit', description: 'Fresh and seasonal fruits', sort_order: 4 },
            { category_slug: 'fresh_vegetables', display_name: 'Fresh Vegetables', description: 'Fresh and seasonal vegetables', sort_order: 5 },
            { category_slug: 'hot_beverages', display_name: 'Hot Beverages', description: 'Tea, coffee, cocoa, hot chocolate', sort_order: 6 },
            { category_slug: 'soft_drinks', display_name: 'Soft Drinks & Juices', description: 'Sodas, juices, bottled water, sports drinks', sort_order: 7 },
            { category_slug: 'frozen_foods', display_name: 'Frozen Foods', description: 'Frozen meals, vegetables, desserts, ice cream', sort_order: 8 },
            { category_slug: 'snacks_sweets', display_name: 'Snacks & Sweets', description: 'Chips, cookies, candy, chocolate, desserts', sort_order: 9 },
            { category_slug: 'oils_fats', display_name: 'Oils & Fats', description: 'Cooking oils, olive oil, butter, margarine', sort_order: 10 },
            { category_slug: 'condiments_sauces', display_name: 'Condiments & Sauces', description: 'Sauces, dressings, spices, seasonings', sort_order: 11 },
            { category_slug: 'alcohol', display_name: 'Alcohol', description: 'Beer, wine, spirits, alcoholic beverages', sort_order: 12 },
            { category_slug: 'other_food', display_name: 'Other Food & Beverages', description: 'Other food items and non-alcoholic beverages not elsewhere classified', sort_order: 13 }
        ];

        // Use service role to create categories (bypassing RLS)
        const results = [];
        for (const category of categories) {
            // Check if category already exists
            const existing = await base44.asServiceRole.entities.GroceryCategory.filter({ category_slug: category.category_slug });
            
            if (existing.length === 0) {
                const created = await base44.asServiceRole.entities.GroceryCategory.create(category);
                results.push({ action: 'created', category: created.category_slug });
            } else {
                results.push({ action: 'already_exists', category: category.category_slug });
            }
        }

        return Response.json({
            success: true,
            message: 'Grocery categories seeded successfully',
            results
        });

    } catch (error) {
        console.error('Error seeding grocery categories:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});