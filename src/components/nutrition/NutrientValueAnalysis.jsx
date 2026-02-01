
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { formatCurrency, CURRENCY_SYMBOLS } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { Award, TrendingUp, ShieldAlert, Zap } from 'lucide-react';
import { fetchAndProcessNutritionData } from './nutritionUtils';
import { Skeleton } from '@/components/ui/skeleton';

const ValueCard = ({ title, description, items, currency, icon: Icon, color, unit, higherIsBetter = true, isPrice = false }) => (
    <div className={`p-4 rounded-lg border-l-4 ${color} bg-gradient-to-r from-white to-slate-50`}>
        <div className="flex items-center gap-2 mb-2">
            <Icon className="w-5 h-5 text-slate-700" />
            <h4 className="font-semibold text-slate-800">{title}</h4>
        </div>
        <p className="text-xs text-slate-500 mb-3">{description}</p>
        <div className="space-y-2">
            {items.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 truncate mr-2">{item.name}</span>
                    <Badge variant="outline" className="text-xs">
                        {isPrice ? formatCurrency(item.value, currency) : `${item.value?.toFixed(1)}${unit}`}
                    </Badge>
                </div>
            ))}
            {items.length === 0 && (
                <p className="text-xs text-slate-500">Not enough data for this analysis.</p>
            )}
        </div>
    </div>
);

export default function NutrientValueAnalysis({ receipts, loading }) {
    const [userCurrency, setUserCurrency] = useState('GBP');
    const [analysisData, setAnalysisData] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        User.me().then(user => user && user.currency && setUserCurrency(user.currency));
    }, []);

    const processData = useCallback(async () => {
        if (!receipts || receipts.length === 0 || loading) return;
        setProcessing(true);

        try {
            const { enhancedItems } = await fetchAndProcessNutritionData(receipts);
            
            const proteinValues = [];
            const fiberValues = [];
            const worstFoodSpendMap = new Map();
            const processedFoodSpendMap = new Map();
            const PROCESSED_CATEGORIES = ['snacks_sweets', 'beverages', 'frozen_foods'];

            enhancedItems.forEach(item => {
                // For "Best Protein Value" - high protein density items (20g+ per 100g)
                if (item.nutrient_value?.proteinPerCurrency > 0 && item.nutrition?.protein_g >= 20) {
                    proteinValues.push({ name: item.canonical_name, value: item.nutrient_value.proteinPerCurrency });
                }
                // For "Best Fiber Value" - high fiber density items (5g+ per 100g)
                if (item.nutrient_value?.fiberPerCurrency > 0 && item.nutrition?.fiber_g >= 5) {
                    fiberValues.push({ name: item.canonical_name, value: item.nutrient_value.fiberPerCurrency });
                }
                
                // Aggregation logic for "Worst Foods" (low health score, excluding fruits/vegetables)
                if (item.health_score < 0.5 && item.category !== 'vegetables_fruits' && item.total_price > 0) {
                    const currentSpend = worstFoodSpendMap.get(item.canonical_name) || 0;
                    worstFoodSpendMap.set(item.canonical_name, currentSpend + item.total_price);
                }

                // Aggregation logic for "Processed Foods"
                if (PROCESSED_CATEGORIES.includes(item.category) && item.total_price > 0) {
                    const currentSpend = processedFoodSpendMap.get(item.canonical_name) || 0;
                    processedFoodSpendMap.set(item.canonical_name, currentSpend + item.total_price);
                }
            });

            proteinValues.sort((a, b) => b.value - a.value);
            fiberValues.sort((a, b) => b.value - a.value);

            const worstFoodSpenders = Array.from(worstFoodSpendMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            const processedFoodSpenders = Array.from(processedFoodSpendMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            setAnalysisData({
                protein: proteinValues,
                fiber: fiberValues,
                worst_foods: worstFoodSpenders,
                processed_foods: processedFoodSpenders,
            });
        } catch (error) {
            console.error('Error processing nutrient value data:', error);
            setAnalysisData({ protein: [], fiber: [], worst_foods: [], processed_foods: [] });
        }
        setProcessing(false);
    }, [receipts, loading]);

    useEffect(() => {
        processData();
    }, [processData]);

    if (loading || processing) {
        return (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    if (!analysisData) return null;

    const currencySymbol = CURRENCY_SYMBOLS[userCurrency] || '£';

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-green-600" />
                        Nutritional Analysis
                    </CardTitle>
                    <CardDescription>
                        Which foods give you the most nutritional bang for your buck.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ValueCard
                            title="Best Protein Value"
                            description={`Grams of protein per ${currencySymbol}1 spent from high-protein sources (20g+ per 100g)`}
                            items={analysisData.protein}
                            currency={userCurrency}
                            icon={TrendingUp}
                            color="border-red-400"
                            unit={`g/${currencySymbol}`}
                        />
                        <ValueCard
                            title="Best Fiber Value"
                            description={`Grams of fiber per ${currencySymbol}1 spent from high-fiber sources (5g+ per 100g)`}
                            items={analysisData.fiber}
                            currency={userCurrency}
                            icon={TrendingUp}
                            color="border-green-400"
                            unit={`g/${currencySymbol}`}
                        />
                        <ValueCard
                            title="Top Spends on Less-Healthy Items"
                            description="Your highest spending on items with low nutritional scores (excluding natural fruits/vegetables)"
                            items={analysisData.worst_foods}
                            currency={userCurrency}
                            icon={ShieldAlert}
                            color="border-yellow-400"
                            isPrice={true}
                        />
                        <ValueCard
                            title="Top Spends on Processed Foods"
                            description="Your highest spending on snacks, sweets, and processed beverages"
                            items={analysisData.processed_foods}
                            currency={userCurrency}
                            icon={TrendingUp}
                            color="border-purple-400"
                            isPrice={true}
                        />
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
