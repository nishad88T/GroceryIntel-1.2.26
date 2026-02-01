// Comprehensive aisle order mapping for supermarket layout
// Lower numbers = earlier in shopping journey (e.g., produce first)

export const CATEGORY_TO_AISLE_ORDER = {
    'fruit': 10,
    'vegetables': 15,
    'meat_poultry': 20,
    'fish_seafood': 25,
    'dairy_eggs': 30,
    'bakery_grains': 40,
    'oils_fats': 50,
    'pantry_staples': 55,
    'sweet_treats': 60,
    'ready_meals': 70,
    'hot_beverages': 80,
    'soft_drinks': 85,
    'alcohol': 90,
    'household_cleaning': 100,
    'toiletries': 105,
    'health_beauty': 110,
    'pet_care': 115,
    'baby_care': 120,
    'other_food': 125,
    'other_non_food': 130,
};

export const SPICE_KEYWORDS = [
    'spice', 'herb', 'salt', 'pepper', 'cumin', 'coriander', 
    'turmeric', 'paprika', 'oregano', 'basil', 'thyme', 
    'rosemary', 'cinnamon', 'ginger', 'garlic powder', 
    'onion powder', 'chili', 'cayenne', 'bay leaf', 'nutmeg',
    'cloves', 'cardamom', 'sage', 'parsley', 'dill', 'mint'
];

// Keywords to help identify specific categories
const CATEGORY_KEYWORDS = {
    'fruit': [
        'apple', 'banana', 'orange', 'grape', 'strawberry', 'blueberry', 'lemon', 'lime',
        'pear', 'peach', 'plum', 'cherry', 'avocado', 'kiwi', 'mango', 'pineapple', 'berry', 'fruit'
    ],
    'vegetables': [
        'carrot', 'onion', 'potato', 'tomato', 'lettuce', 'cucumber', 'pepper', 'broccoli',
        'cauliflower', 'spinach', 'cabbage', 'mushroom', 'garlic', 'celery', 'leek', 'vegetable', 'salad'
    ],
    'meat_poultry': [
        'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'sausage', 'ham', 'steak', 'mince', 'meat', 'poultry', 'bacon', 'pepperoni', 'meatball'
    ],
    'fish_seafood': [
        'fish', 'salmon', 'tuna', 'cod', 'prawns', 'shrimp', 'seafood'
    ],
    'dairy_eggs': [
        'milk', 'cheese', 'butter', 'yogurt', 'cream', 'egg', 'yoghurt', 'cheddar',
        'mozzarella', 'parmesan', 'dairy'
    ],
    'bakery_grains': [
        'bread', 'roll', 'baguette', 'croissant', 'bagel', 'muffin', 'cake', 'pastry',
        'bun', 'loaf', 'tortilla', 'wrap', 'pita', 'naan', 'cereal', 'oats', 'grains'
    ],
    'oils_fats': [
        'oil', 'butter', 'margarine', 'fat', 'ghee'
    ],
    'sweet_treats': [
        'chocolate', 'candy', 'sweet', 'biscuit', 'cookie', 'bar', 'dessert', 'cake', 'ice cream'
    ],
    'pantry_staples': [
        'rice', 'pasta', 'flour', 'sugar', 'vinegar', 'sauce', 'stock',
        'tin', 'can', 'jar', 'beans', 'lentils', 'chickpeas',
        'tomato paste', 'ketchup', 'mayonnaise', 'mustard', 'honey', 'jam', 'condiment'
    ],
    'soft_drinks': [
        'water', 'juice', 'soda', 'drink', 'cola', 'lemonade', 'squash', 'fizzy', 'spring'
    ],
    'hot_beverages': [
        'coffee', 'tea', 'hot chocolate', 'cocoa'
    ],
    'ready_meals': [
        'pizza', 'lasagna', 'curry', 'sandwich', 'ready meal'
    ],
    'alcohol': [
        'beer', 'wine', 'spirit', 'cider', 'alcohol'
    ],
    'household_cleaning': [
        'detergent', 'soap', 'cleaner', 'bleach', 'disinfectant', 'sponge',
        'tissue', 'toilet paper', 'kitchen roll', 'bin bag', 'washing', 'glove'
    ],
    'toiletries': [
        'shampoo', 'conditioner', 'toothpaste', 'deodorant', 'razor', 'lotion',
        'shower gel', 'body wash', 'soap'
    ],
    'health_beauty': [
        'makeup', 'cream', 'perfume', 'cosmetic', 'vitamin', 'supplement', 'painkiller'
    ],
    'pet_care': [
        'pet food', 'cat food', 'dog food', 'pet litter', 'pet toy'
    ],
    'baby_care': [
        'nappy', 'diaper', 'baby food', 'baby wipe', 'baby formula'
    ],
    'other_food': [
        'snack', 'crisp', 'chip', 'nut'
    ],
    'other_non_food': [
        'other', 'miscellaneous', 'general'
    ]
};

