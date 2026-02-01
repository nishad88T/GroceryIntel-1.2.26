
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PiggyBank, TrendingUp, AlertTriangle, ChevronsRight, CalendarClock, Info } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { Badge } from "@/components/ui/badge";
import { differenceInDays, formatDistanceToNowStrict, parseISO } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function BudgetOverview({ activeBudget, thisMonthSpending, budgetProgress, thisMonthReceipts }) {
    const [userCurrency, setUserCurrency] = useState('GBP');

    useEffect(() => {
        User.me().then(user => {
            if (user && user.currency) {
                setUserCurrency(user.currency);
            }
        });
    }, []);

    const categorySpending = {};
    
    thisMonthReceipts.forEach(receipt => {
        receipt.items?.forEach(item => {
            const category = item.category || 'other';
            categorySpending[category] = (categorySpending[category] || 0) + (item.total_price || 0);
        });
    });

    // Calculate days left for the overall budget progress display
    let daysLeft = 0;
    if (activeBudget && activeBudget.period_end) {
        const periodEnd = new Date(activeBudget.period_end);
        if (!isNaN(periodEnd.getTime())) { // Check for valid date
            const now = new Date();
            
            daysLeft = differenceInDays(periodEnd, now);
            if (daysLeft < 0) daysLeft = 0; // Don't show negative days if period ended
        }
    }

    // ADVANCED FORECASTING LOGIC
    const forecast = useMemo(() => {
        if (!activeBudget || !thisMonthReceipts || thisMonthReceipts.length === 0) return null;

        const periodStart = new Date(activeBudget.period_start);
        const periodEnd = new Date(activeBudget.period_end);
        
        // Check for valid dates before proceeding
        if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) return null;

        const now = new Date();

        const daysLeftInPeriod = differenceInDays(periodEnd, now);
        if (daysLeftInPeriod < 0) return null; // Period has ended, no forecast needed

        // --- Smart Forecasting based on shopping cycle ---
        const majorShops = thisMonthReceipts
            .filter(r => r.total_amount > 20) // Define a "major shop" as over £20 (or user's currency)
            .sort((a, b) => parseISO(a.purchase_date).getTime() - parseISO(b.purchase_date).getTime());

        if (majorShops.length >= 2) { // Need at least 2 shops to establish a cycle
            const totalMajorShopValue = majorShops.reduce((sum, r) => sum + r.total_amount, 0);
            const avgMajorShopValue = totalMajorShopValue / majorShops.length;

            const cycleDurations = [];
            for (let i = 1; i < majorShops.length; i++) {
                const duration = differenceInDays(parseISO(majorShops[i].purchase_date), parseISO(majorShops[i-1].purchase_date));
                if (duration > 0) cycleDurations.push(duration);
            }
            const avgCycleDays = cycleDurations.length > 0 ? cycleDurations.reduce((a, b) => a + b, 0) / cycleDurations.length : 7; // Default to 7 if not enough data

            const remainingShops = Math.max(0, Math.floor(daysLeftInPeriod / avgCycleDays));
            const projectedSpend = thisMonthSpending + (remainingShops * avgMajorShopValue);
            
            return {
                projectedSpend,
                onTrack: projectedSpend <= activeBudget.amount,
                avgCycleDays: avgCycleDays.toFixed(1),
                avgMajorShopValue,
                type: 'cycle-based'
            };
        }

        // --- Fallback to simple linear forecasting if not enough data ---
        const totalDaysInPeriod = differenceInDays(periodEnd, periodStart) + 1;
        const daysPassed = differenceInDays(now, periodStart) + 1;

        if (daysPassed > 0 && thisMonthSpending > 0) {
            const avgDailySpend = thisMonthSpending / daysPassed;
            const projectedSpend = avgDailySpend * totalDaysInPeriod;
            return {
                projectedSpend,
                onTrack: projectedSpend <= activeBudget.amount,
                avgDailySpend,
                type: 'linear'
            };
        }

        return null; // Not enough data for any forecast
    }, [activeBudget, thisMonthReceipts, thisMonthSpending]);

    const remainingAmount = activeBudget ? activeBudget.amount - thisMonthSpending : 0;
    const remainingAmountColor = remainingAmount >= 0 ? 'text-emerald-600' : 'text-red-600';

    const categoryColors = {
        meat_fish: "bg-red-500",
        vegetables_fruits: "bg-green-500", 
        dairy_eggs: "bg-blue-500",
        bakery: "bg-yellow-500",
        snacks_sweets: "bg-pink-500",
        beverages: "bg-purple-500",
        household_cleaning: "bg-gray-500",
        personal_care: "bg-indigo-500",
        frozen_foods: "bg-cyan-500",
        pantry_staples: "bg-orange-500",
        other: "bg-slate-500"
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
        >
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <PiggyBank className="w-6 h-6 text-emerald-600" />
                        Budget Overview
                    </CardTitle>
                    <Link to={createPageUrl("Budget")}>
                        <Button variant="outline" size="sm" className="hover:bg-emerald-50 border-emerald-200">
                            Manage Budget
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent className="space-y-6">
                    {activeBudget ? (
                        <TooltipProvider>
                        <>
                            {/* Overall Budget Progress */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
                                    <div>
                                        <p className="text-sm text-slate-600">Spent</p>
                                        <p className="text-xl md:text-2xl font-bold text-slate-900">{formatCurrency(thisMonthSpending, userCurrency)}</p>
                                    </div>
                                    <div className="sm:text-center">
                                        <p className="text-sm text-slate-600">Remaining</p>
                                        <p className={`text-xl md:text-2xl font-bold ${remainingAmountColor}`}>{formatCurrency(remainingAmount, userCurrency)}</p>
                                    </div>
                                    <div className="sm:text-right">
                                        <p className="text-sm text-slate-600">Total Budget</p>
                                        <p className="text-xl md:text-2xl font-bold text-slate-900">{formatCurrency(activeBudget.amount, userCurrency)}</p>
                                    </div>
                                </div>
                                <Progress 
                                    value={budgetProgress} 
                                    className="h-3"
                                    style={{
                                        backgroundColor: budgetProgress > 90 ? '#fecaca' : budgetProgress > 75 ? '#fed7aa' : '#dcfce7'
                                    }}
                                />
                                <div className="flex justify-between text-sm">
                                    <span className={budgetProgress > 90 ? "text-red-600 font-medium" : "text-slate-600"}>
                                        {budgetProgress.toFixed(0)}% used
                                    </span>
                                    <span className="text-slate-600 flex items-center gap-1">
                                        <CalendarClock className="w-4 h-4" />
                                        {daysLeft} days left
                                    </span>
                                </div>
                            </div>
                            
                            {/* Forecast Section */}
                            {forecast && (
                                <div className={`p-4 rounded-lg flex items-start gap-4 ${forecast.onTrack ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className={`p-2 rounded-full ${forecast.onTrack ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                        <ChevronsRight className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-slate-800">Spending Forecast</h4>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="w-4 h-4 text-slate-500 cursor-pointer" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {forecast.type === 'cycle-based' 
                                                      ? <p>Based on your average shopping cycle of {forecast.avgCycleDays} days.</p>
                                                      : <p>Based on your average daily spend so far this period.</p>
                                                    }
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <p className="text-sm text-slate-600">
                                            You are on track to spend <span className="font-bold">{formatCurrency(forecast.projectedSpend, userCurrency)}</span> this period.
                                        </p>
                                        {forecast.type === 'cycle-based' ? (
                                            <Badge variant="outline" className="mt-2 text-xs">
                                                Avg. weekly shop: {formatCurrency(forecast.avgMajorShopValue, userCurrency)}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="mt-2 text-xs">
                                                Avg. {formatCurrency(forecast.avgDailySpend, userCurrency)} / day
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Category Spending */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-slate-700">Top Spending Categories</h4>
                                <div className="space-y-3">
                                    {Object.entries(categorySpending)
                                        .sort(([,a], [,b]) => b - a)
                                        .slice(0, 5)
                                        .map(([category, amount]) => {
                                            const percentage = thisMonthSpending > 0 ? ((amount / thisMonthSpending) * 100).toFixed(0) : 0;
                                            return (
                                                <div key={category} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-3 h-3 rounded-full ${categoryColors[category]}`} />
                                                        <span className="text-sm text-slate-700 capitalize">
                                                            {category.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-slate-900">
                                                            {formatCurrency(amount, userCurrency)}
                                                        </span>
                                                        <Badge variant="outline" className="font-normal">{percentage}%</Badge>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {budgetProgress > 90 && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    <span className="text-sm text-red-700 font-medium">
                                        You're close to your budget limit!
                                    </span>
                                </div>
                            )}
                        </>
                        </TooltipProvider>
                    ) : (
                        <div className="text-center py-8">
                            <PiggyBank className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Budget Set</h3>
                            <p className="text-slate-600 mb-4">Set up a monthly budget to track your spending goals</p>
                            <Link to={createPageUrl("Budget")}>
                                <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
                                    Create Budget
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
