import { isWithinInterval } from "date-fns";

const CATEGORY_MAP = {
    hot_beverages: 'hot_beverages',
    fruit: 'fruit',
    vegetables: 'vegetables',
    meat_poultry: 'meat_fish',
    fish_seafood: 'meat_fish',
    dairy_eggs: 'dairy_eggs',
    bakery_grains: 'bakery_grains',
    oils_fats: 'oils_fats',
    sweet_treats: 'sweet_treats',
    pantry_staples: 'pantry_staples',
    soft_drinks: 'soft_drinks',
    ready_meals: 'ready_meals',
    alcohol: 'alcohol',
    other_food: 'other_food',
};

/**
 * Identifies staple items per category based on purchase frequency
 */
function identifyStapleItemsByCategory(receipts, lookbackMonths = 6) {
    const staplesByCategory = {};
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);
    
    const itemFrequency = {};
    
    receipts.forEach(receipt => {
        const receiptDate = new Date(receipt.purchase_date);
        if (receiptDate < cutoffDate) return;
        
        (receipt.items || []).forEach(item => {
            const canonicalName = (item.canonical_name || item.name || '').toLowerCase().trim();
            const category = CATEGORY_MAP[item.category] || item.category || 'other_food';
            
            if (!canonicalName) return;
            
            const key = `${category}::${canonicalName}`;
            if (!itemFrequency[key]) {
                itemFrequency[key] = { 
                    category, 
                    name: item.canonical_name || item.name,
                    count: 0 
                };
            }
            itemFrequency[key].count++;
        });
    });
    
    // An item is considered a staple if purchased at least 3 times in the lookback period
    Object.values(itemFrequency).forEach(item => {
        if (item.count >= 3) {
            if (!staplesByCategory[item.category]) {
                staplesByCategory[item.category] = [];
            }
            staplesByCategory[item.category].push(item.name);
        }
    });
    
    return staplesByCategory;
}

/**
 * Calculates metrics for items in a specific period
 */
function calculateCategoryMetrics(receipts, period, staplesByCategory) {
    const categoryMetrics = {};
    
    if (!period || !period.from || !period.to) return categoryMetrics;
    
    receipts.forEach(receipt => {
        const receiptDate = new Date(receipt.purchase_date);
        if (!isWithinInterval(receiptDate, { start: period.from, end: period.to })) return;
        
        (receipt.items || []).forEach(item => {
            const category = CATEGORY_MAP[item.category] || item.category || 'other_food';
            const canonicalName = (item.canonical_name || item.name || '').toLowerCase().trim();
            const isStaple = staplesByCategory[category]?.some(s => s.toLowerCase() === canonicalName);
            
            if (!categoryMetrics[category]) {
                categoryMetrics[category] = {
                    totalSpend: 0,
                    stapleItems: {},
                    allItems: []
                };
            }
            
            const totalPrice = parseFloat(item.total_price) || 0;
            const quantity = Math.max(1, parseInt(item.quantity) || 1);
            const pricePerUnit = totalPrice > 0 && quantity > 0 ? totalPrice / quantity : (parseFloat(item.price_per_unit) || 0);
            
            categoryMetrics[category].totalSpend += totalPrice;
            categoryMetrics[category].allItems.push({
                name: canonicalName,
                quantity,
                totalPrice,
                pricePerUnit,
                isStaple
            });
            
            // Track staple items separately for price comparison
            if (isStaple && pricePerUnit > 0) {
                if (!categoryMetrics[category].stapleItems[canonicalName]) {
                    categoryMetrics[category].stapleItems[canonicalName] = {
                        quantities: [],
                        prices: [],
                        totalSpend: 0
                    };
                }
                categoryMetrics[category].stapleItems[canonicalName].quantities.push(quantity);
                categoryMetrics[category].stapleItems[canonicalName].prices.push(pricePerUnit);
                categoryMetrics[category].stapleItems[canonicalName].totalSpend += totalPrice;
            }
        });
    });
    
    // Calculate averages for staple items
    Object.keys(categoryMetrics).forEach(category => {
        Object.keys(categoryMetrics[category].stapleItems).forEach(itemName => {
            const item = categoryMetrics[category].stapleItems[itemName];
            item.avgPrice = item.prices.reduce((sum, p) => sum + p, 0) / item.prices.length;
            item.totalQuantity = item.quantities.reduce((sum, q) => sum + q, 0);
        });
    });
    
    return categoryMetrics;
}

/**
 * Determines the driver of change for a category
 */
function determineDriver(priceChange, volumeChange, quality) {
    if (quality === 'insufficient') return 'insufficient';
    if (priceChange === null && volumeChange === null) return 'new_category';
    
    const priceThreshold = 5; // 5% threshold for significant price change
    const volumeThreshold = 10; // 10% threshold for significant volume change
    
    const priceSignificant = priceChange !== null && Math.abs(priceChange) >= priceThreshold;
    const volumeSignificant = volumeChange !== null && Math.abs(volumeChange) >= volumeThreshold;
    
    if (priceSignificant && volumeSignificant) return 'mixed';
    if (priceSignificant) return 'price_driven';
    if (volumeSignificant) return 'volume_driven';
    
    return 'mixed'; // Both contributed but neither dominates
}

