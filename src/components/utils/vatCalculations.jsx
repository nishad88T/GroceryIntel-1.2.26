/**
 * UK VAT rates and category mappings for grocery items
 */

export const VAT_RATES = {
    ZERO: 0,      // Zero-rated
    REDUCED: 5,   // Reduced rate
    STANDARD: 20  // Standard rate
};

/**
 * Maps grocery categories to their typical VAT rates in the UK
 * Most basic food items are zero-rated, but some are standard-rated
 */
export const CATEGORY_VAT_MAPPING = {
    'meat_fish': VAT_RATES.ZERO,
    'vegetables_fruits': VAT_RATES.ZERO,
    'dairy_eggs': VAT_RATES.ZERO,
    'bakery': VAT_RATES.ZERO,
    'snacks_sweets': VAT_RATES.STANDARD,  // Confectionery is standard-rated
    'beverages': VAT_RATES.STANDARD,       // Most drinks except milk are standard-rated
    'household_cleaning': VAT_RATES.STANDARD,
    'personal_care': VAT_RATES.STANDARD,
    'frozen_foods': VAT_RATES.ZERO,       // Most frozen food is zero-rated
    'pantry_staples': VAT_RATES.ZERO,
    'other': VAT_RATES.ZERO
};

/**
 * Determines the VAT rate for an item based on its category
 * @param {string} category - The item category
 * @returns {number} - The VAT rate percentage (0, 5, or 20)
 */
export const getVATRateForCategory = (category) => {
    return CATEGORY_VAT_MAPPING[category] || VAT_RATES.ZERO;
};

/**
 * Calculates the VAT amount from a price that includes VAT
 * @param {number} priceIncVAT - Price including VAT
 * @param {number} vatRate - VAT rate percentage (e.g., 20 for 20%)
 * @returns {number} - The VAT amount
 */
export const calculateVATFromInclusivePrice = (priceIncVAT, vatRate) => {
    if (vatRate === 0) return 0;
    return priceIncVAT - (priceIncVAT / (1 + vatRate / 100));
};

/**
 * Calculates the price excluding VAT from a price that includes VAT
 * @param {number} priceIncVAT - Price including VAT
 * @param {number} vatRate - VAT rate percentage
 * @returns {number} - The price excluding VAT
 */
export const calculatePriceExVAT = (priceIncVAT, vatRate) => {
    if (vatRate === 0) return priceIncVAT;
    return priceIncVAT / (1 + vatRate / 100);
};

/**
 * Calculates VAT for all items in a receipt
 * @param {Array} items - Array of receipt items
 * @returns {Object} - Object containing total VAT, items with VAT, and VAT breakdown by rate
 */
export const calculateReceiptVAT = (items) => {
    if (!items || items.length === 0) {
        return {
            totalVAT: 0,
            itemsWithVAT: [],
            vatBreakdown: {
                zero: { amount: 0, count: 0 },
                reduced: { amount: 0, count: 0 },
                standard: { amount: 0, count: 0 }
            }
        };
    }

    let totalVAT = 0;
    const vatBreakdown = {
        zero: { amount: 0, count: 0 },
        reduced: { amount: 0, count: 0 },
        standard: { amount: 0, count: 0 }
    };

    const itemsWithVAT = items.map(item => {
        const vatRate = item.vat_rate !== undefined ? item.vat_rate : getVATRateForCategory(item.category);
        const vatAmount = calculateVATFromInclusivePrice(item.total_price || 0, vatRate);
        const priceExVAT = (item.total_price || 0) - vatAmount;

        // Update breakdown
        if (vatRate === 0) {
            vatBreakdown.zero.amount += vatAmount;
            vatBreakdown.zero.count += 1;
        } else if (vatRate === 5) {
            vatBreakdown.reduced.amount += vatAmount;
            vatBreakdown.reduced.count += 1;
        } else if (vatRate === 20) {
            vatBreakdown.standard.amount += vatAmount;
            vatBreakdown.standard.count += 1;
        }

        totalVAT += vatAmount;

        return {
            ...item,
            vat_rate: vatRate,
            vat_amount: Math.round(vatAmount * 100) / 100,
            price_ex_vat: Math.round(priceExVAT * 100) / 100
        };
    });

    return {
        totalVAT: Math.round(totalVAT * 100) / 100,
        itemsWithVAT,
        vatBreakdown: {
            zero: { 
                amount: Math.round(vatBreakdown.zero.amount * 100) / 100, 
                count: vatBreakdown.zero.count 
            },
            reduced: { 
                amount: Math.round(vatBreakdown.reduced.amount * 100) / 100, 
                count: vatBreakdown.reduced.count 
            },
            standard: { 
                amount: Math.round(vatBreakdown.standard.amount * 100) / 100, 
                count: vatBreakdown.standard.count 
            }
        }
    };
};

/**
 * Distributes a total VAT amount across items proportionally
 * (Useful for Costco-style receipts where only total VAT is shown)
 * @param {Array} items - Array of receipt items
 * @param {number} totalVATFromReceipt - Total VAT amount shown on receipt
 * @returns {Array} - Items with distributed VAT amounts
 */
export const distributeVATAcrossItems = (items, totalVATFromReceipt) => {
    if (!items || items.length === 0 || !totalVATFromReceipt) {
        return items;
    }

    // Calculate total price of all items
    const totalPrice = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    
    if (totalPrice === 0) return items;

    return items.map(item => {
        const itemProportion = (item.total_price || 0) / totalPrice;
        const itemVATAmount = totalVATFromReceipt * itemProportion;
        const priceExVAT = (item.total_price || 0) - itemVATAmount;
        
        // Calculate effective VAT rate
        const effectiveVATRate = priceExVAT > 0 ? (itemVATAmount / priceExVAT) * 100 : 0;

        return {
            ...item,
            vat_amount: Math.round(itemVATAmount * 100) / 100,
            price_ex_vat: Math.round(priceExVAT * 100) / 100,
            vat_rate: Math.round(effectiveVATRate * 10) / 10,
            vat_distributed: true // Flag to indicate this was distributed, not item-specific
        };
    });
};