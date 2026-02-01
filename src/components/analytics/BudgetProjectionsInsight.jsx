import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PiggyBank, Forward, AlertTriangle, Info } from "lucide-react";
import { User } from '@/entities/all';
import { formatCurrency } from '@/components/utils/currency';

export default function BudgetProjectionsInsight({ insight, loading }) {
    const [userCurrency, setUserCurrency] = useState('GBP');
    useEffect(() => { User.me().then(user => user && user.currency && setUserCurrency(user.currency)); }, []);

    if (loading) {
        return <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>;
    }

    if (!insight) {
        return (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Forward className="w-5 h-5 text-purple-600" />
                        Budget Projections
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-4 h-4 text-slate-500 hover:text-slate-700">
                                    <Info className="w-4 h-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Budget Projections</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 text-sm">
                                    <p><strong>What it shows:</strong> Suggested budget amounts for future periods based on your personal inflation rate and historical overspending patterns.</p>
                                    <p><strong>How it's calculated:</strong> We adjust your current budget by your personal inflation rate and factor in average overspend from completed budgets.</p>
                                    <p><strong>Why it helps:</strong> Prevents budget shock by proactively adjusting for your changing costs and spending habits.</p>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8 text-slate-500">
                    <p>Not enough historical data for budget projections.</p>
                    <p className="text-sm">Keep tracking your spending over a few periods to unlock this feature.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Forward className="w-5 h-5 text-purple-600" />
                    Budget Projections
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-4 h-4 text-slate-500 hover:text-slate-700">
                                <Info className="w-4 h-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Budget Projections</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 text-sm">
                                <p><strong>What it shows:</strong> Suggested budget amounts for future periods based on your personal inflation rate and historical overspending patterns.</p>
                                <p><strong>How it's calculated:</strong> We adjust your current budget by your personal inflation rate and factor in average overspend from completed budgets.</p>
                                <p><strong>Why it helps:</strong> Prevents budget shock by proactively adjusting for your changing costs and spending habits.</p>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardTitle>
                <CardDescription>
                    Forward-looking estimates based on your recent spending and personal inflation.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-800">Next Period's Budget Suggestion</h4>
                    <p className="text-3xl font-bold text-purple-900">{formatCurrency(insight.nextBudgetSuggestion, userCurrency)}</p>
                    <p className="text-sm text-purple-700">Adjusted to maintain your purchasing power against personal inflation.</p>
                </div>
                 {insight.yearlyOverspendProjection > 0 && (
                    <div className="p-4 bg-orange-50 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600 mt-1" />
                        <div>
                            <h4 className="font-semibold text-orange-800">Projected Yearly Overspend</h4>
                            <p className="text-2xl font-bold text-orange-900">{formatCurrency(insight.yearlyOverspendProjection, userCurrency)}</p>
                            <p className="text-sm text-orange-700">Based on your historical overspending trends, projected over 12 months.</p>
                        </div>
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}