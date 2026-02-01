import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { User } from '@/entities/all';
import { DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
        const data = payload[0].payload;
        return (
            <div className="p-3 bg-white border rounded-lg shadow-lg text-sm">
                <p className="font-bold text-slate-800 mb-2">{label}</p>
                <p className="text-slate-700 mb-1">
                    Average Price: <span className="font-medium">{formatCurrency(data.avgPrice, currency)}</span>
                </p>
                <p className="text-slate-600 text-xs">
                    Based on {data.itemCount} item{data.itemCount !== 1 ? 's' : ''}
                </p>
                <p className="text-slate-600 text-xs mt-1">
                    {data.description}
                </p>
            </div>
        );
    }
    return null;
};

export default function FoodQualityPriceChart({ receipts, loading }) {
    const [priceData, setPriceData] = useState([]);
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
            // Aggregate prices by food quality category
            const qualityData = {
                whole_foods: { totalPrice: 0, totalWeight: 0, items: 0 },
                starchy_foods: { totalPrice: 0, totalWeight: 0, items: 0 },
                processed_foods: { totalPrice: 0, totalWeight: 0, items: 0 },
                non_food: { totalPrice: 0, totalWeight: 0, items: 0 },
                other: { totalPrice: 0, totalWeight: 0, items: 0 }
            };

            receipts.forEach(receipt => {
                if (!receipt.items) return;

                receipt.items.forEach(item => {
                    const category = item.category || 'other';
                    const price = item.total_price || 0;
                    const quantity = item.quantity || 1;
                    
                    // Skip items without valid data
                    if (price <= 0) return;

                    // Map item category to food quality
                    let qualityCategory = 'other';
                    for (const [qualityKey, qualityData] of Object.entries(FOOD_QUALITY_MAP)) {
                        if (qualityData.categories.includes(category)) {
                            qualityCategory = qualityKey;
                            break;
                        }
                    }

                    // Calculate normalized weight for averaging
                    let itemWeight = 1; // Default to "per item" if no pack size
                    if (item.pack_size_value && item.pack_size_unit) {
                        if (item.pack_size_unit === 'kg') {
                            itemWeight = item.pack_size_value * 1000; // Convert to grams
                        } else if (item.pack_size_unit === 'g') {
                            itemWeight = item.pack_size_value;
                        } else if (item.pack_size_unit === 'l') {
                            itemWeight = item.pack_size_value * 1000; // Convert to ml
                        } else if (item.pack_size_unit === 'ml') {
                            itemWeight = item.pack_size_value;
                        }
                    }

                    qualityData[qualityCategory].totalPrice += price;
                    qualityData[qualityCategory].totalWeight += (itemWeight * quantity);
                    qualityData[qualityCategory].items += quantity;
                });
            });

            // Calculate average prices
            const chartData = Object.entries(qualityData)
                .map(([key, data]) => {
                    if (data.items === 0) return null;

                    // Calculate average price per item (or per standard unit if weights available)
                    const avgPrice = data.totalWeight > 0 
                        ? (data.totalPrice / data.totalWeight) * 100 // Price per 100g/ml
                        : data.totalPrice / data.items; // Price per item

                    return {
                        key,
                        name: FOOD_QUALITY_MAP[key].name,
                        avgPrice,
                        itemCount: data.items,
                        color: FOOD_QUALITY_MAP[key].color,
                        description: data.totalWeight > 0 
                            ? 'Average price per 100g/ml' 
                            : 'Average price per item'
                    };
                })
                .filter(Boolean)
                .sort((a, b) => b.avgPrice - a.avgPrice);

            setPriceData(chartData);
        } catch (error) {
            console.error('Error processing food quality price data:', error);
            setPriceData([]);
        }
        setProcessing(false);
    }, [receipts, loading]);

    useEffect(() => {
        processData();
    }, [processData]);

    if (loading || processing) {
        return <Skeleton className="h-96 w-full" />;
    }

    if (priceData.length === 0) {
        return (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        Average Price by Food Quality
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center text-slate-500">
                    <p>No data available. Scan more receipts to see price analysis.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        Average Price by Food Quality
                    </CardTitle>
                    <CardDescription>
                        Comparing unit costs across different food quality categories
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-80 w-full">
                        <ResponsiveContainer>
                            <BarChart data={priceData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis 
                                    dataKey="name" 
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
                                <Tooltip 
                                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                                    content={<CustomTooltip currency={userCurrency} />}
                                />
                                <Bar dataKey="avgPrice" radius={[6, 6, 0, 0]}>
                                    {priceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}