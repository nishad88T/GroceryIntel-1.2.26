import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ShoppingBasket, Info, ArrowUp, ArrowDown } from "lucide-react";
import { User } from '@/entities/all';
import { formatCurrency } from '@/components/utils/currency';

const InsightInfo = ({ basketSize }) => (
    <div className="space-y-3 p-1">
        <h4 className="font-semibold text-slate-800">What is Personal Basket Inflation?</h4>
        <p className="text-sm text-slate-600">
            This metric calculates the inflation rate for <strong className="font-medium">your personal "Core Basket" of goods</strong>. It's more accurate than national CPI because it's based on what <em className="font-medium">you</em> actually buy.
        </p>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <h5 className="font-semibold text-emerald-900 text-sm">How is the "Core Basket" determined?</h5>
            <p className="text-xs text-emerald-800 mt-1">
                The app analyzes your purchase history over the last 6 months to find your {basketSize ? `top ${basketSize}` : `most frequent`} staple items. This ensures a stable and realistic comparison, period over period.
            </p>
        </div>
        <p className="text-sm text-slate-600">
            The percentage shows how much more (or less) it cost to buy these same core items in the current period compared to what they would have cost in the comparison period.
        </p>
    </div>
);

export default function BasketInflationInsight({ insight, loading, receipts, comparisonPeriods, inflationComparisonData, selectedPeriod }) {
    const [userCurrency, setUserCurrency] = useState('GBP');
    
    useEffect(() => { 
        User.me().then(user => user && user.currency && setUserCurrency(user.currency)); 
    }, []);
    
    // Map selectedPeriod to API period format
    const getPeriodKey = (preset) => {
        const mapping = {
            'month-on-month': '1_month',
            '3-months-ago': '3_month',
            '6-months-ago': '6_month',
            'year-on-year': '12_month'
        };
        return mapping[preset] || '1_month';
    };
    
    const periodKey = getPeriodKey(selectedPeriod);
    const categoryComparison = inflationComparisonData?.comparison?.[periodKey]?.by_category || null;

    if (loading) {
        return <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>;
    }

    const hasPersonalData = insight && insight.itemBreakdown && insight.basketSize >= 3;
    const userCountry = inflationComparisonData?.user_country;
    const sourceLabel = userCountry 
        ? `${userCountry.statistical_source} ${userCountry.country_code} Inflation`
        : 'National Inflation';
    
    return (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingBasket className="w-5 h-5 text-emerald-600" />
                        Personal Basket Inflation
                    </CardTitle>
                    {hasPersonalData && (
                        <CardDescription>
                            Your inflation for a core basket of {insight.basketSize} items.
                        </CardDescription>
                    )}
                </div>
                {hasPersonalData && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-500">
                                <Info className="w-4 h-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <InsightInfo basketSize={insight.basketSize} />
                            </DialogHeader>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent>
                {hasPersonalData ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center space-x-4">
                            {insight.value > 0 ? 
                                <TrendingUp className="w-12 h-12 text-red-500" /> : 
                                <TrendingDown className="w-12 h-12 text-green-500" />
                            }
                            <div>
                                <p className="text-4xl font-bold" style={{ color: insight.value > 0 ? '#ef4444' : '#22c55e' }}>
                                    {insight.value > 0 ? '+' : ''}{(insight.value * 100).toFixed(2)}%
                                </p>
                                <p className="text-slate-600">Your personal inflation rate</p>
                            </div>
                        </div>
                        
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto whitespace-nowrap">View Breakdown</Button>
                            </DialogTrigger>
                            <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Basket Inflation Breakdown</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                                        <div>
                                            <p className="text-sm text-slate-600">Current Period Cost</p>
                                            <p className="text-xl font-bold">{formatCurrency(insight.currentBasketCost, userCurrency)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-600">Previous Period Equivalent Cost</p>
                                            <p className="text-xl font-bold">{formatCurrency(insight.comparisonBasketCost, userCurrency)}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                                        <div className="min-w-[700px]">
                                            <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>Qty Bought</TableHead>
                                                    <TableHead>Previous Avg Price</TableHead>
                                                    <TableHead>Current Avg Price</TableHead>
                                                    <TableHead>Price Change</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {insight.itemBreakdown.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium">{item.name}</TableCell>
                                                        <TableCell>{item.quantity.toFixed(0)}</TableCell>
                                                        <TableCell>{formatCurrency(item.comparisonAvgPrice, userCurrency)}</TableCell>
                                                        <TableCell>{formatCurrency(item.currentAvgPrice, userCurrency)}</TableCell>
                                                        <TableCell>
                                                            <Badge className={item.inflation > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                                                                {item.inflation > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                                                {item.inflation > 0 ? '+' : ''}{(item.inflation * 100).toFixed(1)}%
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        </div>
                                        </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                ) : (
                    <div className="text-center py-4 text-slate-500">
                        <p className="font-medium">Not enough personal data for this period</p>
                        <p className="text-xs mt-2">Try selecting a different comparison period or ensure you have at least 3 identical staple items purchased in both periods.</p>
                    </div>
                )}
                
                {categoryComparison && Object.keys(categoryComparison).length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                Category Inflation: You vs National
                            </h4>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-slate-500">
                                        <Info className="w-4 h-4 mr-1" />
                                        What do these mean?
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle>💡 Understanding Your Inflation Data</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 text-sm">
                                        <div>
                                            <p className="font-semibold text-slate-900">Your Spending</p>
                                            <p className="text-slate-600">How much more (or less) you spent on this category</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">Like-for-Like Price</p>
                                            <p className="text-slate-600">The actual price change for the same items</p>
                                            <p className="text-xs text-slate-500 mt-1">• Removes the effect of buying more or less<br/>• Shows true inflation you're experiencing</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">What's Driving This</p>
                                            <div className="space-y-1 mt-2 text-slate-600">
                                                <p>🛒 You bought more/less items</p>
                                                <p>💰 Prices went up more than average</p>
                                                <p>💡 You found better deals</p>
                                                <p>⚖️ Balanced mix of factors</p>
                                                <p>🆕 New category for you</p>
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Your Spending</TableHead>
                                        <TableHead className="text-right">Like-for-Like Price</TableHead>
                                        <TableHead className="text-right">{sourceLabel}</TableHead>
                                        <TableHead className="text-right">What's Driving This?</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(categoryComparison)
                                        .filter(([category, data]) => category !== 'overall' && (typeof data.personal_rate === 'number' || typeof data.official_rate === 'number'))
                                        .sort(([, a], [, b]) => {
                                            const varianceA = a.variance !== null ? Math.abs(a.variance) : 0;
                                            const varianceB = b.variance !== null ? Math.abs(b.variance) : 0;
                                            return varianceB - varianceA;
                                        })
                                        .map(([category, data]) => (
                                            <TableRow key={category}>
                                                <TableCell className="font-medium capitalize">
                                                    {category.replace(/_/g, ' ')}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {typeof data.personal_rate === 'number' ? (
                                                        <Badge className={data.personal_rate > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                                                            {data.personal_rate > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                                            {data.personal_rate > 0 ? '+' : ''}{data.personal_rate.toFixed(1)}%
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {typeof data.like_for_like === 'number' ? (
                                                        <div className="flex flex-col items-end gap-1">
                                                            <Badge variant="outline" className={data.like_for_like > 0 ? "text-red-600 border-red-300" : "text-green-600 border-green-300"}>
                                                                {data.like_for_like > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                                                {data.like_for_like > 0 ? '+' : ''}{data.like_for_like.toFixed(1)}%
                                                            </Badge>
                                                            {data.common_items > 0 && data.common_items < 3 && (
                                                                <span className="text-xs text-slate-400">Based on {data.common_items} item{data.common_items > 1 ? 's' : ''}</span>
                                                            )}
                                                        </div>
                                                    ) : data.primary_driver === '🆕 New category' ? (
                                                        <span className="text-slate-400 text-sm">New category</span>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {typeof data.official_rate === 'number' ? (
                                                        <Badge variant="outline" className={data.official_rate > 0 ? "text-slate-600" : "text-slate-600"}>
                                                            {data.official_rate > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                                            {data.official_rate > 0 ? '+' : ''}{data.official_rate.toFixed(1)}%
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className="text-sm">{data.primary_driver}</span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                            The "Like-for-Like Price" column shows actual price changes for items you bought in both periods, separating true inflation from volume changes.
                            <span className="block mt-1 italic text-slate-400">Note: Official statistics are typically released with a one-month lag. Comparisons use the most recently published data aligned with your selected period.</span>
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}