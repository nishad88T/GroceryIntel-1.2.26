
import { isWithinInterval, parseISO } from "date-fns";

const SIGNIFICANT_PRICE_CHANGE_THRESHOLD = 0.03; // 3%
const SIGNIFICANT_SHRINKFLATION_THRESHOLD = 0.03; // 3%
const CORE_BASKET_HISTORY_MONTHS = 6;
const CORE_BASKET_SIZE = 15;

/**
 * Determines a user's "Core Basket" of most frequently purchased items.
 */
function determineCoreBasket(allItemPurchases, historyMonths, basketSize) {
    const frequencyMap = {};
    const historyCutoff = new Date();
    historyCutoff.setMonth(historyCutoff.getMonth() - historyMonths);

    for (const key in allItemPurchases) {
        const item = allItemPurchases[key];
        const recentPurchases = item.purchases.filter(p => p.date >= historyCutoff);
        if (recentPurchases.length > 1) { // Must be purchased more than once to be considered
            frequencyMap[key] = recentPurchases.length;
        }
    }

    const sortedItems = Object.keys(frequencyMap).sort((a, b) => frequencyMap[b] - frequencyMap[a]);
    console.log(`Core Basket determined from ${sortedItems.length} unique items over ${historyMonths} months.`);
    return sortedItems.slice(0, basketSize);
}


/**
 * Processes receipts to map all purchases for each unique item.
 * This is the foundational data structure for all other analysis.
 */
function processAllItemPurchases(receipts) {
    const itemPurchasesMap = {};
    if (!receipts || receipts.length === 0) return itemPurchasesMap;

    receipts.forEach(receipt => {
        const purchaseDate = new Date(receipt.purchase_date);
        if (isNaN(purchaseDate.getTime())) return;
        
        (receipt.items || []).forEach(item => {
            const canonicalName = item.canonical_name || item.name;
            if (!canonicalName) return;
            
            const key = canonicalName.toLowerCase().trim();
            if (!itemPurchasesMap[key]) {
                itemPurchasesMap[key] = { name: canonicalName, purchases: [] };
            }
            
            const totalPrice = parseFloat(item.total_price) || 0;
            const quantity = Math.max(1, parseInt(item.quantity) || 1);
            const pricePerUnit = totalPrice > 0 && quantity > 0 ? totalPrice / quantity : (parseFloat(item.price_per_unit) || 0);
            
            if (pricePerUnit > 0) {
                itemPurchasesMap[key].purchases.push({
                    date: purchaseDate,
                    store: receipt.supermarket || 'Unknown',
                    pricePerUnit: pricePerUnit,
                    totalPrice: totalPrice,
                    quantity: quantity,
                    packSize: parseFloat(item.pack_size_value) || 1,
                    packUnit: item.pack_size_unit || 'each'
                });
            }
        });
    });
    return itemPurchasesMap;
}

/**
 * Filters the master item purchase map for a specific period.
 */
function getItemsInPeriod(itemPurchasesMap, period) {
    const periodItems = {};
    if (!period || !period.from || !period.to) return periodItems;

    for (const key in itemPurchasesMap) {
        const item = itemPurchasesMap[key];
        const purchasesInPeriod = item.purchases.filter(p => isWithinInterval(p.date, { start: period.from, end: period.to }));
        
        if (purchasesInPeriod.length > 0) {
            periodItems[key] = { ...item, purchases: purchasesInPeriod };
        }
    }
    return periodItems;
}

/**
 * Calculates average price and total spend for items in a given period.
 */
function calculatePeriodMetrics(periodItems) {
    const metrics = {};
    for (const key in periodItems) {
        const item = periodItems[key];
        const totalSpend = item.purchases.reduce((sum, p) => sum + p.totalPrice, 0);
        const totalQuantity = item.purchases.reduce((sum, p) => sum + p.quantity, 0);
        const avgPrice = totalQuantity > 0 ? totalSpend / totalQuantity : 0;
        
        metrics[key] = {
            name: item.name,
            avgPrice: avgPrice,
            totalSpend: totalSpend,
            totalQuantity: totalQuantity,
            purchaseCount: item.purchases.length,
        };
    }
    return metrics;
}

/**
 * Main analysis function called by the UI.
 * Orchestrates all individual insight calculations.
 */
