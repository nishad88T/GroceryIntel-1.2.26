import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/components/utils/errorMessage";

const DIETARY_OPTIONS = [
    "vegetarian", "vegan", "gluten-free", "dairy-free", 
    "nut-free", "keto", "paleo", "low-carb"
];

const CUISINE_OPTIONS = [
    "Italian", "Mexican", "Chinese", "Japanese", "Indian",
    "Thai", "Mediterranean", "American", "French", "Korean"
];

export default function AIGenerateDialog({ open, onClose, onGenerate, currentPlan = null, swapMode = null }) {
    const [loading, setLoading] = useState(false);
    const [preferences, setPreferences] = useState({
        dietary_restrictions: [],
        preferred_cuisines: [],
        available_ingredients: [],
        meals_per_day: 3,
        servings: 2
    });
    const [ingredientInput, setIngredientInput] = useState("");

    const handleAddIngredient = () => {
        if (ingredientInput.trim() && !preferences.available_ingredients.includes(ingredientInput.trim())) {
            setPreferences({
                ...preferences,
                available_ingredients: [...preferences.available_ingredients, ingredientInput.trim()]
            });
            setIngredientInput("");
        }
    };

    const handleRemoveIngredient = (ingredient) => {
        setPreferences({
            ...preferences,
            available_ingredients: preferences.available_ingredients.filter(i => i !== ingredient)
        });
    };

    const toggleDietary = (option) => {
        const current = preferences.dietary_restrictions;
        setPreferences({
            ...preferences,
            dietary_restrictions: current.includes(option) 
                ? current.filter(d => d !== option)
                : [...current, option]
        });
    };

    const toggleCuisine = (option) => {
        const current = preferences.preferred_cuisines;
        setPreferences({
            ...preferences,
            preferred_cuisines: current.includes(option)
                ? current.filter(c => c !== option)
                : [...current, option]
        });
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            await onGenerate({
                ...preferences,
                existing_plan: swapMode ? currentPlan : null,
                swap_day: swapMode?.day || null,
                swap_meal: swapMode?.meal || null
            });
            toast.success(swapMode ? "Meal swapped successfully!" : "Meal plan generated!");
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        {swapMode ? `Swap ${swapMode.meal} on ${swapMode.day}` : "AI Meal Plan Generator"}
                    </DialogTitle>
                    <DialogDescription>
                        {swapMode 
                            ? "Let AI suggest a different recipe for this meal slot"
                            : "Let AI create a personalized weekly meal plan based on your preferences"
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Dietary Restrictions */}
                    <div>
                        <Label className="text-base font-semibold mb-3 block">Dietary Restrictions</Label>
                        <div className="flex flex-wrap gap-2">
                            {DIETARY_OPTIONS.map(option => (
                                <Badge
                                    key={option}
                                    variant={preferences.dietary_restrictions.includes(option) ? "default" : "outline"}
                                    className="cursor-pointer hover:bg-emerald-100"
                                    onClick={() => toggleDietary(option)}
                                >
                                    {option}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Preferred Cuisines */}
                    <div>
                        <Label className="text-base font-semibold mb-3 block">Preferred Cuisines</Label>
                        <div className="flex flex-wrap gap-2">
                            {CUISINE_OPTIONS.map(option => (
                                <Badge
                                    key={option}
                                    variant={preferences.preferred_cuisines.includes(option) ? "default" : "outline"}
                                    className="cursor-pointer hover:bg-blue-100"
                                    onClick={() => toggleCuisine(option)}
                                >
                                    {option}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Available Ingredients */}
                    <div>
                        <Label className="text-base font-semibold mb-3 block">
                            Available Ingredients (Optional)
                        </Label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                placeholder="e.g., chicken, tomatoes..."
                                value={ingredientInput}
                                onChange={(e) => setIngredientInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddIngredient()}
                            />
                            <Button onClick={handleAddIngredient} variant="outline">Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {preferences.available_ingredients.map((ingredient, idx) => (
                                <Badge key={idx} variant="secondary" className="gap-1">
                                    {ingredient}
                                    <X 
                                        className="w-3 h-3 cursor-pointer" 
                                        onClick={() => handleRemoveIngredient(ingredient)}
                                    />
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {!swapMode && (
                        <>
                            {/* Meals Per Day */}
                            <div>
                                <Label htmlFor="meals-per-day" className="text-base font-semibold mb-3 block">
                                    Meals Per Day
                                </Label>
                                <Input
                                    id="meals-per-day"
                                    type="number"
                                    min="1"
                                    max="4"
                                    value={preferences.meals_per_day}
                                    onChange={(e) => setPreferences({
                                        ...preferences,
                                        meals_per_day: parseInt(e.target.value) || 3
                                    })}
                                />
                            </div>

                            {/* Servings */}
                            <div>
                                <Label htmlFor="servings" className="text-base font-semibold mb-3 block">
                                    Servings Per Meal
                                </Label>
                                <Input
                                    id="servings"
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={preferences.servings}
                                    onChange={(e) => setPreferences({
                                        ...preferences,
                                        servings: parseInt(e.target.value) || 2
                                    })}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                {swapMode ? "Swap Meal" : "Generate Plan"}
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}