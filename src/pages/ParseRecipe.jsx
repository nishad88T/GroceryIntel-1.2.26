import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    Link2,
    FileText,
    ChefHat,
    Sparkles,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Info,
    Plus,
    X
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FeatureGuard, useUserFeatures } from "@/components/shared/FeatureGuard";

function ParseRecipeContent() {
    const [recipeUrl, setRecipeUrl] = useState("");
    const [recipeText, setRecipeText] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [usage, setUsage] = useState(null);
    const [activeTab, setActiveTab] = useState("url");
    const [uploading, setUploading] = useState(false);
    
    // Manual recipe creation fields
    const [manualRecipe, setManualRecipe] = useState({
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
    const { tier } = useUserFeatures();

    useEffect(() => {
        loadUsage();
    }, []);

    const loadUsage = async () => {
        try {
            const user = await appClient.auth.me();
            if (!user.household_id) return;

            const household = await appClient.entities.Household.get(user.household_id);
            const recipes = await appClient.entities.Recipe.filter({
                type: 'user_parsed',
                household_id: user.household_id
            });

            setUsage({
                parsed_this_month: household.parsed_recipes_this_month || 0,
                monthly_limit: 90,
                stored_recipes: recipes.length,
                storage_limit: 540
            });
        } catch (err) {
            console.error("Failed to load usage:", err);
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

    const handleManualCreate = async () => {
        if (!manualRecipe.title || !manualRecipe.ingredients) {
            setError("Please provide at least a title and ingredients");
            return;
        }

        const hasInstructions = manualRecipe.instructionSections.some(
            section => section.steps.trim()
        );
        if (!hasInstructions) {
            setError("Please provide at least one instruction");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const user = await appClient.auth.me();
            
            // Upload image if provided
            let imageUrl = null;
            if (manualRecipe.image) {
                imageUrl = await handleImageUpload(manualRecipe.image);
            }

            // Parse ingredients
            const ingredientsList = manualRecipe.ingredients
                .split('\n')
                .filter(line => line.trim())
                .map(line => ({ raw: line.trim() }));

            // Parse instructions - support structured sections
            const hasAnySectionTitle = manualRecipe.instructionSections.some(s => s.section_title.trim());
            const instructionsList = [];
            
            for (const section of manualRecipe.instructionSections) {
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

            const tagsList = manualRecipe.tags
                ? manualRecipe.tags.split(',').map(t => t.trim()).filter(Boolean)
                : [];

            // Create recipe directly
            const recipe = await appClient.entities.Recipe.create({
                title: manualRecipe.title,
                description: manualRecipe.description || null,
                ingredients: ingredientsList,
                instructions: instructionsList,
                servings: manualRecipe.servings ? parseInt(manualRecipe.servings) : null,
                prep_time_minutes: manualRecipe.prep_time_minutes ? parseInt(manualRecipe.prep_time_minutes) : null,
                cook_time_minutes: manualRecipe.cook_time_minutes ? parseInt(manualRecipe.cook_time_minutes) : null,
                total_time_minutes: (parseInt(manualRecipe.prep_time_minutes || 0) + parseInt(manualRecipe.cook_time_minutes || 0)) || null,
                tags: tagsList,
                image_url: imageUrl,
                type: 'user_parsed',
                household_id: user.household_id,
                canonicalized: false
            });

            // Update household parsed count
            const household = await appClient.entities.Household.get(user.household_id);
            await appClient.entities.Household.update(user.household_id, {
                parsed_recipes_this_month: (household.parsed_recipes_this_month || 0) + 1
            });

            // Navigate to recipe page immediately for better UX
            navigate(createPageUrl(`Recipes`));
            
            setResult({ recipe, usage: { parsed_this_month: (household.parsed_recipes_this_month || 0) + 1 } });
            setManualRecipe({
                title: "", description: "", ingredients: "", 
                instructionSections: [{ section_title: "", steps: "" }],
                servings: "", prep_time_minutes: "", cook_time_minutes: "", tags: "", image: null
            });
            await loadUsage();
        } catch (err) {
            setError(err.message || "Failed to create recipe");
        } finally {
            setLoading(false);
        }
    };

    const handleParse = async () => {
        if (!recipeUrl && !recipeText) {
            setError("Please provide a recipe URL or paste recipe text");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await appClient.functions.invoke('parseRecipe', {
                recipe_url: activeTab === "url" ? recipeUrl : null,
                recipe_text: activeTab === "text" ? recipeText : null
            });

            if (response.data.error) {
                setError(response.data.error);
            } else {
                setResult(response.data);
                setUsage(response.data.usage);
                setRecipeUrl("");
                setRecipeText("");
            }
        } catch (err) {
            setError(err.message || "Failed to parse recipe");
        } finally {
            setLoading(false);
        }
    };

    const handleViewRecipe = () => {
        if (result?.recipe?.id) {
            navigate(createPageUrl(`Recipes?recipe=${result.recipe.id}`));
        }
    };

    return (
        <div className="p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Add Recipe</h1>
                            <p className="text-slate-600">Import any recipe from the web to your meal plans</p>
                        </div>
                    </div>
                </motion.div>

                {/* Usage Stats */}
                {usage && (
                    <Card className="border-blue-200 bg-blue-50/80 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-blue-900 font-medium">This Month</span>
                                        <span className="text-blue-700">{usage.parsed_this_month} / {usage.monthly_limit}</span>
                                    </div>
                                    <Progress 
                                        value={(usage.parsed_this_month / usage.monthly_limit) * 100} 
                                        className="h-2"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-blue-900 font-medium">Storage Used</span>
                                        <span className="text-blue-700">{usage.stored_recipes} / {usage.storage_limit}</span>
                                    </div>
                                    <Progress 
                                        value={(usage.stored_recipes / usage.storage_limit) * 100} 
                                        className="h-2"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Important Notice */}
                <Alert className="border-orange-200 bg-orange-50">
                    <Info className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 text-sm">
                        <strong>Recipe Import Notice:</strong> All recipes (imported or created) are stored privately and only visible to your household members—never shared application-wide. You are responsible for ensuring all content (text, images, etc.) complies with copyright laws. GroceryIntel does not own, verify, or publish your recipes and is not liable for their accuracy, allergen safety, or nutritional content.
                    </AlertDescription>
                </Alert>

                {/* Parse Form */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ChefHat className="w-5 h-5" />
                            Import Your Recipe
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="url" className="flex items-center gap-2">
                                    <Link2 className="w-4 h-4" />
                                    From URL
                                </TabsTrigger>
                                <TabsTrigger value="text" className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Paste Text
                                </TabsTrigger>
                                <TabsTrigger value="manual" className="flex items-center gap-2">
                                    <ChefHat className="w-4 h-4" />
                                    Create Recipe
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="url" className="space-y-4 mt-4">
                                <div>
                                    <Label htmlFor="recipe-url">Recipe URL</Label>
                                    <Input
                                        id="recipe-url"
                                        type="url"
                                        placeholder="https://example.com/recipe"
                                        value={recipeUrl}
                                        onChange={(e) => setRecipeUrl(e.target.value)}
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Paste a link to any recipe from the web
                                    </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="text" className="space-y-4 mt-4">
                                <div>
                                    <Label htmlFor="recipe-text">Recipe Text</Label>
                                    <Textarea
                                        id="recipe-text"
                                        placeholder="Paste the recipe text here..."
                                        value={recipeText}
                                        onChange={(e) => setRecipeText(e.target.value)}
                                        disabled={loading}
                                        rows={10}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Copy and paste recipe text from any source
                                    </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="manual" className="space-y-4 mt-4">
                                <Alert className="border-blue-200 bg-blue-50">
                                    <Info className="h-4 w-4 text-blue-600" />
                                    <AlertDescription className="text-blue-800 text-xs">
                                        <strong>Privacy:</strong> Your recipes are stored privately and only visible to your household members. <strong>Copyright:</strong> Only upload content you own or have permission to use. You are responsible for ensuring uploaded images and recipes comply with copyright laws.
                                    </AlertDescription>
                                </Alert>
                                
                                <div className="grid gap-4">
                                    <div>
                                        <Label htmlFor="manual-title">Recipe Title *</Label>
                                        <Input
                                            id="manual-title"
                                            placeholder="e.g., Grandma's Apple Pie"
                                            value={manualRecipe.title}
                                            onChange={(e) => setManualRecipe({...manualRecipe, title: e.target.value})}
                                            disabled={loading}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="manual-description">Description</Label>
                                        <Textarea
                                            id="manual-description"
                                            placeholder="Brief description of your recipe..."
                                            value={manualRecipe.description}
                                            onChange={(e) => setManualRecipe({...manualRecipe, description: e.target.value})}
                                            disabled={loading}
                                            rows={2}
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="manual-image">Recipe Photo</Label>
                                        <Input
                                            id="manual-image"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setManualRecipe({...manualRecipe, image: e.target.files[0]})}
                                            disabled={loading || uploading}
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            Optional. Only upload images you own or have permission to use.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="manual-servings">Servings</Label>
                                            <Input
                                                id="manual-servings"
                                                type="number"
                                                placeholder="4"
                                                value={manualRecipe.servings}
                                                onChange={(e) => setManualRecipe({...manualRecipe, servings: e.target.value})}
                                                disabled={loading}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="manual-prep">Prep (min)</Label>
                                            <Input
                                                id="manual-prep"
                                                type="number"
                                                placeholder="15"
                                                value={manualRecipe.prep_time_minutes}
                                                onChange={(e) => setManualRecipe({...manualRecipe, prep_time_minutes: e.target.value})}
                                                disabled={loading}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="manual-cook">Cook (min)</Label>
                                            <Input
                                                id="manual-cook"
                                                type="number"
                                                placeholder="45"
                                                value={manualRecipe.cook_time_minutes}
                                                onChange={(e) => setManualRecipe({...manualRecipe, cook_time_minutes: e.target.value})}
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="manual-ingredients">Ingredients * (one per line)</Label>
                                        <Textarea
                                            id="manual-ingredients"
                                            placeholder="2 cups flour&#10;1 tsp salt&#10;3 eggs"
                                            value={manualRecipe.ingredients}
                                            onChange={(e) => setManualRecipe({...manualRecipe, ingredients: e.target.value})}
                                            disabled={loading}
                                            rows={6}
                                        />
                                    </div>

                                    <div>
                                        <Label>Instructions * (organize by sections if needed)</Label>
                                        {manualRecipe.instructionSections.map((section, idx) => (
                                            <div key={idx} className="mb-4 p-3 border border-slate-200 rounded-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Input
                                                        placeholder="Section name (e.g., Marination, Sauce, Garnishes) - optional"
                                                        value={section.section_title}
                                                        onChange={(e) => {
                                                            const newSections = [...manualRecipe.instructionSections];
                                                            newSections[idx].section_title = e.target.value;
                                                            setManualRecipe({...manualRecipe, instructionSections: newSections});
                                                        }}
                                                        disabled={loading}
                                                        className="flex-1"
                                                    />
                                                    {manualRecipe.instructionSections.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                const newSections = manualRecipe.instructionSections.filter((_, i) => i !== idx);
                                                                setManualRecipe({...manualRecipe, instructionSections: newSections});
                                                            }}
                                                            disabled={loading}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <Textarea
                                                    placeholder="Steps (one per line)&#10;e.g., Mix ingredients&#10;Let it rest for 30 minutes"
                                                    value={section.steps}
                                                    onChange={(e) => {
                                                        const newSections = [...manualRecipe.instructionSections];
                                                        newSections[idx].steps = e.target.value;
                                                        setManualRecipe({...manualRecipe, instructionSections: newSections});
                                                    }}
                                                    disabled={loading}
                                                    rows={4}
                                                />
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setManualRecipe({
                                                    ...manualRecipe,
                                                    instructionSections: [...manualRecipe.instructionSections, { section_title: "", steps: "" }]
                                                });
                                            }}
                                            disabled={loading}
                                            className="w-full"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Instruction Section
                                        </Button>
                                    </div>

                                    <div>
                                        <Label htmlFor="manual-tags">Tags (comma-separated)</Label>
                                        <Input
                                            id="manual-tags"
                                            placeholder="vegetarian, quick, budget-friendly"
                                            value={manualRecipe.tags}
                                            onChange={(e) => setManualRecipe({...manualRecipe, tags: e.target.value})}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {activeTab === "manual" ? (
                            <Button
                                onClick={handleManualCreate}
                                disabled={loading || uploading || !manualRecipe.title || !manualRecipe.ingredients}
                                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                            >
                                {loading || uploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        {uploading ? "Uploading Image..." : "Creating Recipe..."}
                                    </>
                                ) : (
                                    <>
                                        <ChefHat className="w-4 h-4 mr-2" />
                                        Create Recipe
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleParse}
                                disabled={loading || (!recipeUrl && !recipeText)}
                                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Parsing Recipe...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Parse Recipe
                                    </>
                                )}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Error Display */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Alert className="border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                                {error}
                            </AlertDescription>
                        </Alert>
                    </motion.div>
                )}

                {/* Success Display */}
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="border-green-200 bg-green-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-900">
                                    <CheckCircle2 className="w-5 h-5" />
                                    Recipe Parsed Successfully!
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-green-900 mb-2">{result.recipe.title}</h3>
                                    <div className="text-sm text-green-800 space-y-1">
                                        <p>• {result.recipe.ingredients?.length || 0} ingredients</p>
                                        <p>• {result.recipe.instructions?.length || 0} steps</p>
                                        {result.recipe.servings && <p>• Serves {result.recipe.servings}</p>}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={handleViewRecipe}
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        View Recipe
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setResult(null);
                                            loadUsage();
                                        }}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Parse Another
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

export default function ParseRecipePage() {
    return (
        <FeatureGuard
            requires="recipes"
            fallbackTitle="Recipe Parsing"
            fallbackDescription="Recipe parsing requires access to the recipes feature."
        >
            <ParseRecipeContent />
        </FeatureGuard>
    );
}