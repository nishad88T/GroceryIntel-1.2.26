
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { DollarSign, TrendingDown, Calculator } from 'lucide-react';
import { fetchAndProcessNutritionData } from './nutritionUtils';
import { Skeleton } from '@/components/ui/skeleton';

const CustomTooltip = ({ active, payload, label, currency }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="p-3 bg-white border rounded-lg shadow-lg text-sm">
                <p className="font-bold text-slate-800 mb-1">{label}</p>
                <p className="text-blue-600 font-medium">
                    Cost per 100g: {formatCurrency(data.avgCost, currency)}
                </p>
                <p className="text-slate-600 text-xs">
                    Based on {data.itemCount} item{data.itemCount !== 1 ? 's' : ''} from your receipts
                </p>
            </div>
        );
    }
    return null;
};

export default function MacroCostAnalysis({ receipts, loading }) {
    const [userCurrency, setUserCurrency] = useState('GBP');
    const [nutritionData, setNutritionData] = useState(null);
    const [processingNutrition, setProcessingNutrition] = useState(false);

    useEffect(() => {
        User.me().then(user => {
            if (user && user.currency) setUserCurrency(user.currency);
        });
    }, []);

    const processNutritionData = useCallback(async () => {
        setProcessingNutrition(true);
        try {
            const { enhancedItems } = await fetchAndProcessNutritionData(receipts);
            
            // Group items by macro type and calculate average cost per 100g
            const macroData = {
                protein: { costs: [], items: [] },
                carbs: { costs: [], items: [] },
                fat: { costs: [], items: [] }
            };

            enhancedItems.forEach(item => {
                if (item.cost_per_100g_macro.protein && item.cost_per_100g_macro.protein > 0) {
                    macroData.protein.costs.push(item.cost_per_100g_macro.protein);
                    macroData.protein.items.push(item.canonical_name);
                }
                if (item.cost_per_100g_macro.carbs && item.cost_per_100g_macro.carbs > 0) {
                    macroData.carbs.costs.push(item.cost_per_100g_macro.carbs);
                    macroData.carbs.items.push(item.canonical_name);
                }
                if (item.cost_per_100g_macro.fat && item.cost_per_100g_macro.fat > 0) {
                    macroData.fat.costs.push(item.cost_per_100g_macro.fat);
                    macroData.fat.items.push(item.canonical_name);
                }
            });

            const chartData = Object.entries(macroData).map(([macro, data]) => {
                if (data.costs.length === 0) return null;
                
                const avgCost = data.costs.reduce((sum, cost) => sum + cost, 0) / data.costs.length;
                return {
                    name: macro.charAt(0).toUpperCase() + macro.slice(1),
                    avgCost: avgCost,
                    itemCount: data.costs.length,
                    color: macro === 'protein' ? '#ef4444' : macro === 'carbs' ? '#22c55e' : '#f59e0b'
                };
            }).filter(Boolean);

            setNutritionData(chartData);
        } catch (error) {
            console.error('Error processing nutrition data:', error);
            setNutritionData([]);
        }
        setProcessingNutrition(false);
    }, [receipts]); // Added receipts to useCallback dependencies

    useEffect(() => {
        if (receipts && receipts.length > 0 && !loading) {
            processNutritionData();
        }
    }, [receipts, loading, processNutritionData]); // Added processNutritionData to useEffect dependencies

    if (loading || processingNutrition) {
        return (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-blue-600" />
                        Macro Cost Analysis
                    </CardTitle>
                    <CardDescription>
                        Average cost per 100g of each macronutrient from your purchases
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!nutritionData || nutritionData.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-slate-500">
                            <div className="text-center">
                                <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <p>No nutritional cost data available</p>
                                <p className="text-sm mt-1">
                                    This requires items with detailed nutritional information from the Foodle database
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 w-full">
                            <ResponsiveContainer>
                                <BarChart data={nutritionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="#64748b"
                                        fontSize={12}
                                    />
                                    <YAxis 
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickFormatter={(value) => formatCurrency(value, userCurrency)}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                                        content={<CustomTooltip currency={userCurrency} />}
                                    />
                                    <Bar 
                                        dataKey="avgCost" 
                                        radius={[6, 6, 0, 0]}
                                        fill="#3b82f6"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
