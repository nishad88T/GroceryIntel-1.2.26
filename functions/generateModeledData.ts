
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { formatISO, startOfMonth, endOfMonth, subMonths, addMonths, getDate, getDaysInMonth, parseISO } from 'npm:date-fns@2.30.0';

// --- CONFIGURATION ---
const MONTHS_TO_GENERATE = 6;
const RECEIPTS_PER_MONTH_RANGE = [8, 12];
const ITEMS_PER_RECEIPT_RANGE = [10, 25];

// --- TEMPLATES ---
const CORE_BASKET_TEMPLATE = [
    { name: "Milk", canonical_name: "Milk", category: "dairy_eggs", unit_price: 1.20, pack_size_value: 1, pack_size_unit: "l" },
    { name: "Bread", canonical_name: "Bread", category: "bakery", unit_price: 0.95, pack_size_value: 800, pack_size_unit: "g" },
    { name: "Chicken Breast", canonical_name: "Chicken Breast", category: "meat_fish", unit_price: 6.50, pack_size_value: 1, pack_size_unit: "kg" },
    { name: "Bananas", canonical_name: "Bananas", category: "vegetables_fruits", unit_price: 1.10, pack_size_value: 1, pack_size_unit: "kg" },
    { name: "Cheddar Cheese", canonical_name: "Cheddar Cheese", category: "dairy_eggs", unit_price: 3.50, pack_size_value: 400, pack_size_unit: "g" },
    { name: "Pasta", canonical_name: "Pasta", category: "pantry_staples", unit_price: 1.00, pack_size_value: 500, pack_size_unit: "g" },
    { name: "Eggs", canonical_name: "Eggs", category: "dairy_eggs", unit_price: 2.80, pack_size_value: 12, pack_size_unit: "each" },
];

const FILLER_ITEMS_TEMPLATE = [
    { name: "Apples", canonical_name: "Apples", category: "vegetables_fruits", unit_price: 2.00, pack_size_value: 1, pack_size_unit: "kg" },
    { name: "Tomatoes", canonical_name: "Tomatoes", category: "vegetables_fruits", unit_price: 2.50, pack_size_value: 1, pack_size_unit: "kg" },
    { name: "Orange Juice", canonical_name: "Orange Juice", category: "beverages", unit_price: 2.20, pack_size_value: 1, pack_size_unit: "l" },
    { name: "Chocolate Bar", canonical_name: "Chocolate Bar", category: "snacks_sweets", unit_price: 1.50, pack_size_value: 100, pack_size_unit: "g" },
    { name: "Yogurt", canonical_name: "Yogurt", category: "dairy_eggs", unit_price: 3.00, pack_size_value: 500, pack_size_unit: "g" },
    { name: "Rice", canonical_name: "Rice", category: "pantry_staples", unit_price: 2.50, pack_size_value: 1, pack_size_unit: "kg" },
    { name: "Onions", canonical_name: "Onions", category: "vegetables_fruits", unit_price: 1.20, pack_size_value: 1, pack_size_unit: "kg" },
    { name: "Salmon Fillet", canonical_name: "Salmon Fillet", category: "meat_fish", unit_price: 12.00, pack_size_value: 1, pack_size_unit: "kg" },
    { name: "Toilet Paper", canonical_name: "Toilet Paper", category: "household_cleaning", unit_price: 4.50, pack_size_value: 9, pack_size_unit: "pack" },
    { name: "Shampoo", canonical_name: "Shampoo", category: "personal_care", unit_price: 3.00, pack_size_value: 400, pack_size_unit: "ml" },
];

const INFLATION_TARGETS = {
    'milk': 0.10,
    'bread': -0.05,
    'chicken breast': 0.07,
};

const FALLBACK_SUPERMARKETS = ["Tesco", "ASDA", "Sainsbury's", "Morrison's"];

