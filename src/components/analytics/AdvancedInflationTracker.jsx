import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowUp, ArrowDown, Minus, TrendingUp, Package, AlertTriangle, Eye, Info } from "lucide-react"; // Added Info icon
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { filterReceiptsByPeriod } from '@/components/utils/periodCalculations';

export default function AdvancedInflationTracker({ receipts, loading, onDrillDown, className = "", comparisonPeriods, demoData = null }) {
    const [userCurrency, setUserCurrency] = useState('GBP');

    useEffect(() => {
        User.me().then(user => user && user.currency && setUserCurrency(user.currency));
    }, []);

    const inflationData = useMemo(() => {
        // If demo data is provided, use it directly
        if (demoData) {
            return demoData;
        }

        // Otherwise, use real calculation logic
        if (!receipts || receipts.length === 0 || !comparisonPeriods || !comparisonPeriods.current) {
            return { inflation: [], shrinkflation: [] };
        }

        const currentReceipts = filterReceiptsByPeriod(receipts, comparisonPeriods.current);
        const comparisonReceipts = comparisonPeriods.comparison ? filterReceiptsByPeriod(receipts, comparisonPeriods.comparison) : [];

        // If no comparison period is selected or available, there's nothing to compare.
        if (currentReceipts.length === 0 || comparisonReceipts.length === 0) return { inflation: [], shrinkflation: [] };

        const processItems = (receiptSet) => {
            const itemMap = {};
            receiptSet.forEach(receipt => {
                if (!receipt.purchase_date) return;
                const purchaseDate = new Date(receipt.purchase_date);
                if (isNaN(purchaseDate.getTime())) return;

                (receipt.items || []).forEach(item => {
                    const canonicalName = item.canonical_name || item.name;
                    if (!canonicalName) return;

                    const key = canonicalName.toLowerCase().trim();
                    if (!itemMap[key]) {
                        itemMap[key] = {
                            name: canonicalName,
                            purchases: [],
                        };
                    }
                    const totalPrice = parseFloat(item.total_price) || 0;
                    const quantity = Math.max(1, parseInt(item.quantity) || 1);
                    const pricePerUnit = totalPrice / quantity;

                    itemMap[key].purchases.push({
                        date: purchaseDate,
                        pricePerUnit,
                        totalPrice,
                        quantity,
                        packSize: parseFloat(item.pack_size_value) || 1, // Ensure pack_size_value is parsed as float
                        unit: item.pack_size_unit || 'each',
                        receiptId: receipt.id,
                        supermarket: receipt.supermarket
                    });
                });
            });
            return itemMap;
        };

        const currentPeriodItems = processItems(currentReceipts);
        const comparisonPeriodItems = processItems(comparisonReceipts);

        const inflationItems = [];
        const shrinkflationItems = [];

        Object.keys(currentPeriodItems).forEach(key => {
            // An item must have purchases in both periods to be compared
            if (!comparisonPeriodItems[key] || currentPeriodItems[key].purchases.length === 0 || comparisonPeriodItems[key].purchases.length === 0) return;

            const currentItem = currentPeriodItems[key];
            const comparisonItem = comparisonPeriodItems[key];

            const avgCurrentPrice = currentItem.purchases.reduce((sum, p) => sum + p.pricePerUnit, 0) / currentItem.purchases.length;
            const avgComparisonPrice = comparisonItem.purchases.reduce((sum, p) => sum + p.pricePerUnit, 0) / comparisonItem.purchases.length;
            
            const avgCurrentPackSize = currentItem.purchases.reduce((sum, p) => sum + p.packSize, 0) / currentItem.purchases.length;
            const avgComparisonPackSize = comparisonItem.purchases.reduce((sum, p) => sum + p.packSize, 0) / comparisonItem.purchases.length;

            const allPurchases = [...comparisonItem.purchases, ...currentItem.purchases].sort((a,b) => a.date.getTime() - b.date.getTime());

            // Price Inflation Check
            if (avgComparisonPrice > 0) {
                const priceChange = (avgCurrentPrice - avgComparisonPrice) / avgComparisonPrice;
                if (Math.abs(priceChange) > 0.10) { // 10% threshold for significant price change
                    inflationItems.push({
                        product: currentItem.name,
                        priceChange,
                        avgLastMonth: avgComparisonPrice, // Represents the "before" price (comparison period)
                        avgThisMonth: avgCurrentPrice,     // Represents the "after" price (current period)
                        purchases: allPurchases.map(p => ({
                            ...p, 
                            date: format(p.date, 'yyyy-MM-dd'), 
                            store: p.supermarket
                        }))
                    });
                }
            }

            // Shrinkflation Check
            if (avgComparisonPackSize > 0) {
                const packSizeChange = (avgCurrentPackSize - avgComparisonPackSize) / avgComparisonPackSize;
                const priceChangeForShrink = (avgCurrentPrice - avgComparisonPrice) / avgComparisonPrice;
                
                // If pack size decreased significantly (more than 5%) and price remained relatively stable (less than 10% change)
                if (packSizeChange < -0.05 && Math.abs(priceChangeForShrink) < 0.1) {
                    shrinkflationItems.push({
                        product: currentItem.name,
                        packSizeChange,
                        packSizeLastMonth: avgComparisonPackSize,
                        packSizeThisMonth: avgCurrentPackSize,
                        unit: currentItem.purchases[0]?.unit || 'each', // Use unit from current period
                        purchases: allPurchases.map(p => ({
                            ...p, 
                            date: format(p.date, 'yyyy-MM-dd'), 
                            store: p.supermarket
                        }))
                    });
                }
            }
        });

        return {
            inflation: inflationItems.sort((a, b) => b.priceChange - a.priceChange), // Most positive price change first
            shrinkflation: shrinkflationItems.sort((a, b) => a.packSizeChange - b.packSizeChange) // Most negative pack size change first
        };
    }, [receipts, comparisonPeriods, demoData]);

    const handleViewClick = (type, item) => {
        if (onDrillDown) {
            onDrillDown(type, item);
        }
    };

    if (loading) {
        return (
            <div className={className}>
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const hasInflationData = inflationData.inflation.length > 0;
    const hasShrinkflationData = inflationData.shrinkflation.length > 0;

    return (
        <div className={className}>
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-orange-600" />
                        Inflation Tracker
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        {demoData ? "Demo: Sample price changes and pack size reductions" : `Compares average prices and pack sizes of items between your selected "${comparisonPeriods?.current?.label || 'current'}" period and the "${comparisonPeriods?.comparison?.label || 'previous'}" period.`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 md:p-6">
                    {!hasInflationData && !hasShrinkflationData ? (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs sm:text-sm">
                                No significant inflation or shrinkflation detected between the selected periods. Ensure you have repeat items in both periods to enable this analysis.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-4">
                                {hasInflationData ? (
                                    <div className="space-y-4">
                                        <p className="text-xs sm:text-sm text-slate-600">
                                            Comparing average price per unit in the "{comparisonPeriods?.current?.label || 'current'}" period to the "{comparisonPeriods?.comparison?.label || 'previous'}" period.
                                        </p>
                                        <div className="overflow-x-auto -mx-2 sm:mx-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="text-xs sm:text-sm">Item</TableHead>
                                                        <TableHead className="text-xs sm:text-sm hidden md:table-cell">Comparison Avg</TableHead>
                                                        <TableHead className="text-xs sm:text-sm hidden md:table-cell">Current Avg</TableHead>
                                                        <TableHead className="text-xs sm:text-sm">Change</TableHead>
                                                        <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {inflationData.inflation.map((item, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell className="font-medium text-xs sm:text-sm">
                                                                <div>
                                                                    <div>{item.product}</div>
                                                                    <div className="md:hidden text-xs text-slate-500 mt-1">
                                                                        {formatCurrency(item.avgLastMonth, userCurrency)} → {formatCurrency(item.avgThisMonth, userCurrency)}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="hidden md:table-cell text-xs sm:text-sm">{formatCurrency(item.avgLastMonth, userCurrency)}</TableCell>
                                                            <TableCell className="hidden md:table-cell text-xs sm:text-sm">{formatCurrency(item.avgThisMonth, userCurrency)}</TableCell>
                                                            <TableCell>
                                                                <Badge className={`text-xs ${item.priceChange > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                                                    {item.priceChange > 0 ? <ArrowUp className="w-2 h-2 sm:w-3 sm:h-3 mr-1" /> : <ArrowDown className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />}
                                                                    {(item.priceChange * 100).toFixed(1)}%
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button size="sm" variant="outline" onClick={() => handleViewClick('inflation', item)} className="text-xs px-2 py-1">
                                                                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                                                                    <span className="hidden sm:inline">View</span>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                ) : (
                                    <Alert>
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription className="text-xs sm:text-sm">
                                            No significant price changes detected between the selected periods.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}