/**
 * Determines the specific category for an ingredient based on keywords and mappings
 * Returns specific category like 'vegetables_fruits', 'dairy_eggs', etc.
 * @param {Object} ingredient - Ingredient object with name
 * @param {Array} ingredientMaps - Array of ingredient mapping objects
 * @returns {string} - Specific category enum value
 */
export function categorizeIngredient(ingredient, ingredientMaps = []) {
    const name = ingredient.name?.toLowerCase() || '';
    
    // Check if it's a spice/herb first
    if (SPICE_KEYWORDS.some(keyword => name.includes(keyword))) {
        return 'pantry_staples'; // Spices go in pantry
    }
    
    // Try to get category from ingredient map (most reliable)
    const mappedIngredient = ingredientMaps.find(
        map => map.raw_ingredient_string?.toLowerCase() === name
    );
    
    if (mappedIngredient && mappedIngredient.category) {
        return mappedIngredient.category;
    }
    
    // Check if ingredient already has a specific category property
    if (ingredient.category && CATEGORY_TO_AISLE_ORDER[ingredient.category]) {
        return ingredient.category;
    }
    
    // Use keyword matching to determine category
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(keyword => name.includes(keyword))) {
            return category;
        }
    }
    
    // Default to 'other' if no match found
    return 'other';
}

/**
 * Determines the aisle order for an ingredient
 * @param {Object} ingredient - Ingredient object with name and potentially category
 * @param {Array} ingredientMaps - Array of ingredient mapping objects
 * @returns {number} - Aisle order number
 */
export function getAisleOrder(ingredient, ingredientMaps = []) {
    // Get the specific category
    const category = categorizeIngredient(ingredient, ingredientMaps);
    
    // Return the aisle order for this category
    return CATEGORY_TO_AISLE_ORDER[category] || 120;
}

/**
 * Sorts items by aisle order
 * @param {Array} items - Array of items with category property
 * @returns {Array} - Sorted array
 */
export function sortByAisleOrder(items) {
    return [...items].sort((a, b) => {
        // Get aisle order, either from stored aisle_order or calculate from category
        const orderA = a.aisle_order || CATEGORY_TO_AISLE_ORDER[a.category] || 999;
        const orderB = b.aisle_order || CATEGORY_TO_AISLE_ORDER[b.category] || 999;
        return orderA - orderB;
    });
}

/**
 * Get all available categories for selection dropdowns
 * @returns {Array} - Array of category options
 */
export function getCategoryOptions() {
    return [
        { value: 'fruit', label: 'Fruit' },
        { value: 'vegetables', label: 'Vegetables' },
        { value: 'meat_poultry', label: 'Meat & Poultry' },
        { value: 'fish_seafood', label: 'Fish & Seafood' },
        { value: 'dairy_eggs', label: 'Dairy & Eggs' },
        { value: 'bakery_grains', label: 'Bakery & Grains' },
        { value: 'oils_fats', label: 'Oils & Fats' },
        { value: 'sweet_treats', label: 'Sweet Treats' },
        { value: 'pantry_staples', label: 'Pantry Staples' },
        { value: 'soft_drinks', label: 'Soft Drinks' },
        { value: 'hot_beverages', label: 'Hot Beverages' },
        { value: 'ready_meals', label: 'Ready Meals' },
        { value: 'alcohol', label: 'Alcohol' },
        { value: 'household_cleaning', label: 'Household & Cleaning' },
        { value: 'toiletries', label: 'Toiletries' },
        { value: 'health_beauty', label: 'Health & Beauty' },
        { value: 'pet_care', label: 'Pet Care' },
        { value: 'baby_care', label: 'Baby Care' },
        { value: 'other_food', label: 'Other Food' },
        { value: 'other_non_food', label: 'Other Non-Food' }
    ];
}