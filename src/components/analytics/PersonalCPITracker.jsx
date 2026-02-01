
import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { TrendingUp, TrendingDown, ShoppingBasket, Calendar } from "lucide-react";
import { subMonths, format, isWithinInterval } from 'date-fns';

export default function PersonalCPITracker({ receipts, loading, className = "" }) {
    const [userCurrency, setUserCurrency] = useState('GBP');
    
    useEffect(() => {
        User.me().then(user => user && user.currency && setUserCurrency(user.currency));
    }, []);

    // Memoized computation for personal CPI calculation
    const cpiAnalysis = useMemo(() => {
        if (!receipts || receipts.length === 0) return null;

        const now = new Date();
        const thisMonth = { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
        const lastMonth = { 
            start: new Date(now.getFullYear(), now.getMonth() - 1, 1), 
            end: new Date(now.getFullYear(), now.getMonth(), 0) 
        };
        const threeMonthsAgo = {
            start: new Date(now.getFullYear(), now.getMonth() - 3, 1),
            end: new Date(now.getFullYear(), now.getMonth() - 2, 0)
        };

        // Filter receipts by periods
        const thisMonthReceipts = receipts.filter(r => 
            r.purchase_date && isWithinInterval(new Date(r.purchase_date), thisMonth)
        );
        const lastMonthReceipts = receipts.filter(r => 
            r.purchase_date && isWithinInterval(new Date(r.purchase_date), lastMonth)
        );
        const threeMonthsAgoReceipts = receipts.filter(r => 
            r.purchase_date && isWithinInterval(new Date(r.purchase_date), threeMonthsAgo)
        );

        // Build product baskets for each period
        const buildBasket = (periodReceipts) => {
            const basket = {};
            periodReceipts.forEach(receipt => {
                (receipt.items || []).forEach(item => {
                    const canonicalName = item.canonical_name || item.name;
                    if (!canonicalName || !item.price_per_unit || item.price_per_unit <= 0) return;
                    
                    if (!basket[canonicalName]) {
                        basket[canonicalName] = { totalSpent: 0, totalQuantity: 0, avgPrice: 0 };
                    }
                    basket[canonicalName].totalSpent += parseFloat(item.total_price) || 0;
                    basket[canonicalName].totalQuantity += parseInt(item.quantity) || 1;
                });
            });
            
            // Calculate average prices
            Object.keys(basket).forEach(product => {
                if (basket[product].totalQuantity > 0) {
                    basket[product].avgPrice = basket[product].totalSpent / basket[product].totalQuantity;
                }
            });
            
            return basket;
        };

        const thisMonthBasket = buildBasket(thisMonthReceipts);
        const lastMonthBasket = buildBasket(lastMonthReceipts);
        const threeMonthBasket = buildBasket(threeMonthsAgoReceipts);

        // Find common products (user's regular basket)
        const commonProducts = Object.keys(thisMonthBasket).filter(product => 
            lastMonthBasket[product] && threeMonthBasket[product]
        );

        if (commonProducts.length < 3) return null; // Need at least 3 common products

        // Calculate CPI for common basket
        const calculateCPI = (currentBasket, baselineBasket, products) => {
            let totalCurrentCost = 0;
            let totalBaselineCost = 0;
            let validProducts = 0;

            products.forEach(product => {
                if (currentBasket[product] && baselineBasket[product]) {
                    const currentQty = currentBasket[product].totalQuantity;
                    const currentPrice = currentBasket[product].avgPrice;
                    const baselinePrice = baselineBasket[product].avgPrice;
                    
                    totalCurrentCost += currentQty * currentPrice;
                    totalBaselineCost += currentQty * baselinePrice;
                    validProducts++;
                }
            });

            return validProducts > 0 ? (totalCurrentCost / totalBaselineCost - 1) * 100 : 0;
        };

        const monthlyInflation = calculateCPI(thisMonthBasket, lastMonthBasket, commonProducts);
        const quarterlyInflation = calculateCPI(thisMonthBasket, threeMonthBasket, commonProducts);

        // Calculate basket value
        const currentBasketValue = commonProducts.reduce((sum, product) => {
            const item = thisMonthBasket[product];
            return sum + (item ? item.totalSpent : 0);
        }, 0);

        const lastMonthBasketValue = commonProducts.reduce((sum, product) => {
            const item = lastMonthBasket[product];
            return sum + (item ? item.totalSpent : 0);
        }, 0);

        return {
            monthlyInflation,
            quarterlyInflation,
            currentBasketValue,
            lastMonthBasketValue,
            commonProductsCount: commonProducts.length,
            topInflatedProducts: commonProducts
                .map(product => ({
                    name: product,
                    currentPrice: thisMonthBasket[product]?.avgPrice || 0,
                    lastMonthPrice: lastMonthBasket[product]?.avgPrice || 0
                }))
                .filter(p => p.currentPrice > 0 && p.lastMonthPrice > 0)
                .map(p => ({
                    ...p,
                    inflation: ((p.currentPrice - p.lastMonthPrice) / p.lastMonthPrice) * 100
                }))
                .sort((a, b) => b.inflation - a.inflation)
                .slice(0, 3)
        };
    }, [receipts]);

    if (loading) {
        return (
            <Card className={className}>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-32 w-full" /></CardContent>
            </Card>
        );
    }

    if (!cpiAnalysis) {
        return (
            <Card className={`${className} border-none shadow-lg bg-white/80 backdrop-blur-sm`}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingBasket className="w-12 h-12 text-emerald-600" />
                        Personal Inflation Index
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8 text-slate-500">
                    <ShoppingBasket className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Not enough data for personal CPI calculation.</p>
                    <p className="text-sm">Keep shopping regularly to see your personal inflation rate.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={`${className} border-none shadow-lg bg-white/80 backdrop-blur-sm`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <ShoppingBasket className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                    Personal Inflation Index
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                    Your regular basket inflation compared to your historical spending
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-2 sm:p-4 md:p-6">
                {/* Monthly CPI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-slate-600">Monthly Inflation</span>
                            <Badge 
                                className={`text-xs ${cpiAnalysis.monthlyInflation > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                            >
                                {cpiAnalysis.monthlyInflation > 0 ? (
                                    <TrendingUp className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                                ) : (
                                    <TrendingDown className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                                )}
                                {Math.abs(cpiAnalysis.monthlyInflation).toFixed(1)}%
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">vs. last month</p>
                    </div>
                    
                    <div className="p-3 sm:p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-slate-600">Quarterly Inflation</span>
                            <Badge 
                                className={`text-xs ${cpiAnalysis.quarterlyInflation > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                            >
                                {cpiAnalysis.quarterlyInflation > 0 ? (
                                    <TrendingUp className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                                ) : (
                                    <TrendingDown className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                                )}
                                {Math.abs(cpiAnalysis.quarterlyInflation).toFixed(1)}%
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">vs. 3 months ago</p>
                    </div>
                </div>

                {/* Basket Value Comparison */}
                <div className="p-3 sm:p-4 bg-emerald-50 rounded-lg">
                    <h4 className="font-semibold text-sm sm:text-base text-emerald-800 mb-2">Your Regular Basket</h4>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                        <div>
                            <p className="text-xs sm:text-sm text-emerald-700">
                                {cpiAnalysis.commonProductsCount} regular items
                            </p>
                            <p className="text-sm sm:text-base text-emerald-600 font-semibold">
                                This month: {formatCurrency(cpiAnalysis.currentBasketValue, userCurrency)}
                            </p>
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="text-xs sm:text-sm text-slate-600">Last month</p>
                            <p className="text-sm sm:text-base text-slate-700 font-semibold">
                                {formatCurrency(cpiAnalysis.lastMonthBasketValue, userCurrency)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Top Inflated Products */}
                {cpiAnalysis.topInflatedProducts.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm sm:text-base text-slate-800 mb-2">Biggest Price Changes</h4>
                        <div className="space-y-2">
                            {cpiAnalysis.topInflatedProducts.map((product, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                    <span className="text-xs sm:text-sm font-medium text-slate-700 truncate max-w-[60%]">{product.name}</span>
                                    <Badge 
                                        variant="outline" 
                                        className={`text-xs ${product.inflation > 0 ? "text-red-600 border-red-200" : "text-green-600 border-green-200"}`}
                                    >
                                        {product.inflation > 0 ? '+' : ''}{product.inflation.toFixed(1)}%
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
