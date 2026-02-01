import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList } from 'recharts';
import { formatCurrency } from '@/components/utils/currency';
import { normalizeStoreName } from '@/components/utils/storeNormalization';
import { User } from '@/entities/all';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = { A: '#10b981', B: '#a78bfa' };

// Custom label component with dynamic color
const CustomLabel = (props) => {
    const { x, y, width, height, value, currency, totalSpend } = props;
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

export default function SupermarketSpendChart({ receiptsA, receiptsB, loading, onDrillDown }) {
    const [userCurrency, setUserCurrency] = useState('GBP');
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => { 
        User.me().then(user => user && user.currency && setUserCurrency(user.currency)); 
        
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const { data, totalA, totalB } = useMemo(() => {
        const dataA = processData(receiptsA || []);
        const currentTotalA = dataA.reduce((sum, item) => sum + item.value, 0);

        if (!receiptsB || receiptsB.length === 0) {
            return { data: dataA.sort((a,b) => b.value - a.value), totalA: currentTotalA, totalB: null };
        }
        
        const dataB = processData(receiptsB || []);
        const currentTotalB = dataB.reduce((sum, item) => sum + item.value, 0);

        const mapA = {};
        const mapB = {};
        
        dataA.forEach(item => {
            mapA[item.name] = item.value;
        });
        
        dataB.forEach(item => {
            mapB[item.name] = item.value;
        });
        
        const allSupermarketNames = new Set([
            ...dataA.map(item => item.name),
            ...dataB.map(item => item.name)
        ]);
        
        const comparisonData = Array.from(allSupermarketNames).map(supermarketName => ({
            name: supermarketName,
            spendA: mapA[supermarketName] || 0,
            spendB: mapB[supermarketName] || 0,
            originalName: supermarketName
        })).filter(item => item.spendA > 0 || item.spendB > 0)
          .sort((a,b) => (b.spendA + b.spendB) - (a.spendA + a.spendB));
        
        return { data: comparisonData, totalA: currentTotalA, totalB: currentTotalB };
    }, [receiptsA, receiptsB]);
    
    if(loading) return <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>;

    const handleBarClick = (data, index) => {
        if (onDrillDown && data && data.originalName) {
            onDrillDown('supermarket', data.originalName);
        }
    };

    // Calculate dynamic height - much taller on mobile
    const chartHeight = isMobile ? Math.max(500, data.length * 80) : Math.max(300, data.length * 60);
    const yAxisWidth = isMobile ? 120 : 150;
    const fontSize = isMobile ? 10 : 12;

    return (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-lg md:text-xl">Supermarket Spending</CardTitle>
                {receiptsB && <CardDescription>Period A vs Period B - Click bars to see items</CardDescription>}
                {!receiptsB && <CardDescription>Click a bar to see items from that store</CardDescription>}
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-500">
                        <div className="text-center">
                            <p>No supermarket spending data for this period.</p>
                        </div>
                    </div>
                ) : (
                    <div style={{ width: '100%', height: chartHeight }}>
                        <ResponsiveContainer>
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
                                    content={<CustomTooltip currency={userCurrency} totalA={totalA} totalB={totalB} />}
                                    cursor={{ fill: 'rgba(239, 246, 255, 0.5)' }}
                                />
                                {receiptsB && <Legend />}
                                <Bar 
                                    dataKey={receiptsB ? "spendA" : "value"} 
                                    name="Period A" 
                                    fill={COLORS.A} 
                                    radius={[0, 4, 4, 0]} 
                                    onClick={handleBarClick} 
                                    style={{ cursor: 'pointer' }}
                                    minPointSize={isMobile ? 8 : 5}
                                >
                                    <LabelList 
                                        dataKey={receiptsB ? "spendA" : "value"} 
                                        content={(props) => <CustomLabel {...props} currency={userCurrency} totalSpend={totalA} />} 
                                    />
                                </Bar>
                                {receiptsB && (
                                    <Bar 
                                        dataKey="spendB" 
                                        name="Period B" 
                                        fill={COLORS.B} 
                                        radius={[0, 4, 4, 0]} 
                                        onClick={handleBarClick} 
                                        style={{ cursor: 'pointer' }}
                                        minPointSize={isMobile ? 8 : 5}
                                    >
                                        <LabelList 
                                            dataKey="spendB" 
                                            content={(props) => <CustomLabel {...props} currency={userCurrency} totalSpend={totalB} />} 
                                        />
                                    </Bar>
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

const CustomTooltip = ({ active, payload, label, currency, totalA, totalB }) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 bg-white border rounded-lg shadow-lg text-sm">
                <p className="font-bold text-slate-800 mb-2">{label}</p>
                {payload.map((p, index) => {
                    const total = p.name === 'Period A' ? totalA : totalB;
                    const isSingleView = p.dataKey === 'value';
                    const effectiveTotal = isSingleView ? totalA : total;
                    const percentage = effectiveTotal > 0 ? ((p.value / effectiveTotal) * 100).toFixed(1) : 0;
                    return (
                        <div key={index} className="flex items-center" style={{ color: p.color }}>
                            <span className="font-medium">{p.name}: {formatCurrency(p.value, currency)}</span>
                            <span className="text-slate-600 ml-2">({percentage}%)</span>
                        </div>
                    );
                })}
            </div>
        );
    }
    return null;
};

const processData = (receipts) => {
    if (!receipts || receipts.length === 0) return [];
    const supermarketSpending = {};
    receipts.forEach(receipt => {
        const normalizedName = normalizeStoreName(receipt.supermarket);
        supermarketSpending[normalizedName] = (supermarketSpending[normalizedName] || 0) + (receipt.total_amount || 0);
    });
    return Object.entries(supermarketSpending).map(([name, value]) => ({ name, value, originalName: name }));
};