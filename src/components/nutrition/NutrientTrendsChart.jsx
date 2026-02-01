import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { User } from '@/entities/all';
import { TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfYear, format, parseISO } from 'date-fns';
import { formatCurrency } from '@/components/utils/currency';

const FOOD_QUALITY_MAP = {
    whole_foods: { name: "Whole Foods", categories: ["vegetables_fruits", "meat_fish", "dairy_eggs"], color: '#22c55e' },
    starchy_foods: { name: "Starchy Foods", categories: ["bakery", "pantry_staples"], color: '#f59e0b' },
    processed_foods: { name: "Processed Foods", categories: ["snacks_sweets", "beverages", "frozen_foods"], color: '#ef4444' },
    non_food: { name: "Non-Food", categories: ["household_cleaning", "personal_care"], color: '#6b7280' },
    other: { name: "Other", categories: ["other"], color: '#8b5cf6' }
};

const CustomTooltip = ({ active, payload, label, currency }) => {
    if (active && payload && payload.length) {
        const total = payload.reduce((sum, p) => sum + p.value, 0);
        return (
            <div className="p-3 bg-white border rounded-lg shadow-lg text-sm">
                <p className="font-bold text-slate-800 mb-2">{label}</p>
                {payload.map(p => (
                    <div key={p.name} className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-slate-700">{p.name}: {formatCurrency(p.value, currency)}</span>
                    </div>
                ))}
                <div className="mt-2 pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-800">Total: {formatCurrency(total, currency)}</span>
                </div>
            </div>
        );
    }
    return null;
};

export default function NutrientTrendsChart({ receipts, loading }) {
    const [trendData, setTrendData] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [userCurrency, setUserCurrency] = useState('GBP');

    useEffect(() => {
        User.me().then(user => {
            if (user && user.currency) setUserCurrency(user.currency);
        });
    }, []);

    const processData = useCallback(() => {
        if (!receipts || receipts.length === 0 || loading) return;
        setProcessing(true);

        try {
            // Filter receipts to current year only (YTD)
            const yearStart = startOfYear(new Date());
            const ytdReceipts = receipts.filter(r => {
                if (!r.purchase_date) return false;
                const purchaseDate = parseISO(r.purchase_date);
                return purchaseDate >= yearStart;
            });

            // Group items by month and calculate food quality spending
            const monthlyData = {};

            ytdReceipts.forEach(receipt => {
                if (!receipt.purchase_date || !receipt.items) return;
                
                const month = format(parseISO(receipt.purchase_date), 'yyyy-MM');
                
                if (!monthlyData[month]) {
                    monthlyData[month] = {
                        month,
                        whole_foods: 0,
                        starchy_foods: 0,
                        processed_foods: 0,
                        non_food: 0,
                        other: 0
                    };
                }

                receipt.items.forEach(item => {
                    const category = item.category || 'other';
                    const price = item.total_price || 0;
                    
                    // Map item category to food quality
                    let qualityCategory = 'other';
                    for (const [qualityKey, qualityData] of Object.entries(FOOD_QUALITY_MAP)) {
                        if (qualityData.categories.includes(category)) {
                            qualityCategory = qualityKey;
                            break;
                        }
                    }
                    
                    monthlyData[month][qualityCategory] += price;
                });
            });

            // Convert to array and sort by month
            const sortedData = Object.values(monthlyData)
                .sort((a, b) => a.month.localeCompare(b.month))
                .map(data => ({
                    ...data,
                    displayMonth: format(parseISO(data.month + '-01'), 'MMM yyyy')
                }));

            setTrendData(sortedData);
        } catch (error) {
            console.error('Error processing YTD trend data:', error);
            setTrendData([]);
        }
        setProcessing(false);
    }, [receipts, loading]);

    useEffect(() => {
        processData();
    }, [processData]);

    if (loading || processing) {
        return <Skeleton className="h-96 w-full" />;
    }

    if (trendData.length === 0) {
        return (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        YTD Nutritional Spending Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center text-slate-500">
                    <p>No data available for the current year. Scan more receipts to see trends.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        YTD Nutritional Spending Profile
                    </CardTitle>
                    <CardDescription>
                        Monthly spending breakdown by food quality for {format(new Date(), 'yyyy')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-96 w-full">
                        <ResponsiveContainer>
                            <BarChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis 
                                    dataKey="displayMonth" 
                                    fontSize={11} 
                                    stroke="#64748b"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis 
                                    stroke="#64748b" 
                                    fontSize={12}
                                    tickFormatter={(value) => formatCurrency(value, userCurrency)}
                                />
                                <Tooltip content={<CustomTooltip currency={userCurrency} />} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="whole_foods" name="Whole Foods" stackId="a" fill={FOOD_QUALITY_MAP.whole_foods.color} />
                                <Bar dataKey="starchy_foods" name="Starchy Foods" stackId="a" fill={FOOD_QUALITY_MAP.starchy_foods.color} />
                                <Bar dataKey="processed_foods" name="Processed Foods" stackId="a" fill={FOOD_QUALITY_MAP.processed_foods.color} />
                                <Bar dataKey="non_food" name="Non-Food" stackId="a" fill={FOOD_QUALITY_MAP.non_food.color} />
                                <Bar dataKey="other" name="Other" stackId="a" fill={FOOD_QUALITY_MAP.other.color} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}