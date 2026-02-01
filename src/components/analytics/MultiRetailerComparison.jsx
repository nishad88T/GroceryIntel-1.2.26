
import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from '@/components/utils/currency';
import { normalizeStoreName } from '@/components/utils/storeNormalization';
import { User } from '@/entities/all';
import { Store, TrendingDown } from "lucide-react";

export default function MultiRetailerComparison({ receipts, loading }) {
    const [userCurrency, setUserCurrency] = useState('GBP');
    
    useEffect(() => {
        User.me().then(user => user && user.currency && setUserCurrency(user.currency));
    }, []);

    // Memoized computation to avoid recalculation on every render
    const retailerComparison = useMemo(() => {
        if (!receipts || receipts.length === 0) return [];

        const productRetailerMap = {};
        
        // Build product-retailer price map
        receipts.forEach(receipt => {
            const normalizedStore = normalizeStoreName(receipt.supermarket); // Use normalized store name
            (receipt.items || []).forEach(item => {
                const canonicalName = item.canonical_name || item.name;
                if (!canonicalName || !item.price_per_unit) return;
                
                if (!productRetailerMap[canonicalName]) {
                    productRetailerMap[canonicalName] = {};
                }
                if (!productRetailerMap[canonicalName][normalizedStore]) { // Use normalized store name
                    productRetailerMap[canonicalName][normalizedStore] = [];
                }
                
                productRetailerMap[canonicalName][normalizedStore].push(item.price_per_unit); // Use normalized store name
            });
        });

        // Calculate averages and find products available at multiple retailers
        const comparisons = [];
        for (const [product, retailers] of Object.entries(productRetailerMap)) {
            const retailerNames = Object.keys(retailers);
            if (retailerNames.length > 1) { // Product available at multiple retailers
                const retailerAvgs = {};
                retailerNames.forEach(retailer => {
                    const prices = retailers[retailer];
                    retailerAvgs[retailer] = prices.reduce((sum, price) => sum + price, 0) / prices.length;
                });
                
                // Find cheapest and most expensive
                const sortedRetailers = Object.entries(retailerAvgs).sort(([,a], [,b]) => a - b);
                const [cheapestRetailer, cheapestPrice] = sortedRetailers[0];
                const [expensiveRetailer, expensivePrice] = sortedRetailers[sortedRetailers.length - 1];
                
                const priceDiff = expensivePrice - cheapestPrice;
                const percentDiff = ((expensivePrice - cheapestPrice) / cheapestPrice) * 100;
                
                if (percentDiff > 5) { // Only show meaningful differences
                    comparisons.push({
                        product,
                        cheapestRetailer,
                        cheapestPrice,
                        expensiveRetailer,
                        expensivePrice,
                        savings: priceDiff,
                        percentSavings: percentDiff,
                        allRetailers: retailerAvgs
                    });
                }
            }
        }
        
        return comparisons.sort((a, b) => b.percentSavings - a.percentSavings).slice(0, 10);
    }, [receipts]);

    if (loading) {
        return (
            <Card>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-48 w-full" /></CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Store className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                    Multi-Retailer Price Comparison
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                    See where you can save money by shopping at different stores
                </CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 md:p-6">
                {retailerComparison.length > 0 ? (
                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs sm:text-sm">Product</TableHead>
                                    <TableHead className="text-right text-xs sm:text-sm hidden md:table-cell">Cheapest At</TableHead>
                                    <TableHead className="text-right text-xs sm:text-sm hidden md:table-cell">Most Expensive At</TableHead>
                                    <TableHead className="text-right text-xs sm:text-sm">Savings</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {retailerComparison.map((comparison, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium text-xs sm:text-sm">
                                            <div>
                                                <div>{comparison.product}</div>
                                                <div className="md:hidden text-xs text-slate-500 mt-1 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 text-xs">
                                                            {comparison.cheapestRetailer}
                                                        </Badge>
                                                        <span className="text-xs">{formatCurrency(comparison.cheapestPrice, userCurrency)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200 text-xs">
                                                            {comparison.expensiveRetailer}
                                                        </Badge>
                                                        <span className="text-xs">{formatCurrency(comparison.expensivePrice, userCurrency)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right hidden md:table-cell">
                                            <div className="flex flex-col items-end">
                                                <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 text-xs">
                                                    {comparison.cheapestRetailer}
                                                </Badge>
                                                <span className="text-xs sm:text-sm font-semibold mt-1">
                                                    {formatCurrency(comparison.cheapestPrice, userCurrency)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right hidden md:table-cell">
                                            <div className="flex flex-col items-end">
                                                <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200 text-xs">
                                                    {comparison.expensiveRetailer}
                                                </Badge>
                                                <span className="text-xs sm:text-sm font-semibold mt-1">
                                                    {formatCurrency(comparison.expensivePrice, userCurrency)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <Badge className="bg-emerald-600 text-white text-xs">
                                                    <TrendingDown className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                                                    {comparison.percentSavings.toFixed(1)}%
                                                </Badge>
                                                <span className="text-xs sm:text-sm text-emerald-600 font-semibold mt-1">
                                                    Save {formatCurrency(comparison.savings, userCurrency)}
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <Store className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">Shop at multiple retailers to see price comparisons.</p>
                        <p className="text-xs mt-1">We need purchases from at least 2 different stores.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
