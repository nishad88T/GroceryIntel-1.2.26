import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/components/utils/currency";
import { PiggyBank, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { motion } from "framer-motion";
import { User } from '@/entities/all';

const categoryColors = {
    meat_fish: "bg-red-500", vegetables_fruits: "bg-green-500", dairy_eggs: "bg-blue-500",
    bakery: "bg-yellow-500", snacks_sweets: "bg-pink-500", beverages: "bg-purple-500",
    household_cleaning: "bg-gray-500", personal_care: "bg-indigo-500", frozen_foods: "bg-cyan-500",
    pantry_staples: "bg-orange-500", other: "bg-slate-500"
};

const ProgressBar = ({ value, colorClass = "bg-emerald-500" }) => (
    <div className="w-full bg-slate-200 rounded-full h-2.5">
        <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${Math.min(value, 100)}%` }}></div>
    </div>
);

export default function CurrentBudgetStatus({ budget, receipts, loading }) {
    const [userCurrency, setUserCurrency] = useState('GBP');

    useEffect(() => {
        User.me().then(user => {
            if (user && user.currency) {
                setUserCurrency(user.currency);
            }
        });
    }, []);

    if(loading) {
        return <Skeleton className="h-96 w-full" />
    }

    // Add safety checks for budget and receipts
    if (!budget) {
        return (
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                    <p className="text-slate-600">No budget data available</p>
                </CardContent>
            </Card>
        );
    }

    if (!receipts) {
        return (
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                    <p className="text-slate-600">No receipt data available</p>
                </CardContent>
            </Card>
        );
    }

    const totalSpent = receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const budgetProgress = budget.amount > 0 ? (totalSpent / budget.amount) * 100 : 0;
    
    const categorySpending = receipts.flatMap(r => r.items || []).reduce((acc, item) => {
        const category = item.category || 'other';
        acc[category] = (acc[category] || 0) + (item.total_price || 0);
        return acc;
    }, {});

    // FIXED: Add null safety for category_limits
    const categoryLimits = budget.category_limits || {};
    const hasCategoryLimits = Object.keys(categoryLimits).length > 0;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-emerald-600" />
                        <div className="flex flex-col">
                            <span>Current {(budget.type || 'monthly').charAt(0).toUpperCase() + (budget.type || 'monthly').slice(1)} Budget</span>
                            <span className="text-sm font-normal text-slate-600">{budget.period_start} to {budget.period_end}</span>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Overall Progress */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <span className="text-slate-600">Overall Progress</span>
                            <span className="font-bold text-2xl text-slate-900">
                                {formatCurrency(totalSpent, userCurrency)} / <span className="text-slate-500">{formatCurrency(budget.amount || 0, userCurrency)}</span>
                            </span>
                        </div>
                        <Progress value={budgetProgress} className="h-4" />
                        {budgetProgress > 90 && (
                            <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                                <AlertTriangle className="w-4 h-4" />
                                Nearing budget limit!
                            </div>
                        )}
                    </div>
                    
                    {/* Category Limits - FIXED: Only show if category limits exist */}
                    {hasCategoryLimits && (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-slate-800">Category Breakdown</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                {Object.entries(categoryLimits)
                                    .filter(([, limit]) => limit > 0)
                                    .map(([category, limit]) => {
                                    const spent = categorySpending[category] || 0;
                                    const progress = limit > 0 ? (spent / limit) * 100 : 0;
                                    return (
                                        <div key={category}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="capitalize text-slate-700">{category.replace(/_/g, ' ')}</span>
                                                <span className="font-medium text-slate-800">
                                                    {formatCurrency(spent, userCurrency)} / {formatCurrency(limit, userCurrency)}
                                                </span>
                                            </div>
                                            <ProgressBar value={progress} colorClass={categoryColors[category] || "bg-slate-500"} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}