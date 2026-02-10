import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        // Define mappings between internal categories and official statistical codes
        // These are example mappings and should be refined based on actual statistical agency classifications
        const mappings = [
            // UK (ONS CPIH codes)
            { country_code: 'GB', statistical_source: 'ONS', category_slug: 'bread_cereals', official_code: '01.1.1', official_name: 'Bread and cereals' },
            { country_code: 'GB', statistical_source: 'ONS', category_slug: 'meat_fish', official_code: '01.1.2', official_name: 'Meat' },
            { country_code: 'GB', statistical_source: 'ONS', category_slug: 'meat_fish', official_code: '01.1.3', official_name: 'Fish and seafood' },
            { country_code: 'GB', statistical_source: 'ONS', category_slug: 'dairy_eggs', official_code: '01.1.4', official_name: 'Milk, cheese and eggs' },
            { country_code: 'GB', statistical_source: 'ONS', category_slug: 'oils_fats', official_code: '01.1.5', official_name: 'Oils and fats' },
            { country_code: 'GB', statistical_source: 'ONS', category_slug: 'fresh_fruit', official_code: '01.1.6', official_name: 'Fruit' },
            { country_code: 'GB', statistical_source: 'ONS', category_slug: 'fresh_vegetables', official_code: '01.1.7', official_name: 'Vegetables' },
            { country_code: 'GB', statistical_source: 'ONS', category_slug: 'condiments_sauces', official_code: '01.1.8', official_name: 'Sugar, jam, syrups, chocolate and confectionery' },
            { country_code: 'GB', statistical_source: 'ONS', category_slug: 'other_food', official_code: '01.1.9', official_name: 'Food products n.e.c.' },
            { country_code: 'GB', statistical_source: 'ONS', category_slug: 'hot_beverages', official_code: '01.2.1', official_name: 'Coffee, tea and cocoa' },
            { country_code: 'GB', statistical_source: 'ONS', category_slug: 'soft_drinks', official_code: '01.2.2', official_name: 'Mineral waters, soft drinks and juices' },
            { country_code: 'GB', statistical_source: 'ONS', category_slug: 'alcohol', official_code: '02.1', official_name: 'Alcoholic beverages' },
            
            // US (BLS CPI codes - simplified)
            { country_code: 'US', statistical_source: 'BLS', category_slug: 'bread_cereals', official_code: 'SAF112', official_name: 'Cereals and bakery products' },
            { country_code: 'US', statistical_source: 'BLS', category_slug: 'meat_fish', official_code: 'SAF113', official_name: 'Meats, poultry, fish, and eggs' },
            { country_code: 'US', statistical_source: 'BLS', category_slug: 'dairy_eggs', official_code: 'SAF114', official_name: 'Dairy and related products' },
            { country_code: 'US', statistical_source: 'BLS', category_slug: 'fresh_fruit', official_code: 'SAF1131', official_name: 'Fresh fruits' },
            { country_code: 'US', statistical_source: 'BLS', category_slug: 'fresh_vegetables', official_code: 'SAF1132', official_name: 'Fresh vegetables' },
            { country_code: 'US', statistical_source: 'BLS', category_slug: 'soft_drinks', official_code: 'SAF116', official_name: 'Nonalcoholic beverages' },
            { country_code: 'US', statistical_source: 'BLS', category_slug: 'other_food', official_code: 'SAF117', official_name: 'Other food at home' },
            
            // EU (Eurostat COICOP codes)
            { country_code: 'EU', statistical_source: 'Eurostat', category_slug: 'bread_cereals', official_code: 'CP011', official_name: 'Bread and cereals' },
            { country_code: 'EU', statistical_source: 'Eurostat', category_slug: 'meat_fish', official_code: 'CP012', official_name: 'Meat' },
            { country_code: 'EU', statistical_source: 'Eurostat', category_slug: 'dairy_eggs', official_code: 'CP014', official_name: 'Milk, cheese and eggs' },
            { country_code: 'EU', statistical_source: 'Eurostat', category_slug: 'fresh_fruit', official_code: 'CP016', official_name: 'Fruit' },
            { country_code: 'EU', statistical_source: 'Eurostat', category_slug: 'fresh_vegetables', official_code: 'CP017', official_name: 'Vegetables' },
            
            // Australia (ABS CPI codes)
            { country_code: 'AU', statistical_source: 'ABS', category_slug: 'bread_cereals', official_code: '01.1.1', official_name: 'Bread and cereal products' },
            { country_code: 'AU', statistical_source: 'ABS', category_slug: 'meat_fish', official_code: '01.1.2', official_name: 'Meat and seafoods' },
            { country_code: 'AU', statistical_source: 'ABS', category_slug: 'dairy_eggs', official_code: '01.1.3', official_name: 'Dairy and related products' },
            { country_code: 'AU', statistical_source: 'ABS', category_slug: 'fresh_fruit', official_code: '01.1.4', official_name: 'Fruit' },
            { country_code: 'AU', statistical_source: 'ABS', category_slug: 'fresh_vegetables', official_code: '01.1.5', official_name: 'Vegetables' },
            
            // Canada (StatCan CPI codes)
            { country_code: 'CA', statistical_source: 'StatCan', category_slug: 'bread_cereals', official_code: '01.1.01', official_name: 'Bakery products' },
            { country_code: 'CA', statistical_source: 'StatCan', category_slug: 'meat_fish', official_code: '01.1.02', official_name: 'Meat' },
            { country_code: 'CA', statistical_source: 'StatCan', category_slug: 'dairy_eggs', official_code: '01.1.04', official_name: 'Dairy products and eggs' },
            { country_code: 'CA', statistical_source: 'StatCan', category_slug: 'fresh_fruit', official_code: '01.1.05.1', official_name: 'Fresh fruit' },
            { country_code: 'CA', statistical_source: 'StatCan', category_slug: 'fresh_vegetables', official_code: '01.1.05.2', official_name: 'Fresh vegetables' }
        ];

        const results = [];
        for (const mapping of mappings) {
            // Check if mapping already exists
            const existing = await base44.asServiceRole.entities.OfficialCategoryMapping.filter({
                country_code: mapping.country_code,
                category_slug: mapping.category_slug,
                official_code: mapping.official_code
            });
            
            if (existing.length === 0) {
                const created = await base44.asServiceRole.entities.OfficialCategoryMapping.create(mapping);
                results.push({ action: 'created', mapping: `${mapping.country_code}:${mapping.category_slug}:${mapping.official_code}` });
            } else {
                results.push({ action: 'already_exists', mapping: `${mapping.country_code}:${mapping.category_slug}:${mapping.official_code}` });
            }
        }

        return Response.json({
            success: true,
            message: 'Official category mappings seeded successfully',
            results
        });

    } catch (error) {
        console.error('Error seeding official mappings:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});