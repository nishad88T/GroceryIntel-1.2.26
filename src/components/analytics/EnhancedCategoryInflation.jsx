import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowUp, ArrowDown, Info, Sparkles, AlertCircle } from "lucide-react";
import { User } from '@/entities/all';
import { Alert, AlertDescription } from "@/components/ui/alert";

const QualityBadge = ({ quality }) => {
    const configs = {
        high: { label: 'High', color: 'bg-green-100 text-green-700 border-green-300' },
        medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
        low: { label: 'Low', color: 'bg-orange-100 text-orange-700 border-orange-300' },
        insufficient: { label: 'Insufficient', color: 'bg-slate-100 text-slate-500 border-slate-300' }
    };
    
    const config = configs[quality] || configs.insufficient;
    
    return (
        <Badge variant="outline" className={`text-xs ${config.color}`}>
            {config.label}
        </Badge>
    );
};

const DriverBadge = ({ driver }) => {
    const configs = {
        'price_driven': { icon: '💰', label: 'Price-driven', color: 'text-red-600' },
        'volume_driven': { icon: '🛒', label: 'Volume-driven', color: 'text-blue-600' },
        'mixed': { icon: '⚖️', label: 'Mixed', color: 'text-purple-600' },
        'new_category': { icon: '🆕', label: 'New category', color: 'text-emerald-600' },
        'insufficient': { icon: '❓', label: 'Insufficient data', color: 'text-slate-400' }
    };
    
    const config = configs[driver] || configs.insufficient;
    
    return (
        <span className={`text-sm font-medium ${config.color}`}>
            {config.icon} {config.label}
        </span>
    );
};

export default function EnhancedCategoryInflation({ 
    categoryData, 
    loading, 
    inflationComparisonData, 
    selectedPeriod,
    llmInterpretation 
}) {
    const [interpretationLoading, setInterpretationLoading] = useState(false);
    const [interpretation, setInterpretation] = useState(llmInterpretation || null);
    
    useEffect(() => {
        setInterpretation(llmInterpretation);
    }, [llmInterpretation]);
    
    if (loading) {
        return (
            <Card>
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-64 w-full" /></CardContent>
            </Card>
        );
    }

    if (!categoryData || Object.keys(categoryData).length === 0) {
        return (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        Enhanced Category Inflation Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-slate-500">
                        <p className="font-medium">Not enough data for category inflation analysis</p>
                        <p className="text-xs mt-2">Add more receipts to unlock detailed category insights.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const userCountry = inflationComparisonData?.user_country;
    const sourceLabel = userCountry 
        ? `${userCountry.statistical_source} ${userCountry.country_code}`
        : 'National';

    const sortedCategories = Object.entries(categoryData)
        .filter(([category]) => category !== 'overall')
        .sort(([, a], [, b]) => {
            // Sort by spending change magnitude
            const aChange = Math.abs(a.spendChange || 0);
            const bChange = Math.abs(b.spendChange || 0);
            return bChange - aChange;
        });

    return (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        Enhanced Category Inflation Analysis
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                        Deep dive into price vs volume changes across spending categories
                    </p>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-500">
                            <Info className="w-4 h-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>💡 Understanding the Enhanced Analysis</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 text-sm">
                            <div>
                                <p className="font-semibold text-slate-900">Total Spend Change</p>
                                <p className="text-slate-600">How much more (or less) you spent overall on this category</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">Price Change</p>
                                <p className="text-slate-600">The actual change in average unit prices for your staple items</p>
                                <p className="text-xs text-slate-500 mt-1">• Based on items you bought in both periods<br/>• Shows true inflation you're experiencing</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">Volume Change</p>
                                <p className="text-slate-600">How much more or less quantity you purchased</p>
                                <p className="text-xs text-slate-500 mt-1">• Normalized by pack sizes and quantities<br/>• Reveals buying behaviour changes</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">Driver of Change</p>
                                <div className="space-y-1 mt-2 text-slate-600">
                                    <p>💰 <strong>Price-driven:</strong> Price changed significantly, volume stable</p>
                                    <p>🛒 <strong>Volume-driven:</strong> You bought more/less, price stable</p>
                                    <p>⚖️ <strong>Mixed:</strong> Both price and volume contributed</p>
                                    <p>🆕 <strong>New category:</strong> First time purchasing in this category</p>
                                </div>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">Data Quality</p>
                                <p className="text-slate-600">Reliability indicator based on number of comparable items:</p>
                                <div className="space-y-1 mt-2 text-xs text-slate-600">
                                    <p>• <strong>High:</strong> ≥4 staple items tracked</p>
                                    <p>• <strong>Medium:</strong> 2-3 staple items</p>
                                    <p>• <strong>Low:</strong> 1 item</p>
                                    <p>• <strong>Insufficient:</strong> No comparable data</p>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="space-y-6">
                {interpretation && (
                    <Alert className="border-emerald-200 bg-emerald-50">
                        <Sparkles className="h-5 w-5 text-emerald-600" />
                        <AlertDescription className="text-emerald-900">
                            <div className="space-y-2">
                                <p className="font-semibold">AI Insights</p>
                                <div className="text-sm whitespace-pre-wrap">{interpretation}</div>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Total Spend</TableHead>
                                <TableHead className="text-right">Price Change</TableHead>
                                <TableHead className="text-right">Volume Change</TableHead>
                                <TableHead className="text-right">{sourceLabel}</TableHead>
                                <TableHead className="text-right">Driver</TableHead>
                                <TableHead className="text-right">Quality</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedCategories.map(([category, data]) => (
                                <TableRow key={category}>
                                    <TableCell className="font-medium capitalize">
                                        {category.replace(/_/g, ' ')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {typeof data.spendChange === 'number' ? (
                                            <Badge className={data.spendChange > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                                                {data.spendChange > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                                {data.spendChange > 0 ? '+' : ''}{data.spendChange.toFixed(1)}%
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-400 text-sm">N/A</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {typeof data.priceChange === 'number' ? (
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge variant="outline" className={data.priceChange > 0 ? "text-red-600 border-red-300" : "text-green-600 border-green-300"}>
                                                    {data.priceChange > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                                    {data.priceChange > 0 ? '+' : ''}{data.priceChange.toFixed(1)}%
                                                </Badge>
                                                {data.stapleItemCount > 0 && (
                                                    <span className="text-xs text-slate-400">{data.stapleItemCount} items</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-sm">N/A</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {typeof data.volumeChange === 'number' ? (
                                            <Badge variant="outline" className={data.volumeChange > 0 ? "text-blue-600 border-blue-300" : "text-orange-600 border-orange-300"}>
                                                {data.volumeChange > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                                {data.volumeChange > 0 ? '+' : ''}{data.volumeChange.toFixed(1)}%
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-400 text-sm">N/A</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {typeof data.officialInflation === 'number' ? (
                                            <Badge variant="outline" className="text-slate-600">
                                                {data.officialInflation > 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                                                {data.officialInflation > 0 ? '+' : ''}{data.officialInflation.toFixed(1)}%
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-400 text-sm">N/A</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DriverBadge driver={data.driver} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <QualityBadge quality={data.quality} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="space-y-2 text-xs text-slate-500">
                    <p>
                        <strong>Price Change</strong> shows actual unit price movements for your staple items (items bought in both periods).
                    </p>
                    <p>
                        <strong>Volume Change</strong> reflects how much more or less quantity you purchased, separating behaviour from inflation.
                    </p>
                    <p className="italic text-slate-400">
                        Note: Official statistics are typically released with a one-month lag. Comparisons use the most recently published data aligned with your selected period.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}