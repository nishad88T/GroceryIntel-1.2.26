
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus, Info } from "lucide-react";
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { Skeleton } from '@/components/ui/skeleton';

const normalizeItemName = (name) => {
  if (!name) return '';
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
};

const InflationBadge = ({ change }) => {
    if (change === 0) {
        return <Badge variant="outline" className="text-slate-600"><Minus className="w-3 h-3 mr-1"/>No Change</Badge>;
    }
    const isIncrease = change > 0;
    const color = isIncrease ? "text-red-600" : "text-green-600";
    const bgColor = isIncrease ? "bg-red-50" : "bg-green-50";
    const Icon = isIncrease ? ArrowUp : ArrowDown;
    
    return (
        <Badge variant="outline" className={`${color} ${bgColor} border-current/50`}>
            <Icon className="w-3 h-3 mr-1" />
            {isIncrease ? '+' : ''}{(change * 100).toFixed(1)}%
        </Badge>
    );
};

export default function InflationTracker({ receipts, loading }) {
    const [userCurrency, setUserCurrency] = React.useState('GBP');
    React.useEffect(() => { User.me().then(user => user && user.currency && setUserCurrency(user.currency)); }, []);

    const inflationData = useMemo(() => {
        if (!receipts || receipts.length === 0) return [];

        const itemPrices = {};
        receipts.forEach(receipt => {
            const month = new Date(receipt.purchase_date).toISOString().slice(0, 7); // YYYY-MM
            (receipt.items || []).forEach(item => {
                const normalizedName = normalizeItemName(item.name);
                if (!normalizedName || !item.unit_price) return;
                
                if (!itemPrices[normalizedName]) {
                    itemPrices[normalizedName] = {};
                }
                if (!itemPrices[normalizedName][month]) {
                    itemPrices[normalizedName][month] = [];
                }
                itemPrices[normalizedName][month].push(item.unit_price);
            });
        });

        const inflationItems = [];
        const thisMonth = new Date().toISOString().slice(0, 7);
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonth = lastMonthDate.toISOString().slice(0, 7);

        for (const name in itemPrices) {
            const pricesThisMonth = itemPrices[name][thisMonth];
            const pricesLastMonth = itemPrices[name][lastMonth];

            if (pricesThisMonth && pricesLastMonth) {
                const avgThisMonth = pricesThisMonth.reduce((a, b) => a + b, 0) / pricesThisMonth.length;
                const avgLastMonth = pricesLastMonth.reduce((a, b) => a + b, 0) / pricesLastMonth.length;
                
                if (avgLastMonth > 0) {
                    inflationItems.push({
                        name,
                        avgLastMonth,
                        avgThisMonth,
                        change: (avgThisMonth - avgLastMonth) / avgLastMonth
                    });
                }
            }
        }
        return inflationItems.sort((a,b) => b.change - a.change);
    }, [receipts]);

    if (loading) return <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Personal Inflation Tracker</CardTitle>
                <CardDescription className="flex items-center gap-2">
                    <Info className="w-4 h-4"/>
                    Price changes for items you bought both this month and last month.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {inflationData.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Last Month Avg.</TableHead>
                                <TableHead className="text-right">This Month Avg.</TableHead>
                                <TableHead className="text-right">Change</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inflationData.map(item => (
                                <TableRow key={item.name}>
                                    <TableCell className="font-medium capitalize">{item.name}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.avgLastMonth, userCurrency)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.avgThisMonth, userCurrency)}</TableCell>
                                    <TableCell className="text-right"><InflationBadge change={item.change} /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <p>Not enough data for inflation tracking.</p>
                        <p className="text-sm">Keep scanning receipts this month and next to see this report.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
