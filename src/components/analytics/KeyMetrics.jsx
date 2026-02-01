
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { ArrowUp, ArrowDown } from 'lucide-react';

const StatCard = ({ title, value, loading }) => (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold text-slate-900">{value}</div>}
        </CardContent>
    </Card>
);

const ComparisonStatCard = ({ title, valueA, valueB, loading, formatFn }) => {
    // Handle null/undefined values safely
    const safeValueA = valueA || 0;
    const safeValueB = valueB || 0;
    const diff = safeValueA - safeValueB;
    const percentDiff = safeValueB !== 0 ? (diff / safeValueB) * 100 : 0;
    const isIncrease = diff > 0;

    return (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? <Skeleton className="h-8 w-24" /> : (
                    <>
                        <div className="text-2xl font-bold text-slate-900">{formatFn(safeValueA)}</div>
                        <div className="flex items-center text-sm text-slate-600">
                            vs {formatFn(safeValueB)}
                            {percentDiff !== 0 && (
                                <span className={`ml-2 flex items-center font-semibold ${isIncrease ? 'text-red-500' : 'text-green-500'}`}>
                                    {isIncrease ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                                    {Math.abs(percentDiff).toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
};

export default function KeyMetrics({ receiptsA, receiptsB, loading, className }) {
    const [userCurrency, setUserCurrency] = useState('GBP');
    useEffect(() => { User.me().then(user => user && user.currency && setUserCurrency(user.currency)); }, []);

    const calculateMetrics = (receipts) => {
        if (!receipts || receipts.length === 0) return { totalSpend: 0, totalItems: 0, numReceipts: 0, avgSpend: 0 };
        
        const totalSpend = receipts.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
        const totalItems = receipts.reduce((sum, r) => {
            const items = r.items || [];
            return sum + items.reduce((itemSum, item) => itemSum + (parseInt(item.quantity) || 1), 0);
        }, 0);
        
        return {
            totalSpend,
            totalItems,
            numReceipts: receipts.length,
            avgSpend: receipts.length > 0 ? totalSpend / receipts.length : 0
        };
    };

    const metricsA = calculateMetrics(receiptsA || []);
    const metricsB = receiptsB ? calculateMetrics(receiptsB) : null;

    const StatComponent = receiptsB ? ComparisonStatCard : StatCard;

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 ${className}`}>
            <StatComponent
                title="Total Spend"
                value={formatCurrency(metricsA.totalSpend, userCurrency)}
                valueA={metricsA.totalSpend}
                valueB={metricsB?.totalSpend}
                formatFn={(val) => formatCurrency(val, userCurrency)}
                loading={loading}
            />
            <StatComponent
                title="No. of Receipts"
                value={metricsA.numReceipts}
                valueA={metricsA.numReceipts}
                valueB={metricsB?.numReceipts}
                formatFn={(val) => val}
                loading={loading}
            />
            <StatComponent
                title="No. of Items"
                value={metricsA.totalItems}
                valueA={metricsA.totalItems}
                valueB={metricsB?.totalItems}
                formatFn={(val) => val}
                loading={loading}
            />
            <StatComponent
                title="Avg Spend / Receipt"
                value={formatCurrency(metricsA.avgSpend, userCurrency)}
                valueA={metricsA.avgSpend}
                valueB={metricsB?.avgSpend}
                formatFn={(val) => formatCurrency(val, userCurrency)}
                loading={loading}
            />
        </div>
    );
}
