import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { formatCurrency } from "@/components/utils/currency";
import { User } from '@/entities/all';

export default function BudgetHistory({ budgets }) {
    const [userCurrency, setUserCurrency] = useState('GBP');

    useEffect(() => {
        User.me().then(user => {
            if (user && user.currency) {
                setUserCurrency(user.currency);
            }
        });
    }, []);

    if (budgets.length === 0) return null;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <PiggyBank className="w-6 h-6 text-emerald-600" />
                        Past Budgets
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {budgets.map(budget => (
                            <div key={budget.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <div>
                                    <p className="font-semibold text-slate-800 capitalize">{budget.type} Budget</p>
                                    <p className="text-sm text-slate-600">
                                        {format(new Date(budget.period_start), 'MMM d, yyyy')} - {format(new Date(budget.period_end), 'MMM d, yyyy')}
                                    </p>
                                </div>
                                <p className="font-bold text-lg text-emerald-600">{formatCurrency(budget.amount, userCurrency)}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}