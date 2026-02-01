/**
 * Normalizes supermarket/store names to a consistent format for analytics.
 * This handles common variations in casing, spacing, and naming.
 */

const STORE_MAPPINGS = {
    // Aldi variations
    'aldi': 'Aldi',
    'aldi stores': 'Aldi',
    'aldi uk': 'Aldi',
    
    // Tesco variations
    'tesco': 'Tesco',
    'tesco stores': 'Tesco',
    'tesco express': 'Tesco Express',
    'tesco extra': 'Tesco Extra',
    'tesco metro': 'Tesco Metro',
    
    // Sainsbury's variations
    'sainsburys': "Sainsbury's",
    'sainsbury': "Sainsbury's",
    "sainsbury's": "Sainsbury's",
    'sainsburys local': "Sainsbury's Local",
    "sainsbury's local": "Sainsbury's Local",
    
    // Asda variations
    'asda': 'Asda',
    'asda stores': 'Asda',
    
    // Morrisons variations
    'morrisons': 'Morrisons',
    'morrison': 'Morrisons',
    'morrisons daily': 'Morrisons Daily',
    
    // Lidl variations
    'lidl': 'Lidl',
    'lidl uk': 'Lidl',
    
    // Waitrose variations
    'waitrose': 'Waitrose',
    'waitrose & partners': 'Waitrose',
    'waitrose and partners': 'Waitrose',
    
    // Co-op variations
    'co-op': 'Co-op',
    'coop': 'Co-op',
    'co op': 'Co-op',
    'cooperative': 'Co-op',
    'the co-operative': 'Co-op',
    
    // M&S variations
    'm&s': 'M&S',
    'marks & spencer': 'M&S',
    'marks and spencer': 'M&S',
    'marks & spencers': 'M&S',
    'marks and spencers': 'M&S',
    'marks&spencer': 'M&S',
    'm & s': 'M&S',
    
    // Iceland variations
    'iceland': 'Iceland',
    'iceland foods': 'Iceland',
    
    // Costco variations
    'costco': 'Costco',
    'costco wholesale': 'Costco',
    
    // Other common stores
    'farmfoods': 'Farmfoods',
    'farm foods': 'Farmfoods',
    'poundland': 'Poundland',
    'b&m': 'B&M',
    'home bargains': 'Home Bargains',
    'heron foods': 'Heron Foods',
};

/**
 * Normalizes a store name to a consistent format.
 * @param {string} storeName - The original store name from the receipt
 * @returns {string} - The normalized store name
 */
export const normalizeStoreName = (storeName) => {
    if (!storeName || typeof storeName !== 'string') {
        return 'Unknown';
    }
    
    // Convert to lowercase for matching
    const lowerName = storeName.toLowerCase().trim();
    
    // Check if we have a direct mapping
    if (STORE_MAPPINGS[lowerName]) {
        return STORE_MAPPINGS[lowerName];
    }
    
    // Check for partial matches (e.g., "TESCO EXTRA" should match "tesco")
    for (const [key, value] of Object.entries(STORE_MAPPINGS)) {
        if (lowerName.includes(key)) {
            return value;
        }
    }
    
    // If no match found, return title-cased version of original
    // (capitalize first letter of each word)
    return storeName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

/**
 * Groups receipts by normalized store name and returns aggregated data.
 * @param {Array} receipts - Array of receipt objects
 * @returns {Object} - Object with normalized store names as keys and aggregated data
 */
export const groupReceiptsByNormalizedStore = (receipts) => {
    if (!receipts || receipts.length === 0) return {};
    
    const grouped = {};
    
    receipts.forEach(receipt => {
        const normalizedStore = normalizeStoreName(receipt.supermarket);
        
        if (!grouped[normalizedStore]) {
            grouped[normalizedStore] = {
                storeName: normalizedStore,
                receipts: [],
                totalSpend: 0,
                receiptCount: 0
            };
        }
        
        grouped[normalizedStore].receipts.push(receipt);
        grouped[normalizedStore].totalSpend += receipt.total_amount || 0;
        grouped[normalizedStore].receiptCount += 1;
    });
    
    return grouped;
};