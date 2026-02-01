import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell, LabelList } from 'recharts';
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { Skeleton } from '@/components/ui/skeleton';

// Expanded color palette for 20 categories with distinct colors
const CATEGORY_COLORS = {
    'hot_beverages': '#f59e0b',
    'fruit': '#fb923c',
    'vegetables': '#10b981',
    'meat_poultry': '#ef4444',
    'fish_seafood': '#06b6d4',
    'dairy_eggs': '#3b82f6',
    'bakery_grains': '#eab308',
    'oils_fats': '#84cc16',
    'sweet_treats': '#ec4899',
    'pantry_staples': '#14b8a6',
    'soft_drinks': '#0ea5e9',
    'ready_meals': '#8b5cf6',
    'alcohol': '#f43f5e',
    'other_food': '#6b7280',
    'toiletries': '#6366f1',
    'household_cleaning': '#a855f7',
    'pet_care': '#059669',
    'baby_care': '#d946ef',
    'health_beauty': '#dc2626',
    'other_non_food': '#9ca3af'
};

const COMPARISON_COLORS = { A: '#10b981', B: '#a78bfa' };

// Custom label component with dynamic color
const CustomLabel = (props) => {
    const { x, y, width, height, value, currency, totalSpend, fill } = props;
    const percentage = totalSpend > 0 ? ((value / totalSpend) * 100).toFixed(0) : 0;
    
    // Determine if label should be inside or outside based on bar size
    const isSmallBar = width < 60;
    
    // For small bars, place label outside (to the right) in dark color
    if (isSmallBar) {
        return (
            <text 
                x={x + width + 5}
                y={y + height / 2}
                fill="#334155"
                textAnchor="start"
                dominantBaseline="middle"
                fontSize="10"
                fontWeight="600"
            >
                {`${formatCurrency(value, currency)} (${percentage}%)`}
            </text>
        );
    }
    
    // For larger bars, place label inside in white
    return (
        <text 
            x={x + width / 2} 
            y={y + height / 2} 
            fill="white"
            textAnchor="middle" 
            dominantBaseline="middle"
            fontSize="10"
            fontWeight="600"
        >
            {`${formatCurrency(value, currency)} (${percentage}%)`}
        </text>
    );
};

const processData = (receipts) => {
    if (!receipts || receipts.length === 0) return [];
    
    const categorySpending = {};
    receipts.forEach(receipt => {
        const items = receipt.items || [];
        items.forEach(item => {
            const category = item.category || 'other_food';
            const totalPrice = parseFloat(item.total_price) || 0;
            const formattedName = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            if (!categorySpending[formattedName]) {
                categorySpending[formattedName] = { value: 0, originalName: category };
            }
            categorySpending[formattedName].value += totalPrice;
        });
    });

    return Object.entries(categorySpending)
        .filter(([name, data]) => data.value > 0)
        .map(([name, data]) => ({
            name,
            value: data.value,
            originalName: data.originalName
        }));
};

