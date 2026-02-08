import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        // Currency to country mapping
        const currencyToCountry = {
            'GBP': { country_code: 'GB', statistical_source: 'ONS' },
            'USD': { country_code: 'US', statistical_source: 'BLS' },
            'EUR': { country_code: 'EU', statistical_source: 'Eurostat' },
            'AUD': { country_code: 'AU', statistical_source: 'ABS' },
            'CAD': { country_code: 'CA', statistical_source: 'StatCan' }
        };

        // Get all users
        const users = await base44.asServiceRole.entities.User.list();
        
        const results = [];
        for (const u of users) {
            // Check if user already has a UserCountry entry
            const existing = await base44.asServiceRole.entities.UserCountry.filter({ user_id: u.id });
            
            if (existing.length === 0) {
                // Auto-assign based on currency
                const userCurrency = u.currency || 'GBP';
                const countryMapping = currencyToCountry[userCurrency] || currencyToCountry['GBP'];
                
                await base44.asServiceRole.entities.UserCountry.create({
                    user_id: u.id,
                    user_email: u.email,
                    country_code: countryMapping.country_code,
                    statistical_source: countryMapping.statistical_source,
                    auto_assigned: true
                });
                
                results.push({ 
                    action: 'created', 
                    user_email: u.email, 
                    country_code: countryMapping.country_code 
                });
            } else {
                results.push({ 
                    action: 'already_exists', 
                    user_email: u.email 
                });
            }
        }

        return Response.json({
            success: true,
            message: 'User countries populated successfully',
            total_users: users.length,
            results
        });

    } catch (error) {
        console.error('Error populating user countries:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});