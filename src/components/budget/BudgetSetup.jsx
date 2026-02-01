
import React, { useState, useEffect } from "react";
import { Budget } from "@/entities/Budget";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Save, X, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subDays } from "date-fns";
import { CURRENCY_SYMBOLS } from "../utils/currency";

const CATEGORIES = [
    "meat_fish", "vegetables_fruits", "dairy_eggs", "bakery", "snacks_sweets", 
    "beverages", "household_cleaning", "personal_care", "frozen_foods", "pantry_staples", "other"
];

export default function BudgetSetup({ activeBudget, onSave, onCancel }) {
    const [budget, setBudget] = useState(activeBudget || {
        type: "monthly",
        amount: 500,
        start_day: 1,
        category_limits: {}
    });
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        User.me().then(user => {
            setUser(user);
            if (user && user.currency) {
                setBudget(p => ({ ...p, currency: user.currency }));
            }
        });
    }, []);

    const calculateCustomPeriod = (startDay) => {
        const now = new Date();
        const currentDay = now.getDate();
        let periodStart, periodEnd;

        if (currentDay >= startDay) {
            periodStart = new Date(now.getFullYear(), now.getMonth(), startDay);
            const nextMonthStart = addMonths(periodStart, 1);
            periodEnd = subDays(nextMonthStart, 1);
        } else {
            const lastMonthStart = addMonths(new Date(now.getFullYear(), now.getMonth(), startDay), -1);
            periodStart = lastMonthStart;
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), startDay);
            periodEnd = subDays(thisMonthStart, 1);
        }
        return { 
            period_start: format(periodStart, 'yyyy-MM-dd'), 
            period_end: format(periodEnd, 'yyyy-MM-dd') 
        };
    };

    const handleSave = async () => {
        if (!user) {
            console.error("User data not available, cannot save budget.");
            return;
        }
        setSaving(true);
        const now = new Date();
        let period;
        
        switch(budget.type) {
            case 'monthly':
                period = { period_start: format(startOfMonth(now), 'yyyy-MM-dd'), period_end: format(endOfMonth(now), 'yyyy-MM-dd') };
                break;
            case 'weekly':
                period = { period_start: format(startOfWeek(now), 'yyyy-MM-dd'), period_end: format(endOfWeek(now), 'yyyy-MM-dd') };
                break;
            case 'custom_monthly':
                period = calculateCustomPeriod(budget.start_day);
                break;
            default:
                period = {};
        }
        
        const budgetData = {
            ...budget,
            ...period,
            amount: Number(budget.amount),
            currency: budget.currency,
            is_active: true,
            household_id: user.household_id,
            user_email: user.email 
        };
        
        if (budget.type !== 'custom_monthly') {
            delete budgetData.start_day;
        }
        
        if(activeBudget) {
            await Budget.update(activeBudget.id, { is_active: false });
        }
        
        await Budget.create(budgetData);
        onSave();
        setSaving(false);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-slate-900">
                        {activeBudget ? "Edit Your Budget" : "Create a New Budget"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="budget-type">Budget Type</Label>
                            <Select 
                                value={budget.type} 
                                onValueChange={(value) => setBudget(p => ({...p, type: value}))}
                            >
                                <SelectTrigger id="budget-type"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Monthly (Calendar)</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="custom_monthly">Custom Monthly (e.g. Payday)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="budget-amount">Overall Budget Amount</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">{CURRENCY_SYMBOLS[user?.currency || 'GBP'] || '£'}</span>
                                <Input
                                    id="budget-amount"
                                    type="number"
                                    value={budget.amount}
                                    onChange={(e) => setBudget(p => ({...p, amount: e.target.value}))}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                    </div>
                    {budget.type === 'custom_monthly' && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <Label htmlFor="start-day">Budget Start Day of Month</Label>
                            <Input
                                id="start-day"
                                type="number"
                                min="1"
                                max="31"
                                value={budget.start_day}
                                onChange={(e) => {
                                    const day = parseInt(e.target.value, 10);
                                    if(e.target.value === '') {
                                        setBudget(p => ({...p, start_day: ''}));
                                    } else if(!isNaN(day) && day >= 1 && day <= 31) {
                                        setBudget(p => ({...p, start_day: day}));
                                    }
                                }}
                                onBlur={(e) => {
                                    if(e.target.value === '' || isNaN(parseInt(e.target.value, 10))) {
                                        setBudget(p => ({...p, start_day: 1}));
                                    }
                                }}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                e.g., enter 20 if your budget cycle runs from the 20th of one month to the 19th of the next month.
                            </p>
                        </motion.div>
                    )}
                    <div>
                        <Label>Category Limits (Optional)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                            {CATEGORIES.map(cat => (
                                <div key={cat}>
                                    <Label htmlFor={`cat-${cat}`} className="text-sm font-normal capitalize">
                                        {cat.replace(/_/g, ' ')}
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">{CURRENCY_SYMBOLS[user?.currency || 'GBP'] || '£'}</span>
                                        <Input
                                            id={`cat-${cat}`}
                                            type="number"
                                            placeholder="No limit"
                                            value={budget.category_limits[cat] || ''}
                                            onChange={(e) => {
                                                const newLimits = {...budget.category_limits};
                                                if (e.target.value === '') {
                                                  delete newLimits[cat];
                                                } else {
                                                  newLimits[cat] = Number(e.target.value);
                                                }
                                                setBudget(p => ({...p, category_limits: newLimits}));
                                            }}
                                            className="pl-8"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <Button variant="ghost" onClick={onCancel} disabled={saving}>
                            <X className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Budget
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
