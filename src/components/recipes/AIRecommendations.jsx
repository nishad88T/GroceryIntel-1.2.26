import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, RefreshCw, ChevronRight, Info } from "lucide-react";
import { motion } from "framer-motion";
import { getErrorMessage } from "@/components/utils/errorMessage";

export default function AIRecommendations({ 
    recipes, 
    preferences, 
    onRecipeClick,
    className = ""
}) {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [reasoning, setReasoning] = useState("");

    useEffect(() => {
        if (recipes.length > 0) {
            generateRecommendations();
        }
    }, [recipes.length]); // Only run when recipes are loaded initially

    const generateRecommendations = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await base44.functions.invoke('getAIRecipeRecommendations', {
                dietary_preferences: preferences?.dietary || [],
                cuisine_preferences: preferences?.cuisines || [],
                available_ingredients: preferences?.ingredients || [],
                max_cooking_time: preferences?.maxTime || null,
                exclude_allergens: preferences?.excludeAllergens || [],
                limit: 6
            });

            if (response.data.error) {
                const err = response.data.error;
                const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err) || 'Failed to generate recommendations';
                throw new Error(msg);
            }

            const recs = response.data.recommendations || [];
            
            // Match recommendations with recipe data
            const enrichedRecs = recs.map(rec => {
                const recipe = recipes.find(r => r.id === rec.recipe_id);
                return recipe ? { ...rec, recipe } : null;
            }).filter(Boolean);

            setRecommendations(enrichedRecs);
            setReasoning(response.data.reasoning || "");
        } catch (err) {
            console.error("Failed to generate recommendations:", err);
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className={`w-full max-w-full overflow-hidden rounded-xl shadow-sm border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 break-words ${className}`}>
                <CardHeader className="overflow-hidden">
                    <CardTitle className="flex items-center gap-2 min-w-0 text-base sm:text-lg">
                        <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
                        <span className="truncate">AI Recommendations</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 overflow-x-hidden">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800 text-sm">
                    {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
                </AlertDescription>
            </Alert>
        );
    }

    if (recommendations.length === 0) return null;

    return (
        <Card className={`w-full max-w-full overflow-hidden rounded-xl shadow-sm border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 break-words ${className}`}>
            <CardHeader className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <CardTitle className="flex items-center gap-2 min-w-0 text-base sm:text-lg">
                        <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
                        <span className="truncate">AI Recipe Suggestions</span>
                    </CardTitle>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={generateRecommendations}
                        disabled={loading}
                        className="w-full sm:w-auto shrink-0"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                {reasoning && (
                    <div className="w-full max-w-full overflow-hidden">
                        <p className="text-sm leading-relaxed text-purple-700 mt-2 break-words break-all sm:break-normal whitespace-pre-wrap max-w-full overflow-hidden sm:overflow-visible line-clamp-4 sm:line-clamp-none">{reasoning}</p>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-3 overflow-x-hidden">
                {recommendations.map((rec, idx) => (
                    <motion.div
                        key={rec.recipe_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="w-full flex items-start gap-3 min-w-0 p-3 bg-white rounded-lg hover:shadow-md transition-all cursor-pointer border border-purple-100 overflow-hidden"
                        onClick={() => onRecipeClick(rec.recipe)}
                    >
                        {rec.recipe.image_url && (
                            <img
                                src={rec.recipe.image_url}
                                alt={rec.recipe.title}
                                className="w-16 h-16 rounded-lg object-cover shrink-0"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 text-sm line-clamp-1">
                                {rec.recipe.title}
                            </h4>
                            <p className="text-xs text-purple-700 mt-1 line-clamp-2">
                                {rec.highlight}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <Badge className="bg-purple-100 text-purple-700 text-xs">
                                    {rec.score}% match
                                </Badge>
                                {rec.recipe.tags?.slice(0, 2).map((tag, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-purple-400 shrink-0" />
                    </motion.div>
                ))}
            </CardContent>
        </Card>
    );
}