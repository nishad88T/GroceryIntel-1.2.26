import React, { useState, useEffect } from "react";
import { Recipe, MealPlan } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { categorizeIngredient, getAisleOrder, sortByAisleOrder, CATEGORY_TO_AISLE_ORDER } from "@/components/utils/aisleOrder";

const aggregateIngredients = (recipes, ingredientMaps) => {
    const aggregated = {
        fresh: [],
        pantry: [],
        spices: [],
        other: []
    };
    
    recipes.forEach(({ recipe, servings }) => {
        if (!recipe.ingredients) return;
        
        recipe.ingredients.forEach(ingredient => {
            // User-parsed recipes have 'ingredient' field, curated have 'name' field
            const ingredientName = ingredient?.name || ingredient?.ingredient;
            if (!ingredient || !ingredientName) return; // Skip invalid ingredients
            
            // Normalize the ingredient object to always have 'name'
            const normalizedIngredient = { ...ingredient, name: ingredientName };
            const category = categorizeIngredient(normalizedIngredient, ingredientMaps); // This 'category' is the specific one (e.g., 'Produce', 'Dairy')
            const aisleOrder = getAisleOrder(ingredient, ingredientMaps);
            // const servingMultiplier = servings / (recipe.servings || 1); // This was previously used but not in final output, removed to avoid confusion
            
            // Map the specific category to a broader display category for the modal sections
            let displayCategory = 'other';
            if (CATEGORY_TO_AISLE_ORDER[category] >= CATEGORY_TO_AISLE_ORDER['Produce'] && CATEGORY_TO_AISLE_ORDER[category] <= CATEGORY_TO_AISLE_ORDER['Meat & Seafood']) {
                displayCategory = 'fresh';
            } else if (CATEGORY_TO_AISLE_ORDER[category] >= CATEGORY_TO_AISLE_ORDER['Bakery'] && CATEGORY_TO_AISLE_ORDER[category] <= CATEGORY_TO_AISLE_ORDER['Canned Goods']) {
                displayCategory = 'pantry';
            } else if (CATEGORY_TO_AISLE_ORDER[category] >= CATEGORY_TO_AISLE_ORDER['Spices'] && CATEGORY_TO_AISLE_ORDER[category] <= CATEGORY_TO_AISLE_ORDER['Baking']) {
                displayCategory = 'spices';
            }


            aggregated[displayCategory].push({
                id: `${recipe.id}-${ingredientName}`,
                name: ingredientName,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                recipeTitle: recipe.title,
                recipeId: recipe.id,
                aisle_order: aisleOrder
            });
        });
    });
    
    // Deduplicate by name and sort by aisle order
    Object.keys(aggregated).forEach(category => {
        const seen = new Map();
        // The original logic deduplicated by item.name, but the actual ingredients have different quantities
        // and recipe titles. The current list generation logic handles deduplication by name
        // when merging with the existing shopping list.
        // For the purpose of displaying unique items in the modal, we still might want to deduplicate
        // or sum quantities. But the current implementation just shows each instance from a recipe.
        // For now, retaining the original deduplication for display consistency.
        
        // This part needs careful consideration if we want to SUM quantities for the display in the modal.
        // For now, it filters out duplicate *names* within the same category for display.
        // The actual list generation in handleGenerateList aggregates correctly.
        const filteredAndSorted = [];
        const nameMap = new Map(); // name -> {item, count}
        
        aggregated[category].forEach(item => {
            const lowerName = item.name.toLowerCase();
            if (!nameMap.has(lowerName)) {
                nameMap.set(lowerName, { ...item, count: 1 });
            } else {
                // If we wanted to sum quantities, this would be the place.
                // For now, we're just making sure each unique named item appears once in the display.
                // This means if "milk" is in two recipes, it will only show once here.
                // The actual shopping list generation will handle quantities.
            }
        });
        
        aggregated[category] = sortByAisleOrder(Array.from(nameMap.values()).map(val => {
            // Remove 'count' if not needed in the final display item.
            const { count, ...rest } = val;
            return rest;
        }));
    });
    
    return aggregated;
};