export default function CategoryBreakdownChart({ receiptsA, receiptsB, loading, onDrillDown }) {
    const [userCurrency, setUserCurrency] = useState('GBP');
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => { 
        User.me().then(user => user && user.currency && setUserCurrency(user.currency)); 
        
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const { data, totalSpendA, totalSpendB } = useMemo(() => {
        const dataA = processData(receiptsA || []);
        const totalA = dataA.reduce((sum, item) => sum + item.value, 0);
        
        if (!receiptsB || receiptsB.length === 0) {
            return { data: dataA.sort((a, b) => b.value - a.value), totalSpendA: totalA, totalSpendB: null };
        }
        
        const dataB = processData(receiptsB || []);
        const totalB = dataB.reduce((sum, item) => sum + item.value, 0);
        
        const mapA = {};
        const mapB = {};
        
        dataA.forEach(item => {
            mapA[item.name] = item;
        });
        
        dataB.forEach(item => {
            mapB[item.name] = item;
        });
        
        const allCategoryNames = new Set([
            ...dataA.map(item => item.name),
            ...dataB.map(item => item.name)
        ]);
        
        const comparisonData = Array.from(allCategoryNames).map(categoryName => {
            const itemA = mapA[categoryName];
            const itemB = mapB[categoryName];
            
            return {
                name: categoryName,
                spendA: itemA ? itemA.value : 0,
                spendB: itemB ? itemB.value : 0,
                originalName: itemA?.originalName || itemB?.originalName || categoryName.toLowerCase().replace(/ /g, '_')
            };
        }).filter(item => item.spendA > 0 || item.spendB > 0)
          .sort((a, b) => (b.spendA + b.spendB) - (a.spendA + a.spendB));
        
        return { data: comparisonData, totalSpendA: totalA, totalSpendB: totalB };
    }, [receiptsA, receiptsB]);

    if(loading) return <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>;

    const handleBarClick = (data, index) => {
        if (onDrillDown && data && data.originalName) {
            onDrillDown('category', data.originalName);
        }
    };

    // Calculate dynamic height - much taller on mobile
    const chartHeight = isMobile ? Math.max(600, data.length * 50) : Math.max(350, data.length * 45);
    const yAxisWidth = isMobile ? 100 : 150;
    const fontSize = isMobile ? 10 : 12;

    return (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-lg md:text-xl">Category Spending</CardTitle>
                <CardDescription>
                    {receiptsB ? 'Period A vs Period B' : 'Click a bar to see items'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-500">
                        <div className="text-center">
                            <p>No category spending data for this period.</p>
                            <p className="text-sm mt-2">Receipts may not have detailed item information.</p>
                        </div>
                    </div>
                ) : (
                    <div style={{ width: '100%', height: chartHeight }}>
                        <ResponsiveContainer>
                            {receiptsB ? (
                                <BarChart data={data} layout="vertical" margin={{ top: 5, right: isMobile ? 80 : 120, left: 20, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        stroke="#64748b" 
                                        fontSize={fontSize} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        width={yAxisWidth}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(239, 246, 255, 0.5)' }}
                                        formatter={(value) => formatCurrency(value, userCurrency)}
                                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="spendA" name="Period A" fill={COMPARISON_COLORS.A} radius={[0, 4, 4, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }} minPointSize={isMobile ? 8 : 5}>
                                        <LabelList dataKey="spendA" content={(props) => <CustomLabel {...props} currency={userCurrency} totalSpend={totalSpendA} fill={COMPARISON_COLORS.A} />} />
                                    </Bar>
                                    <Bar dataKey="spendB" name="Period B" fill={COMPARISON_COLORS.B} radius={[0, 4, 4, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }} minPointSize={isMobile ? 8 : 5}>
                                        <LabelList dataKey="spendB" content={(props) => <CustomLabel {...props} currency={userCurrency} totalSpend={totalSpendB} fill={COMPARISON_COLORS.B} />} />
                                    </Bar>
                                </BarChart>
                            ) : (
                                <BarChart data={data} layout="vertical" margin={{ top: 5, right: isMobile ? 80 : 120, left: 20, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        stroke="#64748b" 
                                        fontSize={fontSize} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        width={yAxisWidth}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(239, 246, 255, 0.5)' }}
                                        formatter={(value) => formatCurrency(value, userCurrency)}
                                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="value" name="Spend" radius={[0, 4, 4, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }} minPointSize={isMobile ? 8 : 5}>
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.originalName] || '#6b7280'} />
                                        ))}
                                        <LabelList dataKey="value" content={(props) => {
                                            const entry = data[props.index];
                                            const color = CATEGORY_COLORS[entry?.originalName] || '#6b7280';
                                            return <CustomLabel {...props} currency={userCurrency} totalSpend={totalSpendA} fill={color} />;
                                        }} />
                                    </Bar>
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}