function getRelativeBudgetPeriod(referenceDate, startDay) {
    let year = referenceDate.getFullYear();
    let month = referenceDate.getMonth();
    let periodStart, periodEnd;

    if (getDate(referenceDate) >= startDay) {
        periodStart = new Date(year, month, startDay);
        const nextMonth = addMonths(periodStart, 1);
        periodEnd = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), startDay - 1);
    } else {
        const lastMonth = subMonths(referenceDate, 1);
        periodStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), startDay);
        periodEnd = new Date(year, month, startDay - 1);
    }

    return { period_start: periodStart, period_end: periodEnd };
}

// Modified generateReceiptItems to accept target value
function generateReceiptItems(monthIndex, targetValue = null) {
    let targetReceiptValue = targetValue || (40 + Math.random() * 60); // Default £40-100
    const items = [];
    const usedNames = new Set();

    // Include fewer core items to control spending
    const coreItemsInReceipt = CORE_BASKET_TEMPLATE.sort(() => 0.5 - Math.random()).slice(0, 3);
    let runningTotal = 0;
    
    coreItemsInReceipt.forEach(template => {
        if (runningTotal >= targetReceiptValue * 0.8) return; // Stop if we're near target
        
        const quantity = 1; // Keep quantities low
        const inflationFactor = 1 + (INFLATION_TARGETS[template.canonical_name.toLowerCase()] || 0) * (monthIndex / 12);
        const adjustedPrice = template.unit_price * inflationFactor * (0.9 + Math.random() * 0.2);
        const totalPrice = adjustedPrice * quantity;
        
        runningTotal += totalPrice;

        items.push({
            name: template.name,
            canonical_name: template.canonical_name,
            category: template.category,
            quantity: quantity,
            unit_price: parseFloat(adjustedPrice.toFixed(2)),
            total_price: parseFloat(totalPrice.toFixed(2)),
            pack_size_value: template.pack_size_value,
            pack_size_unit: template.pack_size_unit,
            price_per_unit: parseFloat(adjustedPrice.toFixed(2))
        });
        usedNames.add(template.canonical_name);
    });

    // Add a few filler items to reach target, but don't exceed
    const availableFillers = FILLER_ITEMS_TEMPLATE.filter(t => !usedNames.has(t.canonical_name));
    while (runningTotal < targetReceiptValue * 0.7 && items.length < 12 && availableFillers.length > 0) {
        const template = availableFillers.splice(Math.floor(Math.random() * availableFillers.length), 1)[0];
        const quantity = 1;
        const priceVariation = 0.8 + Math.random() * 0.4;
        const adjustedPrice = template.unit_price * priceVariation;
        const totalPrice = adjustedPrice * quantity;
        
        if (runningTotal + totalPrice <= targetReceiptValue * 1.1) { // Allow 10% overage
            runningTotal += totalPrice;
            items.push({
                name: template.name,
                canonical_name: template.canonical_name,
                category: template.category,
                quantity: quantity,
                unit_price: parseFloat(adjustedPrice.toFixed(2)),
                total_price: parseFloat(totalPrice.toFixed(2)),
                pack_size_value: template.pack_size_value,
                pack_size_unit: template.pack_size_unit,
                price_per_unit: parseFloat(adjustedPrice.toFixed(2))
            });
        }
    }

    return items;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        if (!user.household_id) {
            return new Response(JSON.stringify({ error: 'Household not set up. Cannot generate or remove modeled data.' }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const body = await req.json().catch(() => ({}));
        const { action } = body;

        if (action === 'remove') {
            console.log("🗑️ Starting comprehensive test data removal...");

            // Use service role to see all data, then filter by user's email
            const [allReceipts, allBudgets] = await Promise.all([
                base44.asServiceRole.entities.Receipt.filter({ user_email: user.email, is_test_data: true }),
                base44.asServiceRole.entities.Budget.filter({ user_email: user.email, is_test_data: true })
            ]);
            
            console.log(`Found ${allReceipts.length} test receipts and ${allBudgets.length} test budgets to delete.`);
            
            let deletedReceipts = 0;
            let deletedBudgets = 0;
            
            if (allReceipts.length > 0) {
                const receiptIds = allReceipts.map(r => r.id);
                // Use service role for deletion to bypass RLS if needed
                await base44.asServiceRole.entities.Receipt.bulkDelete(receiptIds);
                deletedReceipts = receiptIds.length;
            }
            
            if (allBudgets.length > 0) {
                const budgetIds = allBudgets.map(b => b.id);
                await base44.asServiceRole.entities.Budget.bulkDelete(budgetIds);
                deletedBudgets = budgetIds.length;
            }

            const message = `Removed ${deletedReceipts} test receipts and ${deletedBudgets} test budgets.`;
            console.log("✅ ", message);
            return new Response(JSON.stringify({ 
                message,
                details: {
                    receipts_found: allReceipts.length,
                    receipts_deleted: deletedReceipts,
                    budgets_found: allBudgets.length,
                    budgets_deleted: deletedBudgets
                }
            }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        if (action === 'generate') {
            console.log("🏗️ Generating HISTORICAL test data only...");
            const receiptsToCreate = [];
            const budgetsToCreate = [];
            const now = new Date();

            for (let i = 1; i < MONTHS_TO_GENERATE + 1; i++) { 
                const monthDate = subMonths(now, i);
                const budgetAmount = 400 + Math.random() * 100;
                const budgetPeriod = getRelativeBudgetPeriod(monthDate, 20);

                budgetsToCreate.push({
                    type: 'custom_monthly',
                    amount: parseFloat(budgetAmount.toFixed(2)),
                    currency: user.currency || 'GBP',
                    period_start: formatISO(budgetPeriod.period_start, { representation: 'date' }),
                    period_end: formatISO(budgetPeriod.period_end, { representation: 'date' }),
                    start_day: 20,
                    is_active: false,
                    is_test_data: true,
                    // FIX: Add required household and user fields
                    household_id: user.household_id,
                    user_email: user.email,
                });
                
                const periodStart = budgetPeriod.period_start;
                const periodEnd = budgetPeriod.period_end;
                const periodLengthDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
                const numReceipts = Math.max(2, Math.min(6, Math.floor(periodLengthDays / 5)));

                for (let j = 0; j < numReceipts; j++) {
                    const targetReceiptValue = (budgetAmount * 0.7) / numReceipts;
                    const items = generateReceiptItems(i, targetReceiptValue);
                    const total_amount = items.reduce((sum, item) => sum + item.total_price, 0);
                    
                    const randomDay = Math.floor(Math.random() * periodLengthDays);
                    let purchase_date = new Date(periodStart);
                    purchase_date.setDate(purchase_date.getDate() + randomDay);
                    
                    if (purchase_date < periodStart) purchase_date = new Date(periodStart);
                    if (purchase_date > periodEnd) purchase_date = new Date(periodEnd);

                    receiptsToCreate.push({
                        supermarket: FALLBACK_SUPERMARKETS[Math.floor(Math.random() * FALLBACK_SUPERMARKETS.length)],
                        purchase_date: formatISO(purchase_date, { representation: 'date' }),
                        total_amount: parseFloat(total_amount.toFixed(2)),
                        items: items,
                        currency: user.currency || 'GBP',
                        is_test_data: true,
                         // FIX: Add required household and user fields
                        household_id: user.household_id,
                        user_email: user.email,
                    });
                }
            }
            
            console.log(`Creating ${receiptsToCreate.length} historical receipts and ${budgetsToCreate.length} historical budgets.`);
            
            // The create operations will run with the user's permissions, which is correct.
            // The RLS allows this as long as household_id is provided.
            await Promise.all([
                base44.entities.Receipt.bulkCreate(receiptsToCreate),
                base44.entities.Budget.bulkCreate(budgetsToCreate)
            ]);
            
            const totalGenerated = receiptsToCreate.reduce((sum, r) => sum + r.total_amount, 0);
            const message = `Generated ${receiptsToCreate.length} historical receipts (£${totalGenerated.toFixed(2)} total) and ${budgetsToCreate.length} historical budgets. Your current budget remains unchanged.`;
            console.log("✅ ", message);
            return new Response(JSON.stringify({ message }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { "Content-Type": "application/json" } });

    } catch (error) {
        console.error('Function error:', error);
        return new Response(JSON.stringify({ error: 'Internal error', details: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});
