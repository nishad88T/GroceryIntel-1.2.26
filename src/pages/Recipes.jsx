import React, { useState, useEffect } from "react";
import { Recipe } from "@/entities/all";
import { appClient } from "@/api/appClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
    ChefHat,
    Search,
    Clock,
    Users,
    AlertTriangle,
    X,
    Filter,
    Trash2,
    Loader2,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Info,
    Edit
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FeatureGuard } from "@/components/shared/FeatureGuard";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import AddToMealPlanDialog from "../components/recipes/AddToMealPlanDialog";
import RecipeFolderManager from "../components/recipes/RecipeFolderManager";
import RecipeBulkActions from "../components/recipes/RecipeBulkActions";
import MultiTagFilter from "../components/recipes/MultiTagFilter";
import AIRecommendations from "../components/recipes/AIRecommendations";
import RecipeNotesRating from "../components/recipes/RecipeNotesRating";

const CollapsibleDisclaimer = () => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="border border-blue-200 bg-blue-50 rounded-lg">
            <button 
                className="w-full flex items-center justify-between p-3 text-left hover:bg-blue-100/50 transition-colors rounded-lg"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-sm font-medium text-blue-800">Recipe Import Notice</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-blue-600 shrink-0" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-blue-600 shrink-0" />
                )}
            </button>
            {isOpen && (
                <div className="px-3 pb-3 pt-0">
                    <p className="text-blue-800 text-sm leading-relaxed">
                        Imported recipes are stored privately in your account and are not shared or published by GroceryIntel. Please import recipes only for personal use. You are responsible for ensuring imported content complies with copyright or usage rights. GroceryIntel does not own or verify imported recipes and is not liable for their accuracy, allergen safety, or nutritional content.
                    </p>
                </div>
            )}
        </div>
    );
};

const ALLERGEN_LABELS = {
    celery: "Celery",
    cereals_gluten: "Gluten",
    crustaceans: "Crustaceans",
    eggs: "Eggs",
    fish: "Fish",
    lupin: "Lupin",
    milk: "Milk/Dairy",
    molluscs: "Molluscs",
    mustard: "Mustard",
    peanuts: "Peanuts",
    sesame_seeds: "Sesame",
    soybeans: "Soy",
    sulphur_dioxide_sulphites: "Sulphites",
    tree_nuts: "Tree Nuts"
};

