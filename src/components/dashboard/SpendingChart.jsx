
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { Badge } from "@/components/ui/badge";

const COLORS = {
    meat_fish: '#ef4444',
    vegetables_fruits: '#22c55e',
    dairy_eggs: '#3b82f6',
    bakery: '#eab308',
    snacks_sweets: '#ec4899',
    beverages: '#8b5cf6',
    household_cleaning: '#6b7280',
    personal_care: '#6366f1',
    frozen_foods: '#06b6d4',
    pantry_staples: '#f97316',
    other: '#64748b'
};

export default function SpendingChart({ receipts }) {
    const [userCurrency, setUserCurrency] = useState('GBP');

    useEffect(() => {
        User.me().then(user => {
            if (user && user.currency) {
                setUserCurrency(user.currency);
            }
        });
    }, []);

    const categorySpending = {};
    
    receipts.forEach(receipt => {
        receipt.items?.forEach(item => {
            const category = item.category || 'other';
            categorySpending[category] = (categorySpending[category] || 0) + (item.total_price || 0);
        });
    });

    const chartData = Object.entries(categorySpending)
        .map(([category, amount]) => ({
            name: category.replace(/_/g, ' '),
            value: amount,
            color: COLORS[category]
        }))
        .sort((a, b) => b.value - a.value);
        
    const totalSpending = chartData.reduce((sum, item) => sum + item.value, 0);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
        >
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm h-full">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-emerald-600" />
                        Spending by Category
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {chartData.length > 0 ? (
                        <div className="space-y-4">
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="value"
                                            labelLine={false}
                                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                                return (
                                                    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                                                        {`${(percent * 100).toFixed(0)}%`}
                                                    </text>
                                                );
                                            }}
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value) => [formatCurrency(value, userCurrency), 'Amount']}
                                            contentStyle={{ 
                                                backgroundColor: 'white', 
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2">
                                {chartData.slice(0, 6).map((item) => {
                                    const percentage = totalSpending > 0 ? ((item.value / totalSpending) * 100).toFixed(0) : 0;
                                    return (
                                        <div key={item.name} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-3 h-3 rounded-full" 
                                                    style={{ backgroundColor: item.color }}
                                                />
                                                <span className="text-slate-700 capitalize">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-900">{formatCurrency(item.value, userCurrency)}</span>
                                                <Badge variant="outline" className="font-normal">{percentage}%</Badge>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-600">No spending data yet</p>
                            <p className="text-sm text-slate-500 mt-1">Start scanning receipts to see your spending breakdown</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
