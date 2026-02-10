import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ChefHat,
    Save,
    AlertTriangle,
    Loader2,
    Plus,
    X,
    ArrowLeft
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EditRecipePage() {
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        ingredients: "",
        instructionSections: [{ section_title: "", steps: "" }],
        servings: "",
        prep_time_minutes: "",
        cook_time_minutes: "",
        tags: "",
        image: null
    });
    
    const navigate = useNavigate();

    useEffect(() => {
        loadRecipe();
    }, []);

    const loadRecipe = async () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const recipeId = urlParams.get('id');
            
            if (!recipeId) {
                setError("No recipe ID provided");
                setLoading(false);
                return;
            }

            const recipeData = await appClient.entities.Recipe.get(recipeId);
            
            if (!recipeData || recipeData.type !== 'user_parsed') {
                setError("Recipe not found or not editable");
                setLoading(false);
                return;
            }

            setRecipe(recipeData);
            
            // Parse existing data into form format
            const ingredientsStr = (recipeData.ingredients || [])
                .map(ing => ing.raw || `${ing.quantity || ''} ${ing.unit || ''} ${ing.ingredient || ing.name || ''}`.trim())
                .join('\n');

            // Parse instructions - handle both old flat array and new structured format
            let instructionSections = [];
            if (recipeData.instructions && recipeData.instructions.length > 0) {
                const firstInstruction = recipeData.instructions[0];
                if (typeof firstInstruction === 'string') {
                    // Old format - flat array of strings
                    instructionSections = [{
                        section_title: "",
                        steps: recipeData.instructions.join('\n')
                    }];
                } else if (firstInstruction.steps) {
                    // New format - structured sections
                    instructionSections = recipeData.instructions.map(section => ({
                        section_title: section.section_title || "",
                        steps: Array.isArray(section.steps) ? section.steps.join('\n') : section.steps
                    }));
                }
            }

            if (instructionSections.length === 0) {
                instructionSections = [{ section_title: "", steps: "" }];
            }

            setFormData({
                title: recipeData.title || "",
                description: recipeData.description || "",
                ingredients: ingredientsStr,
                instructionSections: instructionSections,
                servings: recipeData.servings?.toString() || "",
                prep_time_minutes: recipeData.prep_time_minutes?.toString() || "",
                cook_time_minutes: recipeData.cook_time_minutes?.toString() || "",
                tags: (recipeData.tags || []).join(', '),
                image: null
            });
        } catch (err) {
            console.error("Failed to load recipe:", err);
            setError(err.message || "Failed to load recipe");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (file) => {
        if (!file) return null;
        
        try {
            setUploading(true);
            const { file_url } = await appClient.integrations.Core.UploadFile({ file });
            return file_url;
        } catch (err) {
            console.error("Image upload failed:", err);
            throw new Error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.title || !formData.ingredients) {
            setError("Please provide at least a title and ingredients");
            return;
        }

        const hasInstructions = formData.instructionSections.some(
            section => section.steps.trim()
        );
        if (!hasInstructions) {
            setError("Please provide at least one instruction");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Upload new image if provided
            let imageUrl = recipe.image_url;
            if (formData.image) {
                imageUrl = await handleImageUpload(formData.image);
            }

            // Parse ingredients
            const ingredientsList = formData.ingredients
                .split('\n')
                .filter(line => line.trim())
                .map(line => ({ raw: line.trim() }));

            // Parse instructions - support structured sections
            const hasAnySectionTitle = formData.instructionSections.some(s => s.section_title.trim());
            const instructionsList = [];

            for (const section of formData.instructionSections) {
                if (!section.steps.trim()) continue;
                const steps = section.steps.split('\n').filter(line => line.trim()).map(line => line.trim());

                if (hasAnySectionTitle) {
                    // Use structured format if ANY section has a title
                    instructionsList.push({
                        section_title: section.section_title.trim() || "",
                        steps: steps
                    });
                } else {
                    // Use flat string format if no sections have titles
                    instructionsList.push(...steps);
                }
            }

            const tagsList = formData.tags
                ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
                : [];

            // Update recipe
            await appClient.entities.Recipe.update(recipe.id, {
                title: formData.title,
                description: formData.description || null,
                ingredients: ingredientsList,
                instructions: instructionsList,
                servings: formData.servings ? parseInt(formData.servings) : null,
                prep_time_minutes: formData.prep_time_minutes ? parseInt(formData.prep_time_minutes) : null,
                cook_time_minutes: formData.cook_time_minutes ? parseInt(formData.cook_time_minutes) : null,
                total_time_minutes: (parseInt(formData.prep_time_minutes || 0) + parseInt(formData.cook_time_minutes || 0)) || null,
                tags: tagsList,
                image_url: imageUrl
            });

            // Navigate back to recipes page
            navigate(createPageUrl('Recipes'));
        } catch (err) {
            setError(err.message || "Failed to update recipe");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-64" />
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardContent className="p-6 space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (error && !recipe) {
        return (
            <div className="p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen">
                <div className="max-w-4xl mx-auto">
                    <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            {error}
                        </AlertDescription>
                    </Alert>
                    <Button
                        onClick={() => navigate(createPageUrl('Recipes'))}
                        className="mt-4"
                        variant="outline"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Recipes
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <Button
                        onClick={() => navigate(createPageUrl('Recipes'))}
                        variant="ghost"
                        size="sm"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Recipes
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                            <ChefHat className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Edit Recipe</h1>
                            <p className="text-slate-600">Update your recipe details</p>
                        </div>
                    </div>
                </motion.div>

                {/* Error Display */}
                {error && (
                    <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            {error}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Edit Form */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ChefHat className="w-5 h-5" />
                            Recipe Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4">
                            <div>
                                <Label htmlFor="edit-title">Recipe Title *</Label>
                                <Input
                                    id="edit-title"
                                    placeholder="e.g., Grandma's Apple Pie"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    disabled={saving}
                                />
                            </div>

                            <div>
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    placeholder="Brief description of your recipe..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    disabled={saving}
                                    rows={2}
                                />
                            </div>

                            <div>
                                <Label htmlFor="edit-image">Update Recipe Photo</Label>
                                <Input
                                    id="edit-image"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setFormData({...formData, image: e.target.files[0]})}
                                    disabled={saving || uploading}
                                />
                                {recipe.image_url && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Current image will be replaced if you upload a new one
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="edit-servings">Servings</Label>
                                    <Input
                                        id="edit-servings"
                                        type="number"
                                        placeholder="4"
                                        value={formData.servings}
                                        onChange={(e) => setFormData({...formData, servings: e.target.value})}
                                        disabled={saving}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-prep">Prep (min)</Label>
                                    <Input
                                        id="edit-prep"
                                        type="number"
                                        placeholder="15"
                                        value={formData.prep_time_minutes}
                                        onChange={(e) => setFormData({...formData, prep_time_minutes: e.target.value})}
                                        disabled={saving}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-cook">Cook (min)</Label>
                                    <Input
                                        id="edit-cook"
                                        type="number"
                                        placeholder="45"
                                        value={formData.cook_time_minutes}
                                        onChange={(e) => setFormData({...formData, cook_time_minutes: e.target.value})}
                                        disabled={saving}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="edit-ingredients">Ingredients * (one per line)</Label>
                                <Textarea
                                    id="edit-ingredients"
                                    placeholder="2 cups flour&#10;1 tsp salt&#10;3 eggs"
                                    value={formData.ingredients}
                                    onChange={(e) => setFormData({...formData, ingredients: e.target.value})}
                                    disabled={saving}
                                    rows={6}
                                />
                            </div>

                            <div>
                                <Label>Instructions * (organize by sections if needed)</Label>
                                {formData.instructionSections.map((section, idx) => (
                                    <div key={idx} className="mb-4 p-3 border border-slate-200 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Input
                                                placeholder="Section name (e.g., Marination, Sauce, Garnishes) - optional"
                                                value={section.section_title}
                                                onChange={(e) => {
                                                    const newSections = [...formData.instructionSections];
                                                    newSections[idx].section_title = e.target.value;
                                                    setFormData({...formData, instructionSections: newSections});
                                                }}
                                                disabled={saving}
                                                className="flex-1"
                                            />
                                            {formData.instructionSections.length > 1 && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        const newSections = formData.instructionSections.filter((_, i) => i !== idx);
                                                        setFormData({...formData, instructionSections: newSections});
                                                    }}
                                                    disabled={saving}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <Textarea
                                            placeholder="Steps (one per line)&#10;e.g., Mix ingredients&#10;Let it rest for 30 minutes"
                                            value={section.steps}
                                            onChange={(e) => {
                                                const newSections = [...formData.instructionSections];
                                                newSections[idx].steps = e.target.value;
                                                setFormData({...formData, instructionSections: newSections});
                                            }}
                                            disabled={saving}
                                            rows={4}
                                        />
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setFormData({
                                            ...formData,
                                            instructionSections: [...formData.instructionSections, { section_title: "", steps: "" }]
                                        });
                                    }}
                                    disabled={saving}
                                    className="w-full"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Instruction Section
                                </Button>
                            </div>

                            <div>
                                <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
                                <Input
                                    id="edit-tags"
                                    placeholder="vegetarian, quick, budget-friendly"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                                    disabled={saving}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                onClick={handleSave}
                                disabled={saving || uploading || !formData.title || !formData.ingredients}
                                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                            >
                                {saving || uploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        {uploading ? "Uploading Image..." : "Saving..."}
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={() => navigate(createPageUrl('Recipes'))}
                                variant="outline"
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}