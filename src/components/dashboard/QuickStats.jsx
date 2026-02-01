
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DollarSign,
    Receipt as ReceiptIcon,
    TrendingUp,
    PiggyBank,
    AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from '@/components/utils/currency'; // Changed path
import { User } from '@/entities/all';

const StatCard = ({ title, value, icon: Icon, color, progress, trend, loading }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
    >
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
                <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="h-5 w-5 text-white" />
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-8 w-24" />
                ) : (
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{value}</div>
                        {progress !== undefined && (
                            <Progress
                                value={progress}
                                className="mt-2 h-2"
                                style={{
                                    background: progress > 90 ? '#fecaca' : progress > 75 ? '#fed7aa' : '#dcfce7'
                                }}
                            />
                        )}
                        {trend && (
                            <p className="text-xs text-slate-600 mt-1">{trend}</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    </motion.div>
);

export default function QuickStats({ receipts, totalSpending, budgetProgress, activeBudget, loading }) {
    const [userCurrency, setUserCurrency] = useState('GBP');

    useEffect(() => {
        User.me().then(user => {
            if (user && user.currency) {
                setUserCurrency(user.currency);
            }
        });
    }, []);

    const avgSpending = receipts.length > 0 ? (totalSpending / receipts.length) : 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <StatCard
                title="This Month Spent"
                value={loading ? "" : formatCurrency(totalSpending, userCurrency)}
                icon={DollarSign}
                color="bg-gradient-to-r from-emerald-500 to-teal-600"
                loading={loading}
            />

            <StatCard
                title="Budget Progress"
                value={loading ? "" : activeBudget ? `${budgetProgress.toFixed(0)}%` : "No Budget"}
                icon={budgetProgress > 90 ? AlertTriangle : PiggyBank}
                color={budgetProgress > 90 ? "bg-gradient-to-r from-red-500 to-red-600" : "bg-gradient-to-r from-blue-500 to-blue-600"}
                progress={budgetProgress}
                trend={activeBudget ? `${formatCurrency(activeBudget.amount - totalSpending, userCurrency)} remaining` : "Set up budget"}
                loading={loading}
            />

            <StatCard
                title="Receipts This Month"
                value={loading ? "" : receipts.length}
                icon={ReceiptIcon}
                color="bg-gradient-to-r from-purple-500 to-purple-600"
                trend={`${receipts.length > 0 ? 'Active' : 'Start'} tracking`}
                loading={loading}
            />

            <StatCard
                title="Avg Per Receipt"
                value={loading ? "" : formatCurrency(avgSpending, userCurrency)}
                icon={TrendingUp}
                color="bg-gradient-to-r from-orange-500 to-orange-600"
                loading={loading}
            />
        </div>
    );
}
