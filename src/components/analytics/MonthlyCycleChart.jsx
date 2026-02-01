import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarDays } from 'lucide-react';

// Updated category colors to match the new 20-category system
const CATEGORY_COLORS = {
    hot_beverages: '#f59e0b',
    fruit: '#fb923c',
    vegetables: '#10b981',
    meat_poultry: '#ef4444',
    fish_seafood: '#06b6d4',
    dairy_eggs: '#3b82f6',
    bakery_grains: '#eab308',
    oils_fats: '#84cc16',
    sweet_treats: '#ec4899',
    pantry_staples: '#14b8a6',
    soft_drinks: '#0ea5e9',
    ready_meals: '#8b5cf6',
    alcohol: '#f43f5e',
    other_food: '#6b7280',
    toiletries: '#6366f1',
    household_cleaning: '#a855f7',
    pet_care: '#059669',
    baby_care: '#d946ef',
    health_beauty: '#dc2626',
    other_non_food: '#9ca3af'
};

const processDataForCycle = (receipts) => {
    if (!receipts || receipts.length === 0) return [];

    const dailyData = {};

    receipts.forEach(receipt => {
        if (!receipt.purchase_date) return;
        
        try {
            const date = format(parseISO(receipt.purchase_date), 'yyyy-MM-dd');
            if (!dailyData[date]) {
                dailyData[date] = {
                    date: format(parseISO(date), 'dd/MM'),
                    total: 0,
                    sortKey: date,
                    supermarkets: {},
                    ...Object.keys(CATEGORY_COLORS).reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {})
                };
            }

            dailyData[date].total += receipt.total_amount || 0;
            if (receipt.supermarket) {
                dailyData[date].supermarkets[receipt.supermarket] = (dailyData[date].supermarkets[receipt.supermarket] || 0) + (receipt.total_amount || 0);
            }

            (receipt.items || []).forEach(item => {
                const category = item.category || 'other_food'; // Changed default from 'other' to 'other_food'
                const totalPrice = item.total_price || 0;
                if (CATEGORY_COLORS[category]) {
                    dailyData[date][category] += totalPrice;
                } else {
                    // If category doesn't exist in our color map, put in other_food
                    dailyData[date]['other_food'] += totalPrice;
                }
            });
        } catch (e) {
            console.warn("Could not parse date for receipt:", receipt.id);
        }
    });

    return Object.values(dailyData).map(day => {
        const topSupermarket = Object.entries(day.supermarkets).sort(([, a], [, b]) => b - a)[0];
        day.topSupermarketLabel = topSupermarket ? `${topSupermarket[0]}` : '';
        return day;
    }).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
};

export default function MonthlyCycleChart({ receipts, loading }) {
    const [userCurrency, setUserCurrency] = useState('GBP');
    useEffect(() => { User.me().then(user => user && user.currency && setUserCurrency(user.currency)); }, []);
    
    const chartData = useMemo(() => processDataForCycle(receipts), [receipts]);

    if (loading) {
        return <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>;
    }
    
    if (chartData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Spending Cycle</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <CalendarDays className="h-4 w-4" />
                        <AlertDescription>
                            No spending data available for this period to display the daily cycle.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle>Daily Spending Cycle</CardTitle>
                <CardDescription>Breakdown of your spending by category for each day in the period.</CardDescription>
            </CardHeader>
            <CardContent>
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 30, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                            <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => formatCurrency(val, userCurrency)} />
                            <Tooltip
                                cursor={{ fill: 'rgba(239, 246, 255, 0.7)' }}
                                formatter={(value, name) => [formatCurrency(value, userCurrency), name.replace(/_/g, ' ')]}
                                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            
                            {Object.keys(CATEGORY_COLORS).map(category => (
                                <Bar key={category} dataKey={category} stackId="a" fill={CATEGORY_COLORS[category]} name={category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}>
                                    {/* Only add the LabelList to the last bar in the stack to avoid duplication */}
                                    {category === 'other_non_food' && (
                                        <LabelList 
                                            dataKey="total" 
                                            position="top"
                                            formatter={(value) => formatCurrency(value, userCurrency)}
                                            style={{ fill: '#334155', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                    )}
                                </Bar>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}