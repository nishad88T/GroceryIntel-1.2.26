import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, AlertTriangle, Eye, Activity } from "lucide-react";
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { filterReceiptsByPeriod } from '@/components/utils/periodCalculations';

export default function VolatilityDashboard({ receipts, loading, onDrillDown, className = "", comparisonPeriods, demoData = null }) {
    const [userCurrency, setUserCurrency] = useState('GBP');

    useEffect(() => {
        User.me().then(user => user && user.currency && setUserCurrency(user.currency));
    }, []);

    const volatilityData = useMemo(() => {
        // If demo data is provided, use it directly
        if (demoData) {
            return demoData;
        }

        // Otherwise, use real calculation logic
        if (!receipts || receipts.length === 0 || !comparisonPeriods || !comparisonPeriods.current) {
            return [];
        }

        const relevantReceipts = filterReceiptsByPeriod(receipts, comparisonPeriods.current);
        if (relevantReceipts.length === 0) return [];

        const itemPurchases = {};

        relevantReceipts.forEach(receipt => {
            const purchaseDate = new Date(receipt.purchase_date);
            if (isNaN(purchaseDate.getTime())) return;

            (receipt.items || []).forEach(item => {
                const canonicalName = item.canonical_name || item.name;
                if (!canonicalName) return;

                // CRITICAL FIX: Filter out negative prices (returns/refunds)
                const totalPrice = parseFloat(item.total_price) || 0;
                if (totalPrice <= 0) return; // Skip returns, refunds, or zero-price items

                const key = canonicalName.toLowerCase().trim();
                if (!itemPurchases[key]) {
                    itemPurchases[key] = {
                        name: canonicalName,
                        purchases: []
                    };
                }

                // Normalize price by quantity to get price per unit
                const quantity = Math.max(1, parseInt(item.quantity) || 1);
                const pricePerUnit = totalPrice / quantity;

                itemPurchases[key].purchases.push({
                    date: purchaseDate,
                    pricePerUnit: pricePerUnit,
                    totalPrice: totalPrice,
                    quantity: quantity,
                    packSize: item.pack_size_value || 1,
                    unit: item.pack_size_unit || 'each',
                    receiptId: receipt.id,
                    supermarket: receipt.supermarket
                });
            });
        });

        const volatilityItems = [];

        Object.values(itemPurchases).forEach(item => {
            if (item.purchases.length < 2) return; // Need at least 2 purchases in the period for volatility

            // Sort purchases by date
            item.purchases.sort((a, b) => a.date.getTime() - b.date.getTime());

            // Use normalized price per unit for volatility calculation
            const prices = item.purchases.map(p => p.pricePerUnit);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

            // Calculate coefficient of variation (standard deviation / mean)
            const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
            const stdDev = Math.sqrt(variance);
            const coefficientOfVariation = avgPrice > 0 ? stdDev / avgPrice : 0;

            // Only include items with significant volatility (>10% coefficient of variation)
            if (coefficientOfVariation > 0.1) {
                // Create purchase history for drill-down with proper data structure
                const purchaseHistory = item.purchases.map(p => ({
                    date: format(p.date, 'yyyy-MM-dd'),
                    store: p.supermarket,
                    totalPrice: p.totalPrice,
                    quantity: p.quantity,
                    pricePerUnit: p.pricePerUnit,
                    packSize: p.packSize,
                    unit: p.unit,
                    receiptId: p.receiptId
                }));

                volatilityItems.push({
                    product: item.name,
                    minPrice,
                    maxPrice,
                    avgPrice,
                    volatility: coefficientOfVariation,
                    priceRange: maxPrice - minPrice,
                    purchaseCount: item.purchases.length,
                    purchases: purchaseHistory
                });
            }
        });

        return volatilityItems.sort((a, b) => b.volatility - a.volatility);
    }, [receipts, comparisonPeriods, demoData]);

    const handleViewClick = (item) => {
        if (onDrillDown) {
            onDrillDown('volatility', item);
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

    return (
        <div className={className}>
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-6 h-6 text-purple-600" />
                        Price Volatility Dashboard
                    </CardTitle>
                    <CardDescription>
                        {demoData ? "Demo: Sample items with price variations" : `Items with significant price variations across your purchases (normalized by quantity). Analysis period: ${comparisonPeriods?.current?.from ? format(new Date(comparisonPeriods.current.from), 'MMM d, yyyy') : ''} - ${comparisonPeriods?.current?.to ? format(new Date(comparisonPeriods.current.to), 'MMM d, yyyy') : 'present'}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {volatilityData.length === 0 ? (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Not enough purchase data to detect price volatility within the selected period. Keep scanning receipts to identify items with fluctuating prices.
                                {receipts && receipts.length > 0 && (
                                    <span className="block mt-2 text-xs">
                                        Currently tracking {receipts.length} total receipts. Need at least 2 purchases of the same item within the selected period to measure volatility.
                                    </span>
                                )}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600">
                                Items sorted by price volatility (prices normalized by quantity)
                            </p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Price Range (per unit)</TableHead>
                                        <TableHead>Average Price (per unit)</TableHead>
                                        <TableHead>Volatility</TableHead>
                                        <TableHead>Purchase Count</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {volatilityData.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{item.product}</TableCell>
                                            <TableCell>
                                                {formatCurrency(item.minPrice, userCurrency)} - {formatCurrency(item.maxPrice, userCurrency)}
                                            </TableCell>
                                            <TableCell>{formatCurrency(item.avgPrice, userCurrency)}</TableCell>
                                            <TableCell>
                                                <Badge className={
                                                    item.volatility > 0.3 ? "bg-red-100 text-red-700" :
                                                    item.volatility > 0.2 ? "bg-orange-100 text-orange-700" :
                                                    "bg-yellow-100 text-yellow-700"
                                                }>
                                                    <TrendingUp className="w-3 h-3 mr-1" />
                                                    {(item.volatility * 100).toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{item.purchaseCount}</TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="outline" onClick={() => handleViewClick(item)}>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}