const RecipeCard = ({ recipe, onClick, isSelected, onSelectChange, selectionMode }) => {
    const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="relative"
        >
            {selectionMode && (
                <div className="absolute top-3 left-3 z-10">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={onSelectChange}
                        className="bg-white border-2"
                    />
                </div>
            )}
            <Card
                className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-none bg-white/80 backdrop-blur-sm ${isSelected ? 'ring-2 ring-emerald-500' : ''}`}
                onClick={() => selectionMode ? onSelectChange(!isSelected) : onClick(recipe)}
            >
                {recipe.image_url && (
                    <div className="h-48 overflow-hidden rounded-t-lg">
                        <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    </div>
                )}
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2">{recipe.title}</CardTitle>
                        {recipe.type === 'user_parsed' && (
                            <Badge variant="outline" className="text-xs shrink-0">Imported</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                        {totalTime > 0 && (
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{totalTime} min</span>
                            </div>
                        )}
                        {recipe.servings && (
                            <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>{recipe.servings} servings</span>
                            </div>
                        )}
                    </div>

                    {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {recipe.tags.slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                            {recipe.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                    +{recipe.tags.length - 3}
                                </Badge>
                            )}
                        </div>
                    )}

                    {recipe.allergens && recipe.allergens.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-orange-600">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Contains allergens</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

const RecipeDetailModal = ({ recipe, open, onClose, onDelete, isAdmin, currentUser }) => {
    const [showMealPlanDialog, setShowMealPlanDialog] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const navigate = useNavigate();

    // Reset delete confirm when modal closes
    React.useEffect(() => {
        if (!open) {
            setShowDeleteConfirm(false);
        }
    }, [open]);

    if (!recipe) return null;

    const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
    
    // Can delete/edit if: admin, or if it's a user_parsed recipe from user's household
    const canDelete = isAdmin || recipe.type === 'user_parsed';
    const canEdit = recipe.type === 'user_parsed';

    const handleDelete = async () => {
        console.log('handleDelete called for recipe:', recipe.id, recipe.title);
        setDeleting(true);
        try {
            console.log('Calling appClient.entities.Recipe.delete...');
            await appClient.entities.Recipe.delete(recipe.id);
            console.log('Delete successful');
            onDelete(recipe.id);
            onClose();
        } catch (err) {
            console.error("Failed to delete recipe:", err);
            alert(`Failed to delete recipe: ${err.message}`);
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl pr-8">{recipe.title}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {recipe.image_url && (
                            <img
                                src={recipe.image_url}
                                alt={recipe.title}
                                className="w-full h-64 object-cover rounded-lg"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        )}

                        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                            {recipe.prep_time_minutes > 0 && (
                                <div>
                                    <span className="font-semibold">Prep:</span> {recipe.prep_time_minutes} min
                                </div>
                            )}
                            {recipe.cook_time_minutes > 0 && (
                                <div>
                                    <span className="font-semibold">Cook:</span> {recipe.cook_time_minutes} min
                                </div>
                            )}
                            {totalTime > 0 && (
                                <div>
                                    <span className="font-semibold">Total:</span> {totalTime} min
                                </div>
                            )}
                            {recipe.servings && (
                                <div>
                                    <span className="font-semibold">Servings:</span> {recipe.servings}
                                </div>
                            )}
                        </div>

                        {recipe.tags && recipe.tags.length > 0 && (
                            <div>
                                <h4 className="font-semibold mb-2">Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {recipe.tags.map((tag, idx) => (
                                        <Badge key={idx} variant="outline">{tag}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {recipe.allergens && recipe.allergens.length > 0 && (
                            <Alert className="border-orange-200 bg-orange-50">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                <AlertDescription className="text-orange-800">
                                    <span className="font-semibold">Allergen Warning:</span> This recipe contains {recipe.allergens.map(a => ALLERGEN_LABELS[a]).join(", ")}
                                </AlertDescription>
                            </Alert>
                        )}

                        {recipe.ingredients && recipe.ingredients.length > 0 && (
                            <div>
                                <h4 className="font-semibold mb-2">Ingredients</h4>
                                <ul className="space-y-1">
                                    {recipe.ingredients.map((ingredient, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-slate-400">•</span>
                                            <span>
                                                {ingredient.raw || (
                                                    <>
                                                        {ingredient.quantity && <span className="font-medium">{ingredient.quantity} </span>}
                                                        {ingredient.unit && ingredient.unit !== 'whole' && <span>{ingredient.unit} </span>}
                                                        {ingredient.ingredient || ingredient.name}
                                                        {ingredient.comment && <span className="text-slate-500 italic"> ({ingredient.comment})</span>}
                                                    </>
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {recipe.instructions && recipe.instructions.length > 0 && (
                            <div>
                                <h4 className="font-semibold mb-2">Instructions</h4>
                                {recipe.instructions.some(inst => typeof inst === 'object' && inst.steps) ? (
                                    <div className="space-y-4">
                                        {recipe.instructions.map((section, sectionIdx) => {
                                            if (typeof section === 'string') {
                                                return (
                                                    <div key={sectionIdx} className="text-slate-700 leading-relaxed">
                                                        {sectionIdx + 1}. {section}
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={sectionIdx}>
                                                    {section.section_title && (
                                                        <h5 className="font-semibold text-emerald-700 mb-2 mt-3">
                                                            {section.section_title}
                                                        </h5>
                                                    )}
                                                    <ol className="space-y-2 list-decimal list-inside ml-2">
                                                        {section.steps.map((step, stepIdx) => (
                                                            <li key={stepIdx} className="text-slate-700 leading-relaxed">
                                                                <span className="ml-2">{step}</span>
                                                            </li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <ol className="space-y-3 list-decimal list-inside">
                                        {recipe.instructions.map((step, idx) => (
                                            <li key={idx} className="text-slate-700 leading-relaxed">
                                                <span className="ml-2">{step}</span>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </div>
                        )}

                        {!recipe.instructions && recipe.description && (
                            <div>
                                <h4 className="font-semibold mb-2">Instructions</h4>
                                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                                    {recipe.description}
                                </div>
                            </div>
                        )}

                        {recipe.source_url && (
                            <div className="pt-4 border-t">
                                <a 
                                    href={recipe.source_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View original recipe
                                </a>
                            </div>
                        )}

                        {/* Notes & Rating Section */}
                        <RecipeNotesRating recipe={recipe} currentUser={currentUser} />

                        <div className="flex gap-3 pt-4">
                            <Button
                                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                                onClick={() => setShowMealPlanDialog(true)}
                            >
                                Add to Meal Plan
                            </Button>
                            {canEdit && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        onClose();
                                        navigate(createPageUrl(`EditRecipe?id=${recipe.id}`));
                                    }}
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                </Button>
                            )}
                            {canDelete && (
                                <Button
                                    variant="destructive"
                                    onClick={(e) => {
                                        console.log('Delete button clicked');
                                        e.stopPropagation();
                                        setShowDeleteConfirm(true);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AddToMealPlanDialog
                recipe={recipe}
                open={showMealPlanDialog}
                onClose={() => setShowMealPlanDialog(false)}
                onAdded={() => setShowMealPlanDialog(false)}
            />

            {showDeleteConfirm && (
                        <div 
                            className="fixed inset-0 z-[9999] flex items-center justify-center"
                            style={{ pointerEvents: 'auto' }}
                        >
                            <div 
                                className="fixed inset-0 bg-black/80" 
                                onClick={() => setShowDeleteConfirm(false)}
                                style={{ pointerEvents: 'auto' }}
                            />
                            <Card 
                                className="relative bg-white p-6 shadow-lg max-w-lg w-full mx-4"
                                style={{ zIndex: 10000, pointerEvents: 'auto' }}
                            >
                                <div className="flex flex-col space-y-2 text-center sm:text-left mb-4">
                                    <h2 className="text-lg font-semibold">Delete Recipe?</h2>
                                    <p className="text-sm text-slate-500">
                                        This will permanently delete "{recipe.title}". This action cannot be undone.
                                    </p>
                                </div>
                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        disabled={deleting}
                                        className="mt-2 sm:mt-0"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            console.log('Confirm delete clicked');
                                            handleDelete();
                                        }}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        disabled={deleting}
                                    >
                                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )}
        </>
    );
};

function RecipesPageContent() {
    const [recipes, setRecipes] = useState([]);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [selectedTags, setSelectedTags] = useState([]);
    const [filterType, setFilterType] = useState("all");
    const [selectedFolder, setSelectedFolder] = useState("all");
    const [excludeAllergens, setExcludeAllergens] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [householdId, setHouseholdId] = useState(null);
    const [sortBy, setSortBy] = useState("newest");
    const [maxCookTime, setMaxCookTime] = useState("");
    const [minNutritionScore, setMinNutritionScore] = useState("");
    
    // Selection mode
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedRecipes, setSelectedRecipes] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const user = await appClient.auth.me();
            setCurrentUser(user);
            setIsAdmin(user?.role === 'admin');
            setHouseholdId(user?.household_id);
            
            const [recipesData, foldersData] = await Promise.all([
                Recipe.list("-created_date", 500),
                user?.household_id ? appClient.entities.RecipeFolder.filter({ household_id: user.household_id }) : []
            ]);
            
            setRecipes(recipesData || []);
            setFolders(foldersData || []);
        } catch (error) {
            console.error("Failed to load recipes:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadFolders = async () => {
        if (!householdId) return;
        try {
            const foldersData = await appClient.entities.RecipeFolder.filter({ household_id: householdId });
            setFolders(foldersData || []);
        } catch (error) {
            console.error("Failed to load folders:", error);
        }
    };

    const handleRecipeDelete = (recipeId) => {
        setRecipes(prev => prev.filter(r => r.id !== recipeId));
    };

    const handleBulkActionComplete = () => {
        setSelectedRecipes([]);
        setSelectionMode(false);
        loadData();
    };

    const handleClearSelection = () => {
        setSelectedRecipes([]);
        setSelectionMode(false);
    };

    const toggleRecipeSelection = (recipe, isSelected) => {
        if (isSelected) {
            setSelectedRecipes(prev => [...prev, recipe]);
        } else {
            setSelectedRecipes(prev => prev.filter(r => r.id !== recipe.id));
        }
    };

    const filteredRecipes = recipes.filter(recipe => {
        const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            recipe.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesTags = selectedTags.length === 0 || 
                           (recipe.tags && recipe.tags.some(t => selectedTags.includes(t.toLowerCase())));

        const matchesType = filterType === "all" || recipe.type === filterType;

        let matchesFolder = true;
        if (selectedFolder === "uncategorized") {
            matchesFolder = !recipe.folder_id;
        } else if (selectedFolder !== "all") {
            matchesFolder = recipe.folder_id === selectedFolder;
        }

        const hasExcludedAllergen = excludeAllergens.length > 0 &&
                                   recipe.allergens?.some(a => excludeAllergens.includes(a));

        // Cooking time filter
        const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
        const matchesCookTime = !maxCookTime || totalTime <= parseInt(maxCookTime);

        // Nutrition score filter (basic calculation)
        let matchesNutrition = true;
        if (minNutritionScore) {
            const nutritionScore = calculateNutritionScore(recipe);
            matchesNutrition = nutritionScore >= parseInt(minNutritionScore);
        }

        return matchesSearch && matchesTags && matchesType && matchesFolder && !hasExcludedAllergen && matchesCookTime && matchesNutrition;
    });

    // Sort recipes
    const calculateNutritionScore = (recipe) => {
        if (!recipe.nutrition_estimation?.per_serving) return 0;
        const nutrition = recipe.nutrition_estimation.per_serving;
        let score = 0;
        if (nutrition.protein_g > 15) score += 30;
        if (nutrition.fibre_g > 5) score += 30;
        if (nutrition.fat_g < 20) score += 20;
        if (nutrition.calories < 600) score += 20;
        return score;
    };

    const sortedRecipes = [...filteredRecipes].sort((a, b) => {
        switch (sortBy) {
            case "popular":
                return (b.popularity_score || 0) - (a.popularity_score || 0);
            case "quick":
                const timeA = (a.prep_time_minutes || 0) + (a.cook_time_minutes || 0);
                const timeB = (b.prep_time_minutes || 0) + (b.cook_time_minutes || 0);
                return timeA - timeB;
            case "nutritious":
                return calculateNutritionScore(b) - calculateNutritionScore(a);
            case "newest":
            default:
                return new Date(b.created_date) - new Date(a.created_date);
        }
    });

    const allTags = [...new Set(recipes.flatMap(r => r.tags || []))];

    return (
        <div className="p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen overflow-x-hidden">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                            <ChefHat className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Recipes</h1>
                            <p className="text-slate-600 text-sm md:text-base">Browse and manage your recipe collection</p>
                        </div>
                    </div>
                    <Button
                        variant={selectionMode ? "default" : "outline"}
                        onClick={() => {
                            setSelectionMode(!selectionMode);
                            setSelectedRecipes([]);
                        }}
                        className="w-full md:w-auto"
                    >
                        {selectionMode ? "Cancel Selection" : "Select Multiple"}
                    </Button>
                </motion.div>

                {/* Collapsible Disclaimer */}
                <CollapsibleDisclaimer />

                {/* Folders & Bulk Actions */}
                {householdId && (
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardContent className="p-3 md:p-4 space-y-3">
                            <RecipeFolderManager
                                folders={folders}
                                selectedFolder={selectedFolder}
                                onFolderSelect={setSelectedFolder}
                                onFoldersChange={loadFolders}
                                householdId={householdId}
                            />
                            {/* Bulk Actions Bar - shown when items are selected */}
                            {selectionMode && selectedRecipes.length > 0 && (
                                <RecipeBulkActions
                                    selectedRecipes={selectedRecipes}
                                    folders={folders}
                                    onClearSelection={handleClearSelection}
                                    onActionComplete={handleBulkActionComplete}
                                    isAdmin={isAdmin}
                                />
                            )}
                        </CardContent>
                    </Card>
                )}
                
                {/* Bulk Actions for users without household */}
                {!householdId && selectionMode && selectedRecipes.length > 0 && (
                    <RecipeBulkActions
                        selectedRecipes={selectedRecipes}
                        folders={folders}
                        onClearSelection={handleClearSelection}
                        onActionComplete={handleBulkActionComplete}
                        isAdmin={isAdmin}
                    />
                )}

                {/* AI Recommendations */}
                {recipes.length > 10 && (
                    <AIRecommendations
                        recipes={recipes}
                        preferences={{
                            dietary: selectedTags,
                            cuisines: [],
                            ingredients: [],
                            maxTime: maxCookTime ? parseInt(maxCookTime) : null,
                            excludeAllergens: excludeAllergens
                        }}
                        onRecipeClick={setSelectedRecipe}
                        className="w-full"
                    />
                )}

                {/* Search & Filters */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search recipes..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-full md:w-48">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest First</SelectItem>
                                    <SelectItem value="popular">Most Popular</SelectItem>
                                    <SelectItem value="quick">Quickest</SelectItem>
                                    <SelectItem value="nutritious">Most Nutritious</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="w-full md:w-48">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Recipe source" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Recipes</SelectItem>
                                    <SelectItem value="curated">Curated Recipes</SelectItem>
                                    <SelectItem value="user_parsed">My Imported Recipes</SelectItem>
                                </SelectContent>
                            </Select>

                            <MultiTagFilter
                                allTags={allTags}
                                selectedTags={selectedTags}
                                onTagsChange={setSelectedTags}
                            />
                        </div>

                        {/* Advanced Filters Row */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <Input
                                    type="number"
                                    placeholder="Max cooking time (minutes)"
                                    value={maxCookTime}
                                    onChange={(e) => setMaxCookTime(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <div className="flex-1">
                                <Input
                                    type="number"
                                    placeholder="Min nutrition score (0-100)"
                                    value={minNutritionScore}
                                    onChange={(e) => setMinNutritionScore(e.target.value)}
                                    className="w-full"
                                    min="0"
                                    max="100"
                                />
                            </div>
                        </div>

                        {excludeAllergens.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-slate-600">Excluding:</span>
                                {excludeAllergens.map(allergen => (
                                    <Badge key={allergen} variant="secondary" className="flex items-center gap-1">
                                        {ALLERGEN_LABELS[allergen]}
                                        <button
                                            onClick={() => setExcludeAllergens(prev => prev.filter(a => a !== allergen))}
                                            className="ml-1 hover:text-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recipe Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Card key={i} className="border-none shadow-lg">
                                <Skeleton className="h-48 w-full rounded-t-lg" />
                                <CardHeader>
                                    <Skeleton className="h-6 w-3/4" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-4 w-full mb-2" />
                                    <Skeleton className="h-4 w-2/3" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : sortedRecipes.length > 0 ? (
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <AnimatePresence>
                            {sortedRecipes.map(recipe => (
                                <RecipeCard
                                    key={recipe.id}
                                    recipe={recipe}
                                    onClick={setSelectedRecipe}
                                    isSelected={selectedRecipes.some(r => r.id === recipe.id)}
                                    onSelectChange={(isSelected) => toggleRecipeSelection(recipe, isSelected)}
                                    selectionMode={selectionMode}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardContent className="text-center py-12">
                            <ChefHat className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No recipes found</h3>
                            <p className="text-slate-600">
                                {searchTerm || selectedTags.length > 0 || excludeAllergens.length > 0
                                    ? "Try adjusting your search or filters"
                                    : "No recipes available yet"}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Recipe Detail Modal */}
            <RecipeDetailModal
                recipe={selectedRecipe}
                open={!!selectedRecipe}
                onClose={() => setSelectedRecipe(null)}
                onDelete={handleRecipeDelete}
                isAdmin={isAdmin}
                currentUser={currentUser}
            />
        </div>
    );
}

export default function RecipesPage() {
    return (
        <FeatureGuard
            requires="recipes"
            fallbackTitle="Recipes & Meal Planning"
            fallbackDescription="Access to our curated recipe database and meal planning features is currently in beta. Contact us to request access."
        >
            <RecipesPageContent />
        </FeatureGuard>
    );
}