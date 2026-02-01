
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { Skeleton } from '@/components/ui/skeleton';

const processDataForTrend = (receipts) => {
    if (!receipts || receipts.length === 0) return {};
    
    // Group by day and sum amounts - with null checks
    const dailySpend = receipts
        .filter(receipt => receipt.purchase_date) // Filter out receipts without dates
        .reduce((acc, receipt) => {
            try {
                const date = format(parseISO(receipt.purchase_date), 'yyyy-MM-dd');
                acc[date] = (acc[date] || 0) + (parseFloat(receipt.total_amount) || 0);
                return acc;
            } catch (error) {
                console.warn('Invalid date format in receipt:', receipt.purchase_date);
                return acc;
            }
        }, {});
    
    return dailySpend;
};

export default function SpendingTrendChart({ receiptsA, receiptsB, loading }) {
    const [userCurrency, setUserCurrency] = useState('GBP');
    useEffect(() => { User.me().then(user => user && user.currency && setUserCurrency(user.currency)); }, []);

    const chartData = useMemo(() => {
        const dataA = processDataForTrend(receiptsA || []);
        
        if (!receiptsB || receiptsB.length === 0) {
            return Object.entries(dataA)
                .map(([date, amount]) => {
                    try {
                        return { date: format(parseISO(date), 'dd/MM'), amount, sortKey: date }; // Changed from 'MMM dd' to 'dd/MM'
                    } catch (error) {
                        console.warn('Invalid date in trend data:', date);
                        return null;
                    }
                })
                .filter(item => item !== null) // Remove invalid entries
                .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        }
        
        const dataB = processDataForTrend(receiptsB);
        const allDates = new Set([...Object.keys(dataA), ...Object.keys(dataB)]);

        const combinedData = Array.from(allDates)
            .map(date => {
                try {
                    return {
                        date: format(parseISO(date), 'dd/MM'), // Changed from 'MMM dd' to 'dd/MM'
                        sortKey: date,
                        amountA: dataA[date] || null,
                        amountB: dataB[date] || null,
                    };
                } catch (error) {
                    console.warn('Invalid date in combined data:', date);
                    return null;
                }
            })
            .filter(item => item !== null) // Remove invalid entries
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        
        return combinedData;

    }, [receiptsA, receiptsB]);

    if (loading) {
        return <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Spending Trend</CardTitle>
                {receiptsB && <CardDescription>Period A vs Period B</CardDescription>}
            </CardHeader>
            <CardContent>
                {chartData.length > 0 ? (
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => formatCurrency(val, userCurrency)} />
                                <Tooltip
                                    formatter={(value, name) => [formatCurrency(value, userCurrency), name === 'amountA' ? 'Period A' : 'Period B']}
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                />
                                {receiptsB && <Legend />}
                                <Line
                                    type="monotone"
                                    dataKey={receiptsB ? "amountA" : "amount"}
                                    name="Period A"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    connectNulls
                                />
                                {receiptsB && (
                                    <Line
                                        type="monotone"
                                        dataKey="amountB"
                                        name="Period B"
                                        stroke="#a78bfa"
                                        strokeWidth={2}
                                        connectNulls
                                    />
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-64 flex items-center justify-center text-slate-500">
                        No trend data for this period.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
