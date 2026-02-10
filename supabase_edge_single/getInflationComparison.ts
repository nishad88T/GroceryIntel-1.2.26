export async function resolveHouseholdId(base44, user) {
    if (!user) {
        return null;
    }

    if (user.household_id) {
        return user.household_id;
    }

    const memberships = await base44.asServiceRole.entities.HouseholdMember.filter({
        user_id: user.id
    }, '-created_date', 1);

    if (memberships && memberships.length > 0) {
        return memberships[0].household_id;
    }

    return null;
}

export async function getHouseholdMembers(base44, householdId) {
    const memberships = await base44.asServiceRole.entities.HouseholdMember.filter({
        household_id: householdId
    });

    if (!memberships || memberships.length === 0) {
        return { memberships: [], profiles: [] };
    }

    const profiles = await Promise.all(
        memberships.map((member) => base44.asServiceRole.entities.User.get(member.user_id).catch(() => null))
    );

    return {
        memberships,
        profiles: profiles.filter(Boolean)
    };
}


import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Check for a scheduler secret key to allow automatic execution without user session
        const schedulerSecret = Deno.env.get("SCHEDULER_SECRET");
        const headerSecret = req.headers.get("x-scheduler-secret");
        const isScheduledRun = schedulerSecret && headerSecret === schedulerSecret;

        // Require admin authentication or valid scheduler secret
        if (!isScheduledRun) {
            if (!user || user.role !== 'admin') {
                return Response.json({ error: 'Unauthorized - admin only' }, { status: 403 });
            }
        }
        if (!user) {
            return Response.json({ error: 'User required' }, { status: 401 });
        }
        const householdId = await resolveHouseholdId(base44, user);
        if (!householdId) {
            return Response.json({ error: 'User has no household' }, { status: 400 });
        }

        const CATEGORY_MAPPING = {
            'hot_beverages': 'hot_beverages',
            'fruit': 'fruit',
            'vegetables': 'vegetables',
            'meat_poultry': 'meat_poultry',
            'fish_seafood': 'fish_seafood',
            'dairy_eggs': 'dairy_eggs',
            'bakery_grains': 'bakery_grains',
            'oils_fats': 'oils_fats',
            'sweet_treats': 'sweet_treats',
            'pantry_staples': 'pantry_staples',
            'soft_drinks': 'soft_drinks',
            'ready_meals': 'ready_meals',
            'alcohol': 'alcohol',
            'toiletries': 'toiletries',
            'household_cleaning': 'household_cleaning',
            'health_beauty': 'health_beauty',
            // Map receipt-specific categories to closest ONS or 'overall'
            'other_food': 'overall',
            'pet_care': 'overall',
            'baby_care': 'overall',
            'other_non_food': 'overall',
            // Default fallback for any unmapped or null categories
            'default': 'overall'
        };

        // Auto-assign/verify UserCountry based on user's currency
        let userCountry = await base44.entities.UserCountry.filter({ user_id: user.id });
        
        if (!userCountry || userCountry.length === 0) {
            // Auto-assign country based on currency
            const currencyToCountry = {
                'GBP': { country_code: 'GB', statistical_source: 'ONS' },
                'USD': { country_code: 'US', statistical_source: 'BLS' },
                'EUR': { country_code: 'EU', statistical_source: 'Eurostat' },
                'CAD': { country_code: 'CA', statistical_source: 'StatCan' },
                'AUD': { country_code: 'AU', statistical_source: 'ABS' }
            };

            const assignment = currencyToCountry[user.currency] || currencyToCountry['GBP'];
            
            userCountry = await base44.entities.UserCountry.create({
                user_id: user.id,
                user_email: user.email,
                country_code: assignment.country_code,
                statistical_source: assignment.statistical_source,
                auto_assigned: true
            });
        } else {
            userCountry = userCountry[0];
        }

        // Fetch user's past 12 months' receipts
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const startDate = twelveMonthsAgo.toISOString().split('T')[0];

        const receipts = await base44.entities.Receipt.filter({
            household_id: householdId,
            purchase_date: { $gte: startDate }
        });

        if (receipts.length === 0) {
            return Response.json({
                success: true,
                message: 'No receipts found in the last 12 months',
                personal_inflation: { overall: 0, by_category: {} },
                official_inflation: { overall: 0, by_category: {} },
                comparison: { overall: { personal_rate: 0, official_rate: 0, variance: 0, is_significant: false }, by_category: {} }
            });
        }

        // Helper to normalize item names for matching
        const normalizeItemName = (name) => {
            if (!name) return '';
            return name
                .toLowerCase()
                .replace(/\b(organic|fresh|own brand|tesco|sainsbury's|asda|morrisons|aldi|lidl)\b/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };

        // Aggregate spending by category for both periods, using the defined mapping
        const aggregateByCategory = (receipts) => {
            const categorySpending = {};
            receipts.forEach(receipt => {
                (receipt.items || []).forEach(item => {
                    const receiptCategory = item.category || 'default';
                    const onsCategorySlug = CATEGORY_MAPPING[receiptCategory] || CATEGORY_MAPPING['default'];

                    if (!categorySpending[onsCategorySlug]) {
                        categorySpending[onsCategorySlug] = { total: 0, count: 0 };
                    }
                    categorySpending[onsCategorySlug].total += item.total_price || 0;
                    categorySpending[onsCategorySlug].count += 1;
                });
            });
            return categorySpending;
        };

        // Calculate like-for-like inflation (comparing same items between periods)
        const calculateLikeForLikeInflation = (recentReceipts, olderReceipts) => {
            const categoryResults = {};
            
            // Build item maps by category for both periods
            const buildItemMap = (receipts) => {
                const map = {};
                receipts.forEach(receipt => {
                    (receipt.items || []).forEach(item => {
                        const receiptCategory = item.category || 'default';
                        const onsCategorySlug = CATEGORY_MAPPING[receiptCategory] || CATEGORY_MAPPING['default'];
                        const normalizedName = normalizeItemName(item.canonical_name || item.name);
                        
                        if (!normalizedName) return;
                        
                        if (!map[onsCategorySlug]) {
                            map[onsCategorySlug] = {};
                        }
                        
                        if (!map[onsCategorySlug][normalizedName]) {
                            map[onsCategorySlug][normalizedName] = { totalPrice: 0, count: 0 };
                        }
                        
                        map[onsCategorySlug][normalizedName].totalPrice += item.total_price || 0;
                        map[onsCategorySlug][normalizedName].count += 1;
                    });
                });
                return map;
            };
            
            const recentItems = buildItemMap(recentReceipts);
            const olderItems = buildItemMap(olderReceipts);
            
            // Calculate like-for-like for each category
            Object.keys(recentItems).forEach(category => {
                if (!olderItems[category]) {
                    categoryResults[category] = { 
                        like_for_like: null, 
                        common_items: 0,
                        is_new_category: true 
                    };
                    return;
                }
                
                let weightedPriceChange = 0;
                let totalWeight = 0;
                let commonItemsCount = 0;
                
                Object.keys(recentItems[category]).forEach(itemName => {
                    if (olderItems[category][itemName]) {
                        const recentAvg = recentItems[category][itemName].totalPrice / recentItems[category][itemName].count;
                        const olderAvg = olderItems[category][itemName].totalPrice / olderItems[category][itemName].count;
                        
                        if (olderAvg > 0) {
                            const priceChange = (recentAvg - olderAvg) / olderAvg;
                            const weight = recentItems[category][itemName].totalPrice;
                            
                            weightedPriceChange += priceChange * weight;
                            totalWeight += weight;
                            commonItemsCount++;
                        }
                    }
                });
                
                const likeForLikeRate = totalWeight > 0 
                    ? (weightedPriceChange / totalWeight) * 100 
                    : null;
                
                categoryResults[category] = {
                    like_for_like: likeForLikeRate !== null ? parseFloat(likeForLikeRate.toFixed(2)) : null,
                    common_items: commonItemsCount,
                    is_new_category: false
                };
            });
            
            return categoryResults;
        };

        // Calculate personal inflation for multiple periods (1, 3, 6, 12 months)
        const calculatePersonalInflationForPeriod = (monthsBack) => {
            const periodStart = new Date();
            periodStart.setMonth(periodStart.getMonth() - monthsBack);
            const periodStartDate = periodStart.toISOString().split('T')[0];
            
            const previousPeriodStart = new Date();
            previousPeriodStart.setMonth(previousPeriodStart.getMonth() - (monthsBack * 2));
            const previousPeriodStartDate = previousPeriodStart.toISOString().split('T')[0];
            
            const recentPeriodReceipts = receipts.filter(r => 
                r.purchase_date >= periodStartDate
            );
            const olderPeriodReceipts = receipts.filter(r => 
                r.purchase_date >= previousPeriodStartDate && r.purchase_date < periodStartDate
            );
            
            if (recentPeriodReceipts.length === 0 || olderPeriodReceipts.length === 0) {
                return { by_category: {}, overall: null, hasPersonalData: false };
            }
            
            const recentPeriodSpending = aggregateByCategory(recentPeriodReceipts);
            const olderPeriodSpending = aggregateByCategory(olderPeriodReceipts);
            
            const periodInflation = {};
            let totalRecentSpendPeriod = 0;
            let totalOlderSpendPeriod = 0;
            
            // Populate category inflation using mapped ONS slugs
            Object.keys(recentPeriodSpending).forEach(category => {
                const recentAvg = recentPeriodSpending[category].total / recentPeriodSpending[category].count;
                const olderAvg = olderPeriodSpending[category] 
                    ? olderPeriodSpending[category].total / olderPeriodSpending[category].count 
                    : null;
                
                if (olderAvg && olderAvg > 0) {
                    const inflationRate = ((recentAvg - olderAvg) / olderAvg) * 100;
                    periodInflation[category] = parseFloat(inflationRate.toFixed(2));
                    
                    totalRecentSpendPeriod += recentPeriodSpending[category].total;
                    totalOlderSpendPeriod += olderPeriodSpending[category].total;
                } else {
                    periodInflation[category] = null;
                }
            });
            
            const overallRate = totalOlderSpendPeriod > 0
                ? parseFloat((((totalRecentSpendPeriod - totalOlderSpendPeriod) / totalOlderSpendPeriod) * 100).toFixed(2))
                : null;
            
            // Explicitly add an 'overall' entry to periodInflation.by_category
            if (overallRate !== null) {
                periodInflation['overall'] = overallRate;
            }

            return { by_category: periodInflation, overall: overallRate, hasPersonalData: true };
        };

        const personalInflation = {
            '1_month': calculatePersonalInflationForPeriod(1),
            '3_month': calculatePersonalInflationForPeriod(3),
            '6_month': calculatePersonalInflationForPeriod(6),
            '12_month': calculatePersonalInflationForPeriod(12)
        };

        // Calculate like-for-like inflation for all periods
        const calculateLikeForLikeForPeriod = (monthsBack) => {
            const periodStart = new Date();
            periodStart.setMonth(periodStart.getMonth() - monthsBack);
            const periodStartDate = periodStart.toISOString().split('T')[0];
            
            const previousPeriodStart = new Date();
            previousPeriodStart.setMonth(previousPeriodStart.getMonth() - (monthsBack * 2));
            const previousPeriodStartDate = previousPeriodStart.toISOString().split('T')[0];
            
            const recentPeriodReceipts = receipts.filter(r => 
                r.purchase_date >= periodStartDate
            );
            const olderPeriodReceipts = receipts.filter(r => 
                r.purchase_date >= previousPeriodStartDate && r.purchase_date < periodStartDate
            );
            
            if (recentPeriodReceipts.length === 0 || olderPeriodReceipts.length === 0) {
                return {};
            }
            
            return calculateLikeForLikeInflation(recentPeriodReceipts, olderPeriodReceipts);
        };

        const likeForLikeInflation = {
            '1_month': calculateLikeForLikeForPeriod(1),
            '3_month': calculateLikeForLikeForPeriod(3),
            '6_month': calculateLikeForLikeForPeriod(6),
            '12_month': calculateLikeForLikeForPeriod(12)
        };

        // Fetch official inflation data for user's country
        // (officialMappings is fetched but not directly used in this version due to direct category slug mapping)
        const officialMappings = await base44.entities.OfficialCategoryMapping.filter({
            country_code: userCountry.country_code,
            statistical_source: userCountry.statistical_source
        });

        // --- IN-MEMORY PROCESSING STRATEGY ---
        // Fetch all relevant inflation data for the user's country (limit 1000 to catch last ~4 years of 20 categories)
        // This avoids DB query date matching issues by doing logic in memory.
        const allInflationData = await base44.entities.InflationData.filter({
            country_code: userCountry.country_code,
            statistical_source: userCountry.statistical_source
        }, "-period_date", 1000);

        // Create a lookup map: "YYYY-MM-01|category_slug" -> index_value
        const inflationMap = new Map();
        allInflationData.forEach(record => {
            // Standardize date to YYYY-MM-01
            // Handle potential full ISO strings by taking first 7 chars
            if (record.period_date) {
                const dateStr = record.period_date.substring(0, 7) + "-01"; 
                const key = `${dateStr}|${record.category_slug}`;
                inflationMap.set(key, record.index_value);
            }
        });

        // Determine the latest available date from the fetched data
        let anchorDateStr = null;
        if (allInflationData.length > 0) {
            // Since we sorted by -period_date, the first one is the latest
            // record.period_date is likely "YYYY-MM-DD" or ISO
            anchorDateStr = allInflationData[0].period_date.substring(0, 7) + "-01";
        } else {
             // Fallback to last month if no data found
             const today = new Date();
             const y = today.getFullYear();
             const m = today.getMonth(); // 0-11. If 0 (Jan), prev month is Dec (12) of prev year
             const prevY = m === 0 ? y - 1 : y;
             const prevM = m === 0 ? 12 : m;
             anchorDateStr = `${prevY}-${prevM.toString().padStart(2, '0')}-01`;
        }
        
        // Helper for robust date math on "YYYY-MM-01" strings
        const shiftMonth = (dateStr, monthsToSubtract) => {
            const parts = dateStr.split('-');
            let year = parseInt(parts[0], 10);
            let month = parseInt(parts[1], 10);
            
            let totalMonths = year * 12 + (month - 1);
            totalMonths -= monthsToSubtract;
            
            const newYear = Math.floor(totalMonths / 12);
            const newMonth = (totalMonths % 12) + 1;
            
            return `${newYear}-${newMonth.toString().padStart(2, '0')}-01`;
        };

        const currentMonthStr = anchorDateStr;
        const oneMonthAgoStr = shiftMonth(anchorDateStr, 1);
        const threeMonthsAgoStr = shiftMonth(anchorDateStr, 3);
        const sixMonthsAgoStr = shiftMonth(anchorDateStr, 6);
        const twelveMonthsAgoStr = shiftMonth(anchorDateStr, 12);

        // Helper to extract indices for a specific date string from our map
        const getIndicesFromMap = (targetDateStr) => {
            const indices = {};
            // We need to know which categories exist. 
            // Let's iterate the map keys or we can iterate the unique categories found in the data.
            // A more efficient way: Iterate all entries in map, if date matches, add to result.
            for (const [key, value] of inflationMap.entries()) {
                const [datePart, categoryPart] = key.split('|');
                if (datePart === targetDateStr) {
                    indices[categoryPart] = value;
                }
            }
            return indices;
        };

        const currentIndices = getIndicesFromMap(currentMonthStr);
        const oneMonthIndices = getIndicesFromMap(oneMonthAgoStr);
        const threeMonthIndices = getIndicesFromMap(threeMonthsAgoStr);
        const sixMonthIndices = getIndicesFromMap(sixMonthsAgoStr);
        const twelveMonthIndices = getIndicesFromMap(twelveMonthsAgoStr);

        // Calculate official inflation for all periods
        const calculateInflationRate = (currentIndex, previousIndex) => {
            if (!currentIndex || !previousIndex || previousIndex === 0) return null;
            return parseFloat((((currentIndex - previousIndex) / previousIndex) * 100).toFixed(2));
        };

        const officialInflation = {
            '1_month': {},
            '3_month': {},
            '6_month': {},
            '12_month': {}
        };

        // Get all categories from current indices (which are ONS category slugs)
        const allOfficialCategories = new Set(Object.keys(currentIndices));

        allOfficialCategories.forEach(category => {
            officialInflation['1_month'][category] = calculateInflationRate(
                currentIndices[category],
                oneMonthIndices[category]
            );
            officialInflation['3_month'][category] = calculateInflationRate(
                currentIndices[category],
                threeMonthIndices[category]
            );
            officialInflation['6_month'][category] = calculateInflationRate(
                currentIndices[category],
                sixMonthIndices[category]
            );
            officialInflation['12_month'][category] = calculateInflationRate(
                currentIndices[category],
                twelveMonthIndices[category]
            );
        });

        // Calculate overall official rates
        const calculateOverallRate = (periodData) => {
            const validRates = Object.values(periodData).filter(r => r !== null);
            if (validRates.length === 0) return null;
            return parseFloat((validRates.reduce((sum, r) => sum + r, 0) / validRates.length).toFixed(2));
        };

        const overallOfficialRates = {
            '1_month': calculateOverallRate(officialInflation['1_month']),
            '3_month': calculateOverallRate(officialInflation['3_month']),
            '6_month': calculateOverallRate(officialInflation['6_month']),
            '12_month': calculateOverallRate(officialInflation['12_month'])
        };

        // Create multi-period comparison with like-for-like data
        const createComparisonForPeriod = (periodKey) => {
            const personal = personalInflation[periodKey];
            const official = officialInflation[periodKey];
            const likeForLike = likeForLikeInflation[periodKey];
            
            // Always return comparison if we have official data, even if personal data is missing
            if (!official || Object.keys(official).length === 0) return null;
            
            const categoryComparison = {};
            // Combine all categories that appear in either personal or official data
            const allComparisonCategories = new Set([
                ...Object.keys(personal?.by_category || {}),
                ...Object.keys(official || {}),
                ...Object.keys(likeForLike || {})
            ]);
            
            allComparisonCategories.forEach(category => {
                const personalRate = personal?.by_category?.[category];
                const officialRate = official[category];
                const likeForLikeData = likeForLike?.[category];
                const likeForLikeRate = likeForLikeData?.like_for_like;
                
                // Calculate volume effect
                const volumeEffect = (typeof personalRate === 'number' && typeof likeForLikeRate === 'number')
                    ? parseFloat((personalRate - likeForLikeRate).toFixed(2))
                    : null;
                
                // Determine primary driver
                let primaryDriver = '⚖️ Balanced';
                if (volumeEffect !== null && Math.abs(volumeEffect) > 50) {
                    primaryDriver = volumeEffect > 0 ? '🛒 You bought more' : '🛒 You bought less';
                } else if (typeof likeForLikeRate === 'number' && typeof officialRate === 'number') {
                    const priceGap = likeForLikeRate - officialRate;
                    if (priceGap > 20) {
                        primaryDriver = '💰 Price spike';
                    } else if (priceGap < -20) {
                        primaryDriver = '💡 Smart shopping';
                    }
                }
                
                // Handle new categories
                if (likeForLikeData?.is_new_category) {
                    primaryDriver = '🆕 New category';
                }
                
                const variance = (typeof personalRate === 'number' && typeof officialRate === 'number')
                    ? parseFloat((personalRate - officialRate).toFixed(2))
                    : null;
                
                categoryComparison[category] = {
                    personal_rate: typeof personalRate === 'number' ? personalRate : null,
                    like_for_like: likeForLikeRate,
                    official_rate: typeof officialRate === 'number' ? officialRate : null,
                    volume_effect: volumeEffect,
                    primary_driver: primaryDriver,
                    common_items: likeForLikeData?.common_items || 0,
                    variance: variance,
                    is_significant: variance !== null && Math.abs(variance) > 5
                };
            });
            
            const overallPersonalRate = personal?.overall || null;
            const overallOfficialRate = overallOfficialRates[periodKey];
            
            const overallVariance = (typeof overallPersonalRate === 'number' && typeof overallOfficialRate === 'number')
                ? parseFloat((overallPersonalRate - overallOfficialRate).toFixed(2))
                : null;
            
            return {
                overall: {
                    personal_rate: overallPersonalRate,
                    official_rate: overallOfficialRate,
                    variance: overallVariance,
                    is_significant: overallVariance !== null && Math.abs(overallVariance) > 5
                },
                by_category: categoryComparison
            };
        };

        const comparison = {
            '1_month': createComparisonForPeriod('1_month'),
            '3_month': createComparisonForPeriod('3_month'),
            '6_month': createComparisonForPeriod('6_month'),
            '12_month': createComparisonForPeriod('12_month')
        };

        // Determine most relevant period based on shopping frequency
        let mostRelevantPeriod = '1_month';
        if (user.shopping_frequency === 'weekly') {
            mostRelevantPeriod = '1_month';
        } else if (user.shopping_frequency === 'biweekly') {
            mostRelevantPeriod = '3_month';
        } else if (user.shopping_frequency === 'monthly') {
            mostRelevantPeriod = '6_month';
        }

        return Response.json({
            success: true,
            user_country: {
                country_code: userCountry.country_code,
                statistical_source: userCountry.statistical_source
            },
            period: {
                analysis_date: new Date().toISOString().split('T')[0],
                receipts_analyzed: receipts.length
            },
            personal_inflation: personalInflation,
            official_inflation: officialInflation,
            comparison: comparison,
            most_relevant_period: mostRelevantPeriod,
            insights_summary: {
                periods_with_data: Object.keys(comparison).filter(k => comparison[k] !== null).length,
                recommended_period: mostRelevantPeriod
            }
        });

    } catch (error) {
        console.error('Error in getInflationComparison:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});
