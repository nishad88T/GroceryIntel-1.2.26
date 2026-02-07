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

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const householdId = await resolveHouseholdId(base44, user);
        if (!householdId) {
            return Response.json({ error: 'User has no household' }, { status: 400 });
        }

        // Calculate date ranges for current week and previous week
        const now = new Date();
        const currentWeekEnd = new Date(now);
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);

        const previousWeekEnd = new Date(currentWeekStart);
        previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);
        const previousWeekStart = new Date(previousWeekEnd);
        previousWeekStart.setDate(previousWeekStart.getDate() - 7);

        // Fetch current week's receipts
        const currentWeekReceipts = await base44.entities.Receipt.filter({
            household_id: householdId,
            purchase_date: {
                $gte: currentWeekStart.toISOString().split('T')[0],
                $lte: currentWeekEnd.toISOString().split('T')[0]
            }
        });

        // Fetch previous week's receipts for comparison
        const previousWeekReceipts = await base44.entities.Receipt.filter({
            household_id: householdId,
            purchase_date: {
                $gte: previousWeekStart.toISOString().split('T')[0],
                $lte: previousWeekEnd.toISOString().split('T')[0]
            }
        });

        // Calculate current week summary
        const currentSummary = calculateSummary(currentWeekReceipts);
        const previousSummary = calculateSummary(previousWeekReceipts);

        // Calculate week-over-week changes
        const weekOverWeekChange = previousSummary.total_spend > 0
            ? ((currentSummary.total_spend - previousSummary.total_spend) / previousSummary.total_spend) * 100
            : 0;

        // Identify notable changes in categories
        const notableChanges = [];
        Object.keys(currentSummary.category_breakdown).forEach(category => {
            const currentSpend = currentSummary.category_breakdown[category];
            const previousSpend = previousSummary.category_breakdown[category] || 0;
            
            if (previousSpend > 0) {
                const change = ((currentSpend - previousSpend) / previousSpend) * 100;
                if (Math.abs(change) > 20) {
                    notableChanges.push({
                        category,
                        change: parseFloat(change.toFixed(2)),
                        current: currentSpend,
                        previous: previousSpend
                    });
                }
            } else if (currentSpend > 0) {
                notableChanges.push({
                    category,
                    change: 100,
                    current: currentSpend,
                    previous: 0,
                    is_new: true
                });
            }
        });

        // Get inflation comparison snapshot
        let inflationSnapshot = null;
        try {
            const inflationResponse = await base44.functions.invoke('getInflationComparison', {});
            if (inflationResponse.data.success) {
                inflationSnapshot = {
                    overall_variance: inflationResponse.data.comparison?.overall?.variance || 0,
                    categories_above_national: inflationResponse.data.insights_summary?.categories_above_national || 0,
                    highest_variance_category: inflationResponse.data.insights_summary?.highest_variance_category || null
                };
            }
        } catch (error) {
            console.warn('Failed to fetch inflation snapshot:', error);
        }

        // Store or update cache
        const existingCache = await base44.entities.InsightCache.filter({
            user_id: user.id,
            cache_type: 'weekly_summary',
            period_start: currentWeekStart.toISOString().split('T')[0]
        });

        const cacheData = {
            user_id: user.id,
            user_email: user.email,
            household_id: householdId,
            cache_type: 'weekly_summary',
            period_start: currentWeekStart.toISOString().split('T')[0],
            period_end: currentWeekEnd.toISOString().split('T')[0],
            summary_data: {
                total_spend: currentSummary.total_spend,
                receipt_count: currentSummary.receipt_count,
                category_breakdown: currentSummary.category_breakdown,
                top_items: currentSummary.top_items,
                supermarket_breakdown: currentSummary.supermarket_breakdown,
                week_over_week_change: parseFloat(weekOverWeekChange.toFixed(2)),
                notable_changes: notableChanges
            },
            inflation_snapshot: inflationSnapshot,
            last_processed_receipt_date: currentWeekReceipts.length > 0
                ? currentWeekReceipts[currentWeekReceipts.length - 1].purchase_date
                : currentWeekEnd.toISOString()
        };

        let savedCache;
        if (existingCache.length > 0) {
            savedCache = await base44.entities.InsightCache.update(existingCache[0].id, cacheData);
        } else {
            savedCache = await base44.entities.InsightCache.create(cacheData);
        }

        return Response.json({
            success: true,
            message: 'Weekly summary computed and cached successfully',
            cache_id: savedCache.id,
            summary: cacheData.summary_data,
            period: {
                start: cacheData.period_start,
                end: cacheData.period_end
            }
        });

    } catch (error) {
        console.error('Error computing weekly summary:', error);
        return Response.json({
            error: error.message,
            success: false
        }, { status: 500 });
    }
});

function calculateSummary(receipts) {
    const summary = {
        total_spend: 0,
        receipt_count: receipts.length,
        category_breakdown: {},
        top_items: {},
        supermarket_breakdown: {}
    };

    receipts.forEach(receipt => {
        summary.total_spend += receipt.total_amount || 0;

        // Supermarket breakdown
        const store = receipt.supermarket || 'Unknown';
        summary.supermarket_breakdown[store] = (summary.supermarket_breakdown[store] || 0) + (receipt.total_amount || 0);

        // Category and item breakdown
        (receipt.items || []).forEach(item => {
            const category = item.category || 'other_food';
            summary.category_breakdown[category] = (summary.category_breakdown[category] || 0) + (item.total_price || 0);

            // Track top items
            const itemName = item.canonical_name || item.name;
            if (!summary.top_items[itemName]) {
                summary.top_items[itemName] = {
                    name: itemName,
                    total_spend: 0,
                    quantity: 0,
                    category
                };
            }
            summary.top_items[itemName].total_spend += item.total_price || 0;
            summary.top_items[itemName].quantity += item.quantity || 1;
        });
    });

    // Convert top_items to array and sort
    summary.top_items = Object.values(summary.top_items)
        .sort((a, b) => b.total_spend - a.total_spend)
        .slice(0, 10)
        .map(item => ({
            name: item.name,
            total_spend: parseFloat(item.total_spend.toFixed(2)),
            quantity: item.quantity,
            category: item.category
        }));

    return summary;
}
