import React, { useState, useEffect, useCallback } from "react";
import { Receipt, User, Budget } from "@/entities/all";
import { appClient } from "@/api/appClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShoppingCart,
    Brain,
    Plus,
    Trash2,
    RefreshCw,
    Edit2,
    Save,
    X,
    AlertCircle,
    Clock,
    Calendar,
    ArrowUpDown,
    Lightbulb,
    Users,
    Grid3x3,
    List
} from "lucide-react";
import { formatCurrency } from '@/components/utils/currency';
import { differenceInDays, differenceInWeeks } from 'date-fns';
import { CATEGORY_TO_AISLE_ORDER, getCategoryOptions, sortByAisleOrder } from "@/components/utils/aisleOrder";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ShoppingListPage() {
    const [shoppingList, setShoppingList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [userCurrency, setUserCurrency] = useState('GBP');
    const [editingItem, setEditingItem] = useState(null);
    const [newItemName, setNewItemName] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('other');
    const [lastGenerated, setLastGenerated] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [canGenerate, setCanGenerate] = useState(false);
    const [dataMaturityMessage, setDataMaturityMessage] = useState('');
    const [cooldownMessage, setCooldownMessage] = useState('');
    const [nextGenerationDate, setNextGenerationDate] = useState(null);
    const [viewMode, setViewMode] = useState('aisle'); // 'aisle' or 'list'

    const [receipts, setReceipts] = useState([]);
    const [budgets, setBudgets] = useState([]); // New state for budgets
    const [householdMembers, setHouseholdMembers] = useState([]); // New state for household members
    const [loadError, setLoadError] = useState(null); // General error for data loading
    const [generationError, setGenerationError] = useState(null); // Specific error for AI generation
    const [refreshFailCount, setRefreshFailCount] = useState(0);

    // New states for AI response details
    const [aiTips, setAiTips] = useState([]);
    const [budgetStatus, setBudgetStatus] = useState(''); // e.g., 'within_budget', 'near_limit', 'over_budget'
    const [totalEstimatedAiCost, setTotalEstimatedAiCost] = useState(0); // AI's estimated total cost

    const loadData = useCallback(async (retryCount = 0) => {
        try {
            setLoading(true);
            setLoadError(null);
            const user = await User.me();
            setCurrentUser(user);

            if (user) {
                if (user.currency) setUserCurrency(user.currency);

                if (user.household_id) {
                    const [receiptsData, budgetsData, householdUsersData] = await Promise.all([
                        Receipt.filter({ household_id: user.household_id }, "-purchase_date", 500),
                        Budget.filter({ household_id: user.household_id }, "-created_at", 100), // Fetch budgets
                        User.filter({ household_id: user.household_id }) // Fetch household members
                    ]);

                    setReceipts(receiptsData || []);
                    setBudgets(budgetsData || []);
                    setHouseholdMembers(householdUsersData || []);
                    setRefreshFailCount(0);
                } else {
                    setReceipts([]);
                    setBudgets([]);
                    setHouseholdMembers([]);
                }
            } else {
                setReceipts([]);
                setBudgets([]);
                setHouseholdMembers([]);
            }
        } catch (error) {
            console.error("Error loading data:", error);
            setLoadError(error.message || "Failed to load data");

            if (retryCount < 2 && (error.message?.includes("Network") || error.message?.includes("network"))) {
                setTimeout(() => {
                    loadData(retryCount + 1);
                }, 1000 * (retryCount + 1));
            } else {
                setReceipts([]);
                setBudgets([]);
                setHouseholdMembers([]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        loadSavedList();
        // checkDataMaturity will be called after currentUser and receipts are loaded by loadData
    }, [loadData]);

    useEffect(() => {
        if (currentUser && receipts) {
            checkDataMaturity();
        }
    }, [currentUser, receipts, lastGenerated]); // Re-run checkDataMaturity when these change

    const loadSavedList = () => {
        const saved = localStorage.getItem('grocerytrack_shopping_list');
        if (saved) {
            try {
                const parsedList = JSON.parse(saved);
                setShoppingList(parsedList.items || []);
                const generatedDate = parsedList.generated ? new Date(parsedList.generated) : null;
                setLastGenerated(generatedDate);
                setTotalEstimatedAiCost(parsedList.totalEstimatedAiCost || 0);
                setAiTips(parsedList.aiTips || []);
                setBudgetStatus(parsedList.budgetStatus || '');

                if (generatedDate) {
                    const daysSinceGeneration = differenceInDays(new Date(), generatedDate);
                    if (daysSinceGeneration < 7) {
                        const daysRemaining = 7 - daysSinceGeneration;
                        const nextDate = new Date(generatedDate);
                        nextDate.setDate(nextDate.getDate() + 7);
                        setNextGenerationDate(nextDate);
                        setCooldownMessage(`You can generate a new list in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`);
                    }
                }
            } catch (e) {
                console.error('Failed to load saved shopping list:', e);
            }
        }
    };

    const checkDataMaturity = async () => {
        if (!currentUser || !receipts) {
            setDataMaturityMessage('Loading user data...');
            setCanGenerate(false);
            return;
        }

        if (receipts.length === 0) {
            setDataMaturityMessage('Start scanning receipts to unlock AI shopping list generation');
            setCanGenerate(false);
            return;
        }

        const oldestReceipt = receipts[receipts.length - 1];
        const newestReceipt = receipts[0];

        if (!oldestReceipt?.purchase_date || !newestReceipt?.purchase_date) {
            setDataMaturityMessage('Not enough receipt data available');
            setCanGenerate(false);
            return;
        }

        const weeksCovered = differenceInWeeks(
            new Date(newestReceipt.purchase_date),
            new Date(oldestReceipt.purchase_date)
        );

        if (weeksCovered < 4) {
            setDataMaturityMessage(`Need ${4 - weeksCovered} more weeks of receipt data (currently ${weeksCovered} weeks)`);
            setCanGenerate(false);
            return;
        }

        if (lastGenerated) {
            const daysSinceGeneration = differenceInDays(new Date(), lastGenerated);
            if (daysSinceGeneration < 7) {
                setCanGenerate(false);
                return;
            }
        }

        setCanGenerate(true);
        setDataMaturityMessage('');
        setCooldownMessage('');
    };

    const saveList = (items, aiTotalCost = 0, aiTips = [], budgetStatus = '') => {
        const listData = {
            items,
            generated: lastGenerated ? lastGenerated.toISOString() : new Date().toISOString(),
            updated: new Date().toISOString(),
            totalEstimatedAiCost: aiTotalCost,
            aiTips,
            budgetStatus
        };
        localStorage.setItem('grocerytrack_shopping_list', JSON.stringify(listData));
    };

    const sortListByAisleOrder = () => {
        // Assign aisle_order to all items based on their category
        const itemsWithAisleOrder = shoppingList.map(item => ({
            ...item,
            aisle_order: item.category ? (CATEGORY_TO_AISLE_ORDER[item.category] || 120) : 120
        }));

        // Sort using the utility function
        const sortedList = sortByAisleOrder(itemsWithAisleOrder);

        setShoppingList(sortedList);
        saveList(sortedList, totalEstimatedAiCost, aiTips, budgetStatus);
    };

    const generateShoppingList = async () => {
        if (!currentUser || !currentUser.household_id) {
            setGenerationError("Please set up your household first.");
            return;
        }

        setGenerating(true);
        setGenerationError(null);
        setAiTips([]);
        setBudgetStatus('');
        setTotalEstimatedAiCost(0);

        try {
            // Get recent receipts for frequency analysis (last 90 days)
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const recentReceipts = receipts.filter(r =>
                new Date(r.purchase_date) >= ninetyDaysAgo
            );

            // Calculate item frequencies from recent purchases
            const itemFrequency = {};
            const itemLastPurchased = {};
            const itemAvgSpend = {};
            const itemCount = {};
            const itemCategories = {}; // To store category from receipts

            recentReceipts.forEach(receipt => {
                (receipt.items || []).forEach(item => {
                    if (!item || !item.name) return; // Skip invalid items
                    const canonicalName = item.canonical_name || item.name;
                    const key = canonicalName.toLowerCase();

                    // Track frequency
                    itemFrequency[key] = (itemFrequency[key] || 0) + 1;

                    // Track last purchase date
                    const purchaseDate = new Date(receipt.purchase_date);
                    if (!itemLastPurchased[key] || purchaseDate > itemLastPurchased[key]) {
                        itemLastPurchased[key] = purchaseDate;
                    }

                    // Track average spend
                    itemAvgSpend[key] = (itemAvgSpend[key] || 0) + (item.total_price || 0);
                    itemCount[key] = (itemCount[key] || 0) + 1;
                    if (item.category) {
                        itemCategories[key] = item.category;
                    }
                });
            });

            // Calculate average spend per item
            Object.keys(itemAvgSpend).forEach(key => {
                itemAvgSpend[key] = itemAvgSpend[key] / itemCount[key];
            });

            // Get active budget for budget-aware suggestions
            const activeBudget = budgets.find(b => b.is_active);
            const budgetInfo = activeBudget ? {
                totalAmount: activeBudget.amount,
                categoryLimits: activeBudget.category_limits || {}
            } : null;

            // Calculate current period spending
            let currentPeriodSpending = 0;
            if (activeBudget) {
                const periodStart = new Date(activeBudget.period_start);
                const periodEnd = new Date(activeBudget.period_end);
                currentPeriodSpending = receipts
                    .filter(r => {
                        const date = new Date(r.purchase_date);
                        return date >= periodStart && date <= periodEnd;
                    })
                    .reduce((sum, r) => sum + (r.total_amount || 0), 0);
            }

            // Enhanced prompt for AI
            const enhancedPrompt = `You are an expert grocery shopping assistant for UK households. Generate a smart, personalized shopping list.

USER CONTEXT:
- Shopping Frequency: ${currentUser.shopping_frequency || 'weekly'}
- Household Size: ${householdMembers.length} member(s)
- User Currency: ${userCurrency}
- Budget: ${activeBudget ? `${formatCurrency(activeBudget.amount, userCurrency)} (${formatCurrency(activeBudget.amount - currentPeriodSpending, userCurrency)} remaining)` : 'Not set'}

PURCHASE HISTORY ANALYSIS (Last 90 days, formatted for clarity):
${Object.entries(itemFrequency)
    .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
    .slice(0, 20) // Limit to top 20 frequent items for prompt length
    .map(([itemKey, freq]) => {
        const daysSinceLastPurchase = itemLastPurchased[itemKey] ? Math.floor((new Date() - itemLastPurchased[itemKey]) / (1000 * 60 * 60 * 24)) : 'N/A';
        const avgSpend = itemAvgSpend[itemKey] || 0;
        const category = itemCategories[itemKey] || 'other';
        return `- ${itemKey} (Category: ${category}): Purchased ${freq}x, Last bought ${daysSinceLastPurchase} days ago, Avg spend ${formatCurrency(avgSpend, userCurrency)}`;
    })
    .join('\n')}

INSTRUCTIONS:
1. Prioritize items based on:
   - Purchase frequency and time since last purchase
   - Current shopping frequency (${currentUser.shopping_frequency || 'weekly'})
   - Budget constraints ${budgetInfo ? `(${formatCurrency(activeBudget.amount - currentPeriodSpending, userCurrency)} remaining)` : ''}
2. Include staples likely to be running low.
3. Suggest 1-2 new healthy items to try if the list feels too repetitive.
4. Organize by supermarket aisle order implicitly through category assignment.
5. Include estimated quantities based on household size and typical consumption for a ${currentUser.shopping_frequency || 'weekly'} shop.
6. Stay within budget if specified, suggesting cheaper alternatives if needed.
7. CRITICAL: Assign the EXACT category for each item from the list below - be very specific and accurate.

CATEGORIES (you MUST use EXACTLY one of these for each item):
- vegetables_fruits: All fresh produce including vegetables, fruits, salads
- meat_fish: All meats, poultry, seafood
- dairy_eggs: Milk, cheese, butter, yogurt, eggs, cream
- bakery: Bread, rolls, pastries, bakery items
- snacks_sweets: Crisps, chocolate, biscuits, candy, snacks
- beverages: Water, juice, soft drinks, tea, coffee (drinks only)
- household_cleaning: Cleaning products, detergents, kitchen/toilet paper
- personal_care: Shampoo, soap, toiletries
- frozen_foods: Frozen items, ice cream
- pantry_staples: Rice, pasta, flour, cooking oil, sauces, canned goods, spices, condiments
- other: Only if absolutely nothing else fits

IMPORTANT:
- Carrots, onions, broccoli, lettuce, tomatoes = vegetables_fruits
- Chicken, beef, fish, bacon = meat_fish
- Milk, cheese, eggs, butter = dairy_eggs
- Bread, bagels = bakery
- Oil, salt, pasta, rice, spices = pantry_staples

Generate a practical shopping list that feels personalized to this user's habits.
Format as a JSON object containing an 'items' array, 'totalEstimatedCost', 'budgetStatus', and 'tips'. Each item object MUST contain:
- name: Product name (keep it simple and generic)
- category: MUST be EXACTLY one of the categories listed above (NOT "other" unless truly unidentifiable)
- quantity: Quantity with unit (e.g., "1kg", "6 units", "1 loaf")
- estimated_price: Reasonable price estimate
- priority: high/medium/low based on purchase frequency/need
- reason: Brief explanation for inclusion (e.g., "Weekly staple", "Low stock based on last purchase", "Good value protein")`;

            const response = await appClient.integrations.Core.InvokeLLM({ // Added await here
                prompt: enhancedPrompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        items: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    category: {
                                        type: "string",
                                        enum: ["meat_fish", "vegetables_fruits", "dairy_eggs", "bakery", "snacks_sweets", "beverages", "household_cleaning", "personal_care", "frozen_foods", "pantry_staples", "other"]
                                    },
                                    quantity: { type: "string" },
                                    estimated_price: { type: "number" },
                                    priority: { type: "string", enum: ["high", "medium", "low"] },
                                    reason: { type: "string" }
                                },
                                required: ["name", "category", "quantity", "estimated_price", "priority", "reason"]
                            }
                        },
                        totalEstimatedCost: { type: "number" },
                        budgetStatus: { type: "string", enum: ["within_budget", "near_limit", "over_budget", "no_budget_set"] },
                        tips: { type: "array", items: { type: "string" } }
                    },
                    required: ["items", "totalEstimatedCost", "budgetStatus", "tips"]
                }
            });

            try {
                if (currentUser && currentUser.id && currentUser.email && currentUser.household_id) {
                    await appClient.entities.CreditLog.create({
                        user_id: currentUser.id,
                        user_email: currentUser.email,
                        household_id: currentUser.household_id,
                        event_type: 'ai_shopping_list',
                        credits_consumed: 1, // Or whatever the actual credit cost is
                        timestamp: new Date().toISOString()
                    });
                    // Update user's AI enhancement count
                    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
                    const lastEnhancementDateStr = currentUser.last_ai_enhancement_date;
                    const lastEnhancementMonth = lastEnhancementDateStr
                        ? new Date(lastEnhancementDateStr).toISOString().substring(0, 7)
                        : null;

                    const newCount = currentMonth === lastEnhancementMonth
                        ? (currentUser.ai_enhancement_count_this_month || 0) + 1
                        : 1;

                    await appClient.auth.updateMe({
                        ai_enhancement_count_this_month: newCount,
                        last_ai_enhancement_date: new Date().toISOString()
                    });
                }
            } catch (creditLogError) {
                console.error("Failed to log credit consumption or update user AI count (non-critical):", creditLogError);
            }

            if (!response || !response.items || !Array.isArray(response.items)) {
                throw new Error("Invalid response from AI: Missing 'items' array.");
            }

            // Get existing list items to avoid duplicates
            const existingList = shoppingList || [];
            const existingNames = new Set(existingList.map(item => item.name.toLowerCase()));

            const aiItemsWithAisleOrder = response.items.map((item, index) => {
                const canonicalName = item.name.toLowerCase();
                // Check if item already exists in existing list
                if (existingNames.has(canonicalName)) {
                    return null; // Skip this item as it's a duplicate
                }

                return {
                    id: `ai-${Date.now()}-${index}-${Math.random()}`,
                    name: item.name,
                    category: item.category,
                    quantity: item.quantity,
                    estimated_price: item.estimated_price,
                    priority: item.priority,
                    reason: item.reason,
                    checked: false,
                    ai_generated: true,
                    aisle_order: CATEGORY_TO_AISLE_ORDER[item.category] || 120
                };
            }).filter(Boolean); // Filter out nulls (duplicates)

            // Combine existing list with new AI items, then sort
            const combinedList = sortByAisleOrder([...existingList, ...aiItemsWithAisleOrder]);

            setShoppingList(combinedList);
            const now = new Date();
            setLastGenerated(now);
            setAiTips(response.tips || []);
            setBudgetStatus(response.budgetStatus || 'no_budget_set');
            setTotalEstimatedAiCost(response.totalEstimatedCost || 0);

            saveList(combinedList, response.totalEstimatedCost || 0, response.tips || [], response.budgetStatus || 'no_budget_set');

            const nextDate = new Date(now);
            nextDate.setDate(nextDate.getDate() + 7);
            setNextGenerationDate(nextDate);
            setCooldownMessage('You can generate a new list in 7 days');
            setCanGenerate(false);

        } catch (error) {
            console.error('Failed to generate shopping list:', error);
            setGenerationError(error.message || "Failed to generate shopping list. Please try again.");

            // Fallback list
            const fallbackItems = [
                { id: Date.now(), name: 'Bananas', category: 'vegetables_fruits', checked: false, estimated_price: 1.50, priority: 'high', quantity: '1 bunch', reason: 'Commonly needed' },
                { id: Date.now() + 1, name: 'Milk', category: 'dairy_eggs', checked: false, estimated_price: 2.50, priority: 'high', quantity: '2 litres', reason: 'Weekly staple' },
                { id: Date.now() + 2, name: 'Bread', category: 'bakery', checked: false, estimated_price: 1.20, priority: 'medium', quantity: '1 loaf', reason: 'Often runs low' }
            ].map(item => ({
                ...item,
                ai_generated: true,
                aisle_order: CATEGORY_TO_AISLE_ORDER[item.category] || 120
            }));

            // Only set fallback if current list is empty
            if (shoppingList.length === 0) {
                setShoppingList(sortByAisleOrder(fallbackItems));
                setTotalEstimatedAiCost(fallbackItems.reduce((sum, item) => sum + item.estimated_price, 0));
                setAiTips(["Tip: AI generation failed, showing a fallback list. Please try again later."]);
                setBudgetStatus('no_budget_set');
                saveList(sortByAisleOrder(fallbackItems), fallbackItems.reduce((sum, item) => sum + item.estimated_price, 0), ["Tip: AI generation failed, showing a fallback list. Please try again later."], 'no_budget_set');
            }
        } finally {
            setGenerating(false);
        }
    };

    const toggleItem = (id) => {
        const updatedList = shoppingList.map(item =>
            item.id === id ? { ...item, checked: !item.checked } : item
        );
        setShoppingList(updatedList);
        saveList(updatedList, totalEstimatedAiCost, aiTips, budgetStatus);
    };

    const addItem = () => {
        if (!newItemName.trim()) return;

        const newItem = {
            id: Date.now(),
            name: newItemName.trim(),
            category: newItemCategory,
            estimated_price: 0,
            priority: 'medium',
            quantity: '1 unit', // Default for manually added items
            reason: 'User added',
            checked: false,
            user_added: true,
            aisle_order: CATEGORY_TO_AISLE_ORDER[newItemCategory] || 120
        };

        const updatedList = [...shoppingList, newItem];
        setShoppingList(updatedList);
        saveList(updatedList, totalEstimatedAiCost, aiTips, budgetStatus);
        setNewItemName('');
        setNewItemCategory('other'); // Reset to default
    };

    const deleteItem = (id) => {
        const updatedList = shoppingList.filter(item => item.id !== id);
        setShoppingList(updatedList);
        saveList(updatedList, totalEstimatedAiCost, aiTips, budgetStatus);
    };

    const startEdit = (item) => {
        setEditingItem({ ...item });
    };

    const saveEdit = () => {
        // Update aisle_order based on category when editing
        const updatedItem = {
            ...editingItem,
            aisle_order: CATEGORY_TO_AISLE_ORDER[editingItem.category] || 120
        };

        const updatedList = shoppingList.map(item =>
            item.id === updatedItem.id ? updatedItem : item
        );

        setShoppingList(updatedList);
        saveList(updatedList, totalEstimatedAiCost, aiTips, budgetStatus);
        setEditingItem(null);
    };

    const cancelEdit = () => {
        setEditingItem(null);
    };

    const checkedItemsCount = shoppingList.filter(item => item.checked).length;
    const priorityColors = {
        high: 'bg-red-100 text-red-700',
        medium: 'bg-yellow-100 text-yellow-700',
        low: 'bg-green-100 text-green-700'
    };

    const getBudgetStatusColor = (status) => {
        switch (status) {
            case 'within_budget': return 'text-emerald-700 bg-emerald-100 border-emerald-200';
            case 'near_limit': return 'text-amber-700 bg-amber-100 border-amber-200';
            case 'over_budget': return 'text-red-700 bg-red-100 border-red-200';
            default: return 'text-slate-700 bg-slate-100 border-slate-200';
        }
    };

    // Group items by aisle
    const groupedByAisle = () => {
        const groups = {};
        const categoryLabels = {
            'vegetables_fruits': 'Produce',
            'meat_fish': 'Meat & Fish',
            'dairy_eggs': 'Dairy & Eggs',
            'bakery': 'Bakery',
            'pantry_staples': 'Pantry',
            'snacks_sweets': 'Snacks',
            'frozen_foods': 'Frozen',
            'beverages': 'Beverages',
            'household_cleaning': 'Household',
            'personal_care': 'Personal Care',
            'other': 'Other'
        };

        shoppingList.forEach(item => {
            const category = item.category || 'other';
            if (!groups[category]) {
                groups[category] = {
                    label: categoryLabels[category] || category,
                    order: CATEGORY_TO_AISLE_ORDER[category] || 120,
                    items: []
                };
            }
            groups[category].items.push(item);
        });

        return Object.entries(groups)
            .sort(([, a], [, b]) => a.order - b.order)
            .map(([category, data]) => ({ category, ...data }));
    };

    return (
        <div className="p-3 sm:p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen">
            <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4"
                >
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">AI Shopping List</h1>
                            <p className="text-xs sm:text-sm text-slate-600">Personalized suggestions based on buying patterns</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button
                            onClick={generateShoppingList}
                            disabled={generating || !canGenerate || Boolean(cooldownMessage) || loading}
                            className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm"
                        >
                            {generating || loading ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Brain className="w-4 h-4 mr-2" />
                            )}
                            {shoppingList.length === 0 ? 'Generate List' : 'Refresh List'}
                        </Button>
                    </div>
                </motion.div>

                {/* Household Sharing Notice */}
                {householdMembers.length > 1 && (
                    <Alert className="border-blue-200 bg-blue-50">
                        <Users className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-xs sm:text-sm text-blue-800">
                            <strong>Shared with household:</strong> This shopping list is shared with all {householdMembers.length} members of your household ({householdMembers.map(m => m.full_name).join(', ')}). Changes sync instantly.
                        </AlertDescription>
                    </Alert>
                )}

                {(dataMaturityMessage || cooldownMessage || generationError || aiTips.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {dataMaturityMessage && (
                            <Alert className="border-amber-200 bg-amber-50 mb-2">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-xs sm:text-sm text-amber-800">
                                    {dataMaturityMessage}
                                </AlertDescription>
                            </Alert>
                        )}
                        {cooldownMessage && (
                            <Alert className="border-blue-200 bg-blue-50 mb-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <AlertDescription className="text-xs sm:text-sm text-blue-800">
                                    {cooldownMessage}
                                    {nextGenerationDate && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <Calendar className="w-3 h-3" />
                                            <span className="text-xs">Next generation: {nextGenerationDate.toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}
                        {generationError && (
                            <Alert variant="destructive" className="mb-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error Generating List</AlertTitle>
                                <AlertDescription>
                                    {generationError}
                                </AlertDescription>
                            </Alert>
                        )}
                        {aiTips.length > 0 && (
                            <Alert className="border-green-200 bg-green-50 mb-2">
                                <Lightbulb className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-sm text-green-800">AI Tips</AlertTitle>
                                <AlertDescription className="text-xs sm:text-sm text-green-800">
                                    <ul className="list-disc pl-4 space-y-1">
                                        {aiTips.map((tip, index) => <li key={index}>{tip}</li>)}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}
                    </motion.div>
                )}

                {/* Summary Stats */}
                {shoppingList.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardContent className="p-3 sm:p-4 text-center">
                                <p className="text-xl sm:text-2xl font-bold text-slate-900">{shoppingList.length}</p>
                                <p className="text-xs sm:text-sm text-slate-600">Total Items</p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardContent className="p-3 sm:p-4 text-center">
                                <p className="text-xl sm:text-2xl font-bold text-emerald-600">{checkedItemsCount}</p>
                                <p className="text-xs sm:text-sm text-slate-600">Items Checked</p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardContent className="p-3 sm:p-4 text-center">
                                <div className="flex justify-center items-center gap-1">
                                    <p className="text-xl sm:text-2xl font-bold text-slate-900">
                                        {formatCurrency(totalEstimatedAiCost, userCurrency)}
                                    </p>
                                    {budgetStatus && budgetStatus !== 'no_budget_set' && (
                                        <Badge className={`text-xs ${getBudgetStatusColor(budgetStatus)}`}>
                                            {budgetStatus.replace(/_/g, ' ')}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm text-slate-600">AI Estimated Total</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Add New Item */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                placeholder="Add custom item (e.g. 'Apples')"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addItem()}
                                className="flex-1 text-sm"
                            />
                            <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getCategoryOptions().map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={addItem} variant="outline" size="icon" className="shrink-0">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Shopping List */}
                {loading || generating ? (
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardContent className="p-4 sm:p-6">
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="flex items-center gap-3">
                                        <Skeleton className="w-5 h-5 rounded" />
                                        <Skeleton className="h-4 flex-1" />
                                        <Skeleton className="w-16 h-4" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : shoppingList.length > 0 ? (
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardHeader className="p-3 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base sm:text-lg mb-1">Shopping List</CardTitle>
                                    {lastGenerated && (
                                        <p className="text-xs sm:text-sm text-slate-500">
                                            Generated {lastGenerated.toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <Tabs value={viewMode} onValueChange={setViewMode} className="w-full sm:w-auto">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="aisle" className="text-xs sm:text-sm">
                                            <Grid3x3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                            By Aisle
                                        </TabsTrigger>
                                        <TabsTrigger value="list" className="text-xs sm:text-sm">
                                            <List className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                            All Items
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6">
                            {viewMode === 'aisle' ? (
                                <div className="space-y-6">
                                    {groupedByAisle().map(({ category, label, items }) => (
                                        <div key={category}>
                                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                                                <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{label}</h3>
                                                <Badge variant="outline" className="text-xs">
                                                    {items.filter(i => !i.checked).length} / {items.length}
                                                </Badge>
                                            </div>
                                            <div className="space-y-2 sm:space-y-3">
                                                <AnimatePresence>
                                                    {items.map((item, index) => (
                                                        <ItemRow 
                                                            key={item.id}
                                                            item={item}
                                                            index={index}
                                                            editingItem={editingItem}
                                                            setEditingItem={setEditingItem}
                                                            toggleItem={toggleItem}
                                                            startEdit={startEdit}
                                                            saveEdit={saveEdit}
                                                            cancelEdit={cancelEdit}
                                                            deleteItem={deleteItem}
                                                            userCurrency={userCurrency}
                                                            priorityColors={priorityColors}
                                                        />
                                                    ))}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2 sm:space-y-3">
                                    <AnimatePresence>
                                        {shoppingList.map((item, index) => (
                                            <ItemRow 
                                                key={item.id}
                                                item={item}
                                                index={index}
                                                editingItem={editingItem}
                                                setEditingItem={setEditingItem}
                                                toggleItem={toggleItem}
                                                startEdit={startEdit}
                                                saveEdit={saveEdit}
                                                cancelEdit={cancelEdit}
                                                deleteItem={deleteItem}
                                                userCurrency={userCurrency}
                                                priorityColors={priorityColors}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardContent className="text-center py-8 sm:py-12 p-3 sm:p-6">
                            <Brain className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">No Shopping List Yet</h3>
                            <p className="text-xs sm:text-sm text-slate-600 mb-4">
                                Generate an AI-powered shopping list based on your purchase history
                            </p>
                            <Button
                                onClick={generateShoppingList}
                                disabled={generating || !canGenerate || Boolean(cooldownMessage) || loading}
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm"
                            >
                                {generating ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Brain className="w-4 h-4 mr-2" />
                                )}
                                Create My Shopping List
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

const ItemRow = ({ item, index, editingItem, setEditingItem, toggleItem, startEdit, saveEdit, cancelEdit, deleteItem, userCurrency, priorityColors }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-all ${
                item.checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
            }`}
        >
            <Checkbox
                checked={item.checked}
                onCheckedChange={() => toggleItem(item.id)}
                className="shrink-0"
            />

            {editingItem && editingItem.id === item.id ? (
                <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center gap-2">
                    <Input
                        value={editingItem.name}
                        onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                        className="flex-1 text-sm"
                    />
                    <Input
                        type="text"
                        value={editingItem.quantity || ''}
                        onChange={(e) => setEditingItem({...editingItem, quantity: e.target.value})}
                        placeholder="Qty"
                        className="w-full md:w-[100px] text-sm"
                    />
                    <Input
                        type="number"
                        value={editingItem.estimated_price}
                        onChange={(e) => setEditingItem({...editingItem, estimated_price: parseFloat(e.target.value) || 0})}
                        className="w-full md:w-20 text-sm"
                        step="0.01"
                    />
                    <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8">
                            <Save className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8">
                            <X className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500" />
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                            <span className={`font-medium text-sm sm:text-base truncate ${item.checked ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                {item.name}
                                {item.quantity && <span className="text-xs text-slate-500 ml-1">({item.quantity})</span>}
                            </span>
                            {item.checked && (
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs shrink-0">
                                    In Cart
                                </Badge>
                            )}
                            {item.priority && !item.checked && (
                                <Badge className={`text-xs ${priorityColors[item.priority]} shrink-0`}>
                                    {item.priority}
                                </Badge>
                            )}
                            {item.ai_generated && (
                                <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200 shrink-0">
                                    AI
                                </Badge>
                            )}
                            {item.from_meal_plan && (
                                <Badge variant="outline" className="text-xs text-green-600 border-green-200 shrink-0">
                                    Meal Plan
                                </Badge>
                            )}
                        </div>
                        {item.reason && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[calc(100%-20px)] cursor-help">
                                            Reason: {item.reason}
                                        </p>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-[200px] text-xs">{item.reason}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {item.recipe_note && (
                            <div className="mt-1 p-1.5 bg-amber-50 rounded text-xs text-amber-800 border border-amber-200">
                                <strong>Recipe Note:</strong> {item.recipe_note}
                            </div>
                        )}
                        {item.note && !item.reason && !item.recipe_note && (
                             <p className="text-xs text-slate-500 mt-0.5 truncate">{item.note}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <div className="text-right">
                            <p className={`font-medium text-xs sm:text-sm ${item.checked ? 'text-slate-500' : 'text-slate-700'}`}>
                                {formatCurrency(item.estimated_price || 0, userCurrency)}
                            </p>
                        </div>

                        <Button size="icon" variant="ghost" onClick={() => startEdit(item)} className="h-7 w-7 sm:h-8 sm:w-8">
                            <Edit2 className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteItem(item.id)} className="h-7 w-7 sm:h-8 sm:w-8">
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                        </Button>
                    </div>
                </>
            )}
        </motion.div>
    );
};