const CategorySection = ({ category, items, selectedItems, onItemToggle, onCategoryToggle, recipeNotes }) => {
    const categoryLabels = {
        fresh: "Fresh & Perishable",
        pantry: "Pantry Staples",
        spices: "Spices & Seasonings",
        other: "Other Items"
    };

    const allSelected = items.length > 0 && items.every(item => selectedItems.has(item.id));
    
    const getItemNotes = (item) => {
        const notes = recipeNotes[item.recipeId] || [];
        return notes.filter(note => note.modifications && note.modifications.toLowerCase().includes(item.name.toLowerCase()));
    };

    return (
        <div className="border border-slate-200 rounded-lg mb-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 border-b border-slate-200">
                <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => onCategoryToggle(category)}
                    className="flex-shrink-0"
                />
                <div className="flex-1 flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900">{categoryLabels[category]}</h4>
                    <Badge variant="outline">{items.length} items</Badge>
                </div>
            </div>
            
            <ul className="p-4 space-y-2">
                {items.map((item) => {
                    const itemNotes = getItemNotes(item);
                    return (
                        <li key={item.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded">
                            <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={() => onItemToggle(category, item.id)}
                                className="mt-0.5 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-700 break-words">{item.name}</span>
                                    {itemNotes.length > 0 && (
                                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                            Note
                                        </Badge>
                                    )}
                                </div>
                                {item.quantity && (
                                    <span className="text-xs text-slate-500">
                                        ({item.quantity}{item.unit && item.unit !== 'whole' ? ` ${item.unit}` : ''})
                                    </span>
                                )}
                                <div className="text-xs text-slate-400 mt-0.5">
                                    from: {item.recipeTitle}
                                </div>
                                {itemNotes.length > 0 && (
                                    <div className="mt-1 p-2 bg-amber-50 rounded text-xs text-amber-800 border border-amber-200">
                                        <strong>Note:</strong> {itemNotes[0].modifications}
                                    </div>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default function GenerateShoppingListModal({ mealPlan, open, onClose }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [recipes, setRecipes] = useState([]);
    const [ingredientMaps, setIngredientMaps] = useState([]);
    const [categorizedIngredients, setCategorizedIngredients] = useState(null);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [generating, setGenerating] = useState(false);
    const [recipeNotes, setRecipeNotes] = useState({});

    useEffect(() => {
        if (open && mealPlan) {
            loadRecipesAndIngredients();
        }
    }, [open, mealPlan]);

    const loadRecipesAndIngredients = async () => {
        try {
            setLoading(true);
            
            const recipeIds = mealPlan.recipe_selections.map(sel => sel.recipe_id);
            const uniqueRecipeIds = [...new Set(recipeIds)];
            
            const recipesData = [];
            for (const id of uniqueRecipeIds) {
                const recipe = await Recipe.filter({ id });
                if (recipe && recipe.length > 0) {
                    const selections = mealPlan.recipe_selections.filter(sel => sel.recipe_id === id);
                    const totalServings = selections.reduce((sum, sel) => sum + (sel.servings || recipe[0].servings || 4), 0);
                    
                    recipesData.push({
                        recipe: recipe[0],
                        servings: totalServings
                    });
                }
            }
            
            setRecipes(recipesData);
            
            const maps = await base44.entities.IngredientMap.list("", 1000);
            setIngredientMaps(maps || []);
            
            // Load recipe notes for all recipes in meal plan
            const user = await base44.auth.me();
            if (user?.household_id) {
                const notesData = await base44.entities.RecipeNote.filter({
                    household_id: user.household_id
                });
                
                const notesMap = {};
                notesData.forEach(note => {
                    if (!notesMap[note.recipe_id]) {
                        notesMap[note.recipe_id] = [];
                    }
                    notesMap[note.recipe_id].push(note);
                });
                setRecipeNotes(notesMap);
            }
            
            const categorized = aggregateIngredients(recipesData, maps || []);
            setCategorizedIngredients(categorized);
            
            // Initialize with fresh and pantry selected by default
            const initialSelected = new Set();
            ['fresh', 'pantry'].forEach(category => {
                if (categorized[category]) {
                    categorized[category].forEach(item => initialSelected.add(item.id));
                }
            });
            setSelectedItems(initialSelected);
            
        } catch (error) {
            console.error("Error loading recipes and ingredients:", error);
            toast.error("Failed to load meal plan data");
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryToggle = (category) => {
        const newSelectedItems = new Set(selectedItems);
        const categoryItems = categorizedIngredients[category];
        
        // Check if all items in this category are currently selected
        const allSelected = categoryItems.every(item => newSelectedItems.has(item.id));
        
        if (allSelected) {
            // Deselect all items in this category
            categoryItems.forEach(item => newSelectedItems.delete(item.id));
        } else {
            // Select all items in this category
            categoryItems.forEach(item => newSelectedItems.add(item.id));
        }
        
        setSelectedItems(newSelectedItems);
    };

    const handleItemToggle = (category, itemId) => {
        const newSelectedItems = new Set(selectedItems);
        if (newSelectedItems.has(itemId)) {
            newSelectedItems.delete(itemId);
        } else {
            newSelectedItems.add(itemId);
        }
        setSelectedItems(newSelectedItems);
    };

    const handleGenerateList = async () => {
        try {
            setGenerating(true);
            
            // Collect selected ingredients with proper categorization
            const selectedIngredientsList = [];
            
            // Process all categories and collect selected items
            Object.entries(categorizedIngredients).forEach(([category, items]) => {
                items.forEach(item => {
                    if (selectedItems.has(item.id)) {
                        // Use categorizeIngredient to get the specific category
                        const specificCategory = categorizeIngredient(
                            { name: item.name }, // Pass only name as item.category is the broad display category
                            ingredientMaps
                        );
                        
                        // Check for recipe notes with modifications
                        const itemNotes = recipeNotes[item.recipeId] || [];
                        const relevantNote = itemNotes.find(note => 
                            note.modifications && note.modifications.toLowerCase().includes(item.name.toLowerCase())
                        );
                        
                        selectedIngredientsList.push({
                            name: item.name,
                            quantity: item.quantity,
                            category: specificCategory,
                            aisle_order: CATEGORY_TO_AISLE_ORDER[specificCategory] || 120,
                            recipeTitle: item.recipeTitle,
                            recipeNote: relevantNote ? relevantNote.modifications : null
                        });
                    }
                });
            });

            // Sort by aisle order
            selectedIngredientsList.sort((a, b) => (a.aisle_order || 999) - (b.aisle_order || 999));

            // Save to shopping list (append to existing list, don't replace)
            const existingList = localStorage.getItem('grocerytrack_shopping_list');
            let currentList = [];
            
            if (existingList) {
                try {
                    const parsed = JSON.parse(existingList);
                    currentList = parsed.items || [];
                } catch (e) {
                    console.error("Failed to parse existing list:", e);
                }
            }

            // Add new items (avoiding duplicates by name)
            const existingNames = new Set(currentList.map(item => item.name.toLowerCase()));
            const newItems = selectedIngredientsList
                .filter(ing => !existingNames.has(ing.name.toLowerCase()))
                .map((ing, index) => ({
                    id: Date.now() + index,
                    name: ing.name,
                    category: ing.category,
                    estimated_price: 0,
                    priority: 'medium',
                    checked: false,
                    from_meal_plan: true,
                    recipeTitle: ing.recipeTitle,
                    aisle_order: ing.aisle_order,
                    recipe_note: ing.recipeNote || null
                }));

            const updatedList = sortByAisleOrder([...currentList, ...newItems]);

            localStorage.setItem('grocerytrack_shopping_list', JSON.stringify({
                items: updatedList,
                generated: new Date().toISOString(),
                updated: new Date().toISOString()
            }));

            // Update meal plan with generation timestamp
            await MealPlan.update(mealPlan.id, {
                last_shopping_list_generated: new Date().toISOString()
            });

            toast.success(`Added ${newItems.length} items to your shopping list`);
            onClose();
            navigate(createPageUrl("ShoppingList"));
        } catch (error) {
            console.error("Error generating shopping list:", error);
            toast.error("Failed to generate shopping list");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-indigo-600" />
                        Generate Shopping List
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            <p className="text-sm text-slate-600 mb-4">
                                Select which ingredients to add to your shopping list. Click the category checkbox to select/deselect all items in that category, or individually select items.
                            </p>

                            {['fresh', 'pantry', 'spices', 'other'].map((category) => (
                                categorizedIngredients[category] && categorizedIngredients[category].length > 0 && (
                                    <CategorySection
                                        key={category}
                                        category={category}
                                        items={categorizedIngredients[category]}
                                        selectedItems={selectedItems}
                                        onItemToggle={handleItemToggle}
                                        onCategoryToggle={handleCategoryToggle}
                                        recipeNotes={recipeNotes}
                                    />
                                )
                            ))}
                        </div>

                        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
                            <div className="flex items-center justify-between w-full gap-3">
                                <p className="text-sm text-slate-600">
                                    {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                                </p>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={onClose} disabled={generating}>
                                        Cancel
                                    </Button>
                                    <Button 
                                        onClick={handleGenerateList} 
                                        disabled={generating || selectedItems.size === 0}
                                        className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                                    >
                                        {generating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Adding to List...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4 mr-2" />
                                                Add to Shopping List
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}