/**
 * Determines data quality based on number of staple items
 */
function determineQuality(stapleItemCount) {
    if (stapleItemCount >= 4) return 'high';
    if (stapleItemCount >= 2) return 'medium';
    if (stapleItemCount >= 1) return 'low';
    return 'insufficient';
}

/**
 * Main function to calculate enhanced category inflation
 */
export function calculateEnhancedCategoryInflation(receipts, comparisonPeriods, inflationData) {
    if (!receipts || receipts.length === 0 || !comparisonPeriods.current || !comparisonPeriods.comparison) {
        return {};
    }
    
    const { current, comparison } = comparisonPeriods;
    
    // Identify staple items across all categories
    const staplesByCategory = identifyStapleItemsByCategory(receipts, 6);
    
    // Calculate metrics for both periods
    const currentMetrics = calculateCategoryMetrics(receipts, current, staplesByCategory);
    const comparisonMetrics = calculateCategoryMetrics(receipts, comparison, staplesByCategory);
    
    const categoryData = {};
    const allCategories = new Set([...Object.keys(currentMetrics), ...Object.keys(comparisonMetrics)]);
    
    allCategories.forEach(category => {
        const curr = currentMetrics[category];
        const comp = comparisonMetrics[category];
        
        // Calculate spend change
        const spendChange = (curr && comp && comp.totalSpend > 0) 
            ? ((curr.totalSpend - comp.totalSpend) / comp.totalSpend) * 100
            : null;
        
        // Calculate price change (for staple items only)
        let priceChange = null;
        let stapleItemCount = 0;
        
        if (curr && comp) {
            const commonStaples = Object.keys(curr.stapleItems).filter(item => 
                comp.stapleItems[item] && 
                curr.stapleItems[item].avgPrice > 0 && 
                comp.stapleItems[item].avgPrice > 0
            );
            
            if (commonStaples.length > 0) {
                stapleItemCount = commonStaples.length;
                const totalPriceChange = commonStaples.reduce((sum, item) => {
                    const currPrice = curr.stapleItems[item].avgPrice;
                    const compPrice = comp.stapleItems[item].avgPrice;
                    return sum + ((currPrice - compPrice) / compPrice);
                }, 0);
                priceChange = (totalPriceChange / commonStaples.length) * 100;
            }
        }
        
        // Calculate volume change (total quantity across all items, normalized)
        let volumeChange = null;
        if (curr && comp) {
            const currVolume = curr.allItems.reduce((sum, item) => sum + item.quantity, 0);
            const compVolume = comp.allItems.reduce((sum, item) => sum + item.quantity, 0);
            if (compVolume > 0) {
                volumeChange = ((currVolume - compVolume) / compVolume) * 100;
            }
        }
        
        // Determine quality and driver
        const quality = determineQuality(stapleItemCount);
        const driver = determineDriver(priceChange, volumeChange, quality);
        
        // Get official inflation if available
        const officialInflation = inflationData?.comparison?.[category]?.official_rate || null;
        
        categoryData[category] = {
            spendChange,
            priceChange,
            volumeChange,
            stapleItemCount,
            quality,
            driver,
            officialInflation
        };
    });
    
    return categoryData;
}

/**
 * Generate prompt for LLM interpretation
 */
export function generateLLMInterpretationPrompt(categoryData, userCurrency = 'GBP') {
    const categories = Object.entries(categoryData)
        .filter(([cat]) => cat !== 'overall')
        .map(([category, data]) => ({
            category: category.replace(/_/g, ' '),
            ...data
        }));
    
    const prompt = `You are analyzing a user's grocery spending patterns. Below is their category-level inflation data comparing two time periods:

${categories.map(cat => `
Category: ${cat.category}
- Total Spend Change: ${cat.spendChange !== null ? `${cat.spendChange > 0 ? '+' : ''}${cat.spendChange.toFixed(1)}%` : 'N/A'}
- Price Change (staple items): ${cat.priceChange !== null ? `${cat.priceChange > 0 ? '+' : ''}${cat.priceChange.toFixed(1)}%` : 'N/A'}
- Volume Change: ${cat.volumeChange !== null ? `${cat.volumeChange > 0 ? '+' : ''}${cat.volumeChange.toFixed(1)}%` : 'N/A'}
- Driver: ${cat.driver}
- Data Quality: ${cat.quality}
- Official Inflation: ${cat.officialInflation !== null ? `${cat.officialInflation > 0 ? '+' : ''}${cat.officialInflation.toFixed(1)}%` : 'N/A'}
`).join('\n')}

Provide a concise, user-friendly interpretation (max 150 words) that:
1. Highlights the top 2-3 most interesting insights
2. Explains whether spending changes are driven by prices or behaviour
3. Compares personal inflation to official rates where relevant
4. Provides one actionable recommendation

Write in a friendly, non-technical tone.`;

    return prompt;
}