export function analyzeReceiptsForInsights(receipts, budgetPeriods, allBudgets) {
    if (!receipts || receipts.length === 0 || !budgetPeriods.current) {
        return {};
    }

    const { current, previous } = budgetPeriods;
    
    console.log("[Insights] Analyzing with periods:", {
        current: { from: current?.from, to: current?.to },
        previous: { from: previous?.from, to: previous?.to }
    });
    
    const allItemPurchases = processAllItemPurchases(receipts);
    console.log("[Insights] Total unique items found:", Object.keys(allItemPurchases).length);

    // --- CORE BASKET DETERMINATION ---
    const coreBasketKeys = determineCoreBasket(allItemPurchases, CORE_BASKET_HISTORY_MONTHS, CORE_BASKET_SIZE);
    console.log("[Insights] Core Basket Items:", coreBasketKeys.length, coreBasketKeys);

    const currentPeriodItems = getItemsInPeriod(allItemPurchases, current);
    const previousPeriodItems = getItemsInPeriod(allItemPurchases, previous);
    
    console.log("[Insights] Items in current period:", Object.keys(currentPeriodItems).length);
    console.log("[Insights] Items in previous period:", Object.keys(previousPeriodItems).length);

    const currentMetrics = calculatePeriodMetrics(currentPeriodItems);
    const previousMetrics = calculatePeriodMetrics(previousPeriodItems);
    
    // --- INFLATION CALCULATION REFINED WITH CORE BASKET ---
    const basketInflation = calculateBasketInflation(coreBasketKeys, currentMetrics, previousMetrics);
    const budgetProjections = calculateBudgetProjections(allBudgets, basketInflation);

    console.log("[Insights] Calculated basket inflation:", basketInflation);

    return {
        basketInflation: basketInflation,
        budgetProjections: budgetProjections,
    };
}


/**
 * Calculates overall inflation for a common basket of goods.
 * This now returns a detailed object including the item breakdown.
 */
function calculateBasketInflation(coreBasketKeys, currentMetrics, previousMetrics) {
    if (!coreBasketKeys || coreBasketKeys.length === 0) return null;

    let currentBasketCost = 0;
    let previousBasketCost = 0;
    const itemBreakdown = [];

    coreBasketKeys.forEach(key => {
        const current = currentMetrics[key];
        const previous = previousMetrics[key];
        
        // CRITICAL: Only include item if it was purchased in BOTH periods.
        if (current && previous && current.avgPrice > 0 && previous.avgPrice > 0) {
            const quantityInCurrentPeriod = current.totalQuantity;
            
            const currentCost = current.totalSpend;
            const previousEquivalentCost = quantityInCurrentPeriod * previous.avgPrice;
            
            currentBasketCost += currentCost;
            previousBasketCost += previousEquivalentCost;
            
            const itemInflation = (current.avgPrice - previous.avgPrice) / previous.avgPrice;

            itemBreakdown.push({
                name: current.name,
                currentAvgPrice: current.avgPrice,
                comparisonAvgPrice: previous.avgPrice,
                inflation: itemInflation,
                currentSpent: currentCost,
                quantity: quantityInCurrentPeriod
            });
        }
    });

    if (itemBreakdown.length < 3 || previousBasketCost === 0) {
        console.log("[Insights] Not enough common core items for basket inflation:", itemBreakdown.length);
        return null; 
    }

    const inflation = (currentBasketCost - previousBasketCost) / previousBasketCost;
    console.log(`[Insights] Final basket inflation: ${(inflation * 100).toFixed(2)}% based on ${itemBreakdown.length} items`);
    
    return {
        value: inflation,
        basketSize: itemBreakdown.length,
        itemBreakdown: itemBreakdown.sort((a, b) => b.inflation - a.inflation),
        currentBasketCost,
        comparisonBasketCost: previousBasketCost
    };
}

/**
 * Calculates budget projections based on historical data.
 */
function calculateBudgetProjections(allBudgets, basketInflation) {
    const activeBudget = allBudgets.find(b => b.is_active);
    const completedBudgets = allBudgets.filter(b => !b.is_active && new Date(b.period_end) < new Date());

    if (!activeBudget || !basketInflation || completedBudgets.length < 1) return null;

    // Suggest next budget based on inflation
    const suggestedNextBudget = activeBudget.amount * (1 + basketInflation.value);

    // Project yearly overspend
    // Take the last 3 completed budgets (or fewer if not available)
    const recentCompletedBudgets = completedBudgets.slice(-3); 
    const totalOverspend = recentCompletedBudgets
        .reduce((sum, b) => sum + ( (b.total_spend || 0) - (b.amount || 0) ), 0);
        
    const avgOverspend = recentCompletedBudgets.length > 0 ? totalOverspend / recentCompletedBudgets.length : 0;
        
    const projectedYearlyOverspend = avgOverspend > 0 ? avgOverspend * 12 : 0; // Only project if there's an actual overspend

    return {
        nextBudgetSuggestion: suggestedNextBudget,
        yearlyOverspendProjection: projectedYearlyOverspend,
    };
}
