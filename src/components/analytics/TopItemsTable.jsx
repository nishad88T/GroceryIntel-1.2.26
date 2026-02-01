import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const SORT_OPTIONS = [
    { value: 'total_spend', label: 'Highest Total Spend' },
    { value: 'quantity', label: 'Most Items Bought' },
    { value: 'avg_price', label: 'Highest Avg Price' },
    { value: 'frequency', label: 'Most Frequent Purchases' }
];

export default function TopItemsTable({ receipts, loading, title = "Top Items" }) {
    const [userCurrency, setUserCurrency] = useState('GBP');
    const [sortBy, setSortBy] = useState('total_spend');
    
    useEffect(() => { User.me().then(user => user && user.currency && setUserCurrency(user.currency)); }, []);

    const processedItems = useMemo(() => {
        if (!receipts || receipts.length === 0) return [];
        
        const itemStats = {};
        receipts.forEach(receipt => {
            (receipt.items || []).forEach(item => {
                const name = item.name || 'Unnamed Item';
                if (!itemStats[name]) {
                    itemStats[name] = { 
                        name, 
                        totalSpend: 0, 
                        quantity: 0, 
                        purchases: 0,
                        totalPrice: 0
                    };
                }
                itemStats[name].totalSpend += item.total_price || 0;
                itemStats[name].quantity += item.quantity || 1;
                itemStats[name].purchases += 1;
                itemStats[name].totalPrice += item.total_price || 0;
            });
        });
        
        return Object.values(itemStats).map(item => ({
            ...item,
            avgPrice: item.totalSpend / item.quantity
        }));
    }, [receipts]);

    const sortedItems = useMemo(() => {
        const items = [...processedItems];
        switch(sortBy) {
            case 'total_spend':
                return items.sort((a, b) => b.totalSpend - a.totalSpend);
            case 'quantity':
                return items.sort((a, b) => b.quantity - a.quantity);
            case 'avg_price':
                return items.sort((a, b) => b.avgPrice - a.avgPrice);
            case 'frequency':
                return items.sort((a, b) => b.purchases - a.purchases);
            default:
                return items.sort((a, b) => b.totalSpend - a.totalSpend);
        }
    }, [processedItems, sortBy]);

    const topItems = sortedItems.slice(0, 10);
    
    if(loading) return <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>;

    return (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
                    <CardTitle className="text-base md:text-xl">{title}</CardTitle>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full md:w-64 text-xs md:text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SORT_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value} className="text-xs md:text-sm">
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                {topItems.length > 0 ? (
                    <ScrollArea className="w-full whitespace-nowrap">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs md:text-sm min-w-[120px] md:min-w-[200px]">Item</TableHead>
                                    <TableHead className="text-right text-xs md:text-sm min-w-[90px]">Total Spent</TableHead>
                                    <TableHead className="text-right text-xs md:text-sm min-w-[70px]">Quantity</TableHead>
                                    <TableHead className="text-right text-xs md:text-sm min-w-[80px]">Avg Price</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topItems.map((item, index) => (
                                    <TableRow key={item.name}>
                                        <TableCell className="font-medium text-xs md:text-sm">
                                            <div className="truncate max-w-[120px] md:max-w-none" title={item.name}>
                                                {item.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-xs md:text-sm whitespace-nowrap">
                                            {formatCurrency(item.totalSpend, userCurrency)}
                                        </TableCell>
                                        <TableCell className="text-right text-xs md:text-sm whitespace-nowrap">
                                            {item.quantity}
                                        </TableCell>
                                        <TableCell className="text-right text-xs md:text-sm whitespace-nowrap">
                                            {formatCurrency(item.avgPrice, userCurrency)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                ) : (
                    <div className="text-center py-8 text-slate-500 text-sm">No item data for this period.</div>
                )}
            </CardContent>
        </Card>
    );
}