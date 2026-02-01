import React, { useState, useEffect, useCallback } from "react";
import { Budget } from "@/entities/Budget";
import { Receipt } from "@/entities/Receipt";
import { User } from "@/entities/User";
import { Household } from "@/entities/Household";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Plus, PiggyBank } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import BudgetSetup from "../components/budget/BudgetSetup";
import CurrentBudgetStatus from "../components/budget/CurrentBudgetStatus";
import BudgetHistory from "../components/budget/BudgetHistory";
import { isWithinInterval, isPast, format, addDays, differenceInDays } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function BudgetPage() {
    const [budgets, setBudgets] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [household, setHousehold] = useState(null);
    const [showRolloverPrompt, setShowRolloverPrompt] = useState(false);
    const [isRollingOver, setIsRollingOver] = useState(false);
    const [userCurrency, setUserCurrency] = useState('USD');
    const navigate = useNavigate();
    
    const activeBudget = budgets.find(b => b.is_active);
    
    const isCurrentUserAdmin = currentUser && household && currentUser.id === household.admin_id;

    const formatCurrency = (amount, currency) => {
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numericAmount)) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(0);
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numericAmount);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const user = await User.me();
            setCurrentUser(user);
            if (user) {
                setUserCurrency(user.currency || 'USD'); 
                
                if (user.household_id) {
                    const householdResults = await Household.filter({ id: user.household_id });
                    if (householdResults && householdResults.length > 0) {
                        setHousehold(householdResults[0]);
                    } else {
                        setHousehold(null);
                    }

                    const [budgetData, receiptData] = await Promise.all([
                        Budget.filter({ household_id: user.household_id }, "-created_date"),
                        Receipt.filter({ household_id: user.household_id }),
                    ]);
                    // Filter out test data receipts
                    const filteredReceipts = (receiptData || []).filter(r => !r.is_test_data);
                    setBudgets(budgetData || []);
                    setReceipts(filteredReceipts);
                } else {
                    setBudgets([]);
                    setReceipts([]);
                    setHousehold(null);
                }
            } else {
                setCurrentUser(null);
                setBudgets([]);
                setReceipts([]);
                setHousehold(null);
            }
        } catch (error) {
            console.error("Failed to load budget data:", error);
            setBudgets([]);
            setReceipts([]);
            setHousehold(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!loading && !isSettingUp && isCurrentUserAdmin && activeBudget) {
            if (isPast(new Date(activeBudget.period_end))) {
                setShowRolloverPrompt(true);
            } else {
                setShowRolloverPrompt(false);
            }
        } else {
            setShowRolloverPrompt(false);
        }
    }, [loading, isSettingUp, isCurrentUserAdmin, activeBudget]);

    const currentPeriodReceipts = activeBudget ? receipts.filter(receipt =>
        isWithinInterval(new Date(receipt.purchase_date), {
            start: new Date(activeBudget.period_start),
            end: new Date(activeBudget.period_end)
        })
    ) : [];

    const handleBudgetSaved = () => {
        setIsSettingUp(false);
        loadData();
    };

    const handleRollover = async () => {
        if (!activeBudget || !currentUser) return;

        setIsRollingOver(true);
        try {
            const response = await base44.functions.invoke('rolloverBudget');
            
            if (response.data.success) {
                const oldBudgetInfo = response.data.old_budget;
                const newBudgetInfo = response.data.new_budget;
                
                console.log("Budget rolled over successfully:", response.data);
                
                alert(`Budget rolled over! Previous period: You spent ${formatCurrency(oldBudgetInfo.total_spent, userCurrency)} out of ${formatCurrency(oldBudgetInfo.budget_amount, userCurrency)}. New period starts with ${formatCurrency(newBudgetInfo.budget_amount, userCurrency)}.`);
            } else {
                alert(`Failed to roll over budget: ${response.data.message || 'Unknown error'}`);
            }

            await loadData();
            setShowRolloverPrompt(false);
        } catch (error) {
            console.error("Failed to roll over budget:", error);
            alert("Failed to roll over budget. Please try again.");
        } finally {
            setIsRollingOver(false);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {showRolloverPrompt && isCurrentUserAdmin && activeBudget && (
                    <Alert className="mb-6 bg-yellow-50 border-yellow-200 text-yellow-800">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="font-semibold">Budget Period Ended!</AlertTitle>
                        <AlertDescription>
                            Your budget period for{" "}
                            <span className="font-medium">
                                {format(new Date(activeBudget.period_start), "MMM dd, yyyy")} -{" "}
                                {format(new Date(activeBudget.period_end), "MMM dd, yyyy")}
                            </span>{" "}
                            has ended. Would you like to set up a new budget for the next period, starting fresh with the same amount ({formatCurrency(activeBudget.amount, userCurrency)})?
                        </AlertDescription>
                        <Button 
                            onClick={handleRollover}
                            className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white"
                            disabled={isRollingOver}
                        >
                            {isRollingOver ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            {isRollingOver ? "Setting Up..." : "Start New Budget Period"}
                        </Button>
                    </Alert>
                )}

                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                           <PiggyBank className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Budget Tracker</h1>
                            <p className="text-slate-600">Set spending goals and stay on track</p>
                        </div>
                    </div>
                    {!isSettingUp && isCurrentUserAdmin && !showRolloverPrompt && (
                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            {isCurrentUserAdmin && budgets.filter(b => !b.is_active).length > 0 && (
                                <Select onValueChange={(budgetId) => {
                                    navigate(createPageUrl(`Analytics?budgetId=${budgetId}`));
                                }}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Analyze Past Budget" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {budgets.filter(b => !b.is_active).map(budget => (
                                            <SelectItem key={budget.id} value={budget.id}>
                                                {budget.type.replace(/_/g, ' ')} ({format(new Date(budget.period_start), 'MMM yyyy')})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <Button 
                                onClick={() => setIsSettingUp(true)}
                                style={{
                                    background: 'linear-gradient(to right, #10b981, #0d9488)',
                                    color: 'white',
                                    border: 'none'
                                }}
                                className="shadow-lg hover:shadow-xl transition-all duration-300 hover:opacity-90"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                {activeBudget ? "Edit Budget" : "Set New Budget"}
                            </Button>
                        </div>
                    )}
                </motion.div>

                {isSettingUp ? (
                    <BudgetSetup
                        activeBudget={activeBudget}
                        onSave={handleBudgetSaved}
                        onCancel={() => setIsSettingUp(false)}
                    />
                ) : (
                    <div className="space-y-8">
                        {activeBudget ? (
                            <CurrentBudgetStatus 
                                budget={activeBudget} 
                                receipts={currentPeriodReceipts}
                                loading={loading}
                            />
                        ) : (
                            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm text-center py-16">
                                <CardHeader>
                                    <PiggyBank className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                    <CardTitle className="text-xl font-bold text-slate-900">No Active Budget</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-slate-600 mb-4">Create a budget to start tracking your spending goals.</p>
                                    {isCurrentUserAdmin && !showRolloverPrompt && (
                                        <Button 
                                            onClick={() => setIsSettingUp(true)}
                                            style={{
                                                background: 'linear-gradient(to right, #10b981, #0d9488)',
                                                color: 'white',
                                                border: 'none'
                                            }}
                                            className="shadow-lg hover:shadow-xl transition-all duration-300 hover:opacity-90"
                                        >
                                            <Plus className="w-4 h-4 mr-2" /> 
                                            Create Your First Budget
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                        <BudgetHistory budgets={budgets.filter(b => !b.is_active)} />
                    </div>
                )}
            </div>
        </div>
    );
}