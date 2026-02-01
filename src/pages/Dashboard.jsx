import React, { useState, useEffect, useCallback } from "react";
import { Receipt, Budget, User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link, useLocation, useNavigate } from "react-router-dom"; // Added useLocation, useNavigate
import { createPageUrl } from "@/utils";
import {
    ShoppingCart,
    ScanLine,
    TrendingUp,
    DollarSign,
    AlertTriangle,
    Receipt as ReceiptIcon,
    PiggyBank,
    Calendar,
    Target,
    Info,
    Banknote,
    TrendingDown,
    Loader2,
    CheckCircle,
    Mail
} from "lucide-react";
import { formatCurrency } from '@/components/utils/currency';
import { differenceInDays, parseISO, startOfMonth, endOfMonth, subMonths, isBefore } from "date-fns";
import { analyzeReceiptsForInsights } from '@/components/utils/insightCalculations';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Assuming these components exist and are imported
import ReceiptDetailModal from '@/components/receipts/ReceiptDetailModal';
import EditReceiptModal from '@/components/receipts/EditReceiptModal';
import WeeklyDigest from '@/components/dashboard/WeeklyDigest';

export default function Dashboard() {
    const [receipts, setReceipts] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // State for insights
    const [priceChangeInsight, setPriceChangeInsight] = useState(null);
    const [monetaryImpactInsight, setMonetaryImpactInsight] = useState(null);
    const [shrinkflationInsight, setShrinkflationInsight] = useState(null);
    const [crossStoreInsight, setCrossStoreInsight] = useState(null);
    
    // State for receipt validation/processing counts
    const [readyToReviewCount, setReadyToReviewCount] = useState(0); // Renamed from readyToValidateCount
    const [processingCount, setProcessingCount] = useState(0);
    const [insightsReadyCount, setInsightsReadyCount] = useState(0);
    const [emailReceiptsProcessing, setEmailReceiptsProcessing] = useState(0);

    // New state for modals
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [editingReceipt, setEditingReceipt] = useState(null);

    // Hooks for navigation
    const navigate = useNavigate();
    const location = useLocation();

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const userData = await User.me();
            setUser(userData);

            if (!userData || !userData.household_id) {
                console.log("User has no household or household_id, skipping data load.");
                setReceipts([]);
                setBudgets([]);
                setReadyToReviewCount(0);
                setProcessingCount(0);
                setInsightsReadyCount(0);
                setLoading(false);
                return;
            }

            const [receiptData, budgetData] = await Promise.all([
                Receipt.filter({ household_id: userData.household_id }, "-purchase_date", 200),
                Budget.filter({ household_id: userData.household_id }, "-created_date", 10),
            ]);

            // Filter out test data receipts
            const filteredReceipts = (receiptData || []).filter(r => !r.is_test_data);

            setReceipts(filteredReceipts);
            setBudgets(budgetData || []);
            
            // Count receipts that are actively being processed
            const processingCountValue = filteredReceipts.filter(r => 
                r.validation_status === 'processing_background'
            ).length;
            
            // Count email receipts (forwarded via email) that are processing
            const emailProcessingCount = filteredReceipts.filter(r => 
                r.validation_status === 'processing_background' && 
                r.notes && r.notes.toLowerCase().includes('email')
            ).length;
            
            setEmailReceiptsProcessing(emailProcessingCount);
            
            // Count receipts that are ready for review (AI completed)
            const readyCountValue = filteredReceipts.filter(r => 
                r.validation_status === 'review_insights' && 
                r.items && 
                r.items.length > 0
            ).length;

            // Count receipts with insights ready (created recently)
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
            
            const insightsReady = filteredReceipts.filter(r => {
                const isReviewReady = r.validation_status === 'review_insights';
                const hasInsights = r.receipt_insights && (r.receipt_insights.summary || r.receipt_insights.highlights);
                const isRecent = new Date(r.created_date) > oneDayAgo;
                return isReviewReady && hasInsights && isRecent;
            }).length;
            
            setProcessingCount(processingCountValue);
            setReadyToReviewCount(readyCountValue);
            setInsightsReadyCount(insightsReady);

        } catch (error) {
            console.error('Error loading data:', error);
            setReceipts([]);
            setBudgets([]);
            setReadyToReviewCount(0);
            setProcessingCount(0);
            setInsightsReadyCount(0);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Add a listener to refresh data when the window gets focus
    useEffect(() => {
        const handleFocus = () => {
            console.log("Dashboard focused, reloading data...");
            loadData();
        };

        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [loadData]);

    const activeBudget = budgets.find(budget => budget.is_active);

    // Enhanced useEffect to run analysis with better debugging
    useEffect(() => {
        if (receipts.length > 0 && budgets.length > 0) {
            console.log("Running insights analysis...");
            console.log("Receipts count:", receipts.length);
            console.log("Budgets count:", budgets.length);

            const activeBudgetFound = budgets.find(b => b.is_active);
            let currentPeriod = null;
            let previousPeriod = null;

            if (activeBudgetFound) {
                currentPeriod = { from: parseISO(activeBudgetFound.period_start), to: parseISO(activeBudgetFound.period_end) };

                // Find the immediately preceding inactive budget
                const inactiveBudgets = budgets.filter(b => !b.is_active);
                const sortedInactiveBudgets = inactiveBudgets.sort((a, b) =>
                    isBefore(parseISO(a.period_end), parseISO(b.period_end)) ? 1 : -1
                );

                const previousBudget = sortedInactiveBudgets.find(b =>
                    isBefore(parseISO(b.period_end), parseISO(activeBudgetFound.period_start))
                );

                if (previousBudget) {
                    previousPeriod = { from: parseISO(previousBudget.period_start), to: parseISO(previousBudget.period_end) };
                } else {
                    console.log("No previous budget found, using calendar months fallback");
                    const prevMonth = subMonths(currentPeriod.from || new Date(), 1);
                    previousPeriod = { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
                }
            } else {
                console.log("No active budget found, using calendar months");
                const today = new Date();
                currentPeriod = { from: startOfMonth(today), to: endOfMonth(today) };
                const prevMonth = subMonths(today, 1);
                previousPeriod = { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) };
            }

            console.log("Analysis periods:", { currentPeriod, previousPeriod });

            const insights = analyzeReceiptsForInsights(receipts, { current: currentPeriod, previous: previousPeriod }, budgets);

            console.log("Insights result:", insights);

            setPriceChangeInsight(insights.priceChange);
            setMonetaryImpactInsight(insights.monetaryImpact);
            setShrinkflationInsight(insights.shrinkflation);
            setCrossStoreInsight(insights.crossStore);
        } else {
            console.log("Not enough data for insights analysis");
            setPriceChangeInsight(null);
            setMonetaryImpactInsight(null);
            setShrinkflationInsight(null);
            setCrossStoreInsight(null);
        }
    }, [receipts, budgets]);

    // Filter receipts for the active budget for rendering budget stats.
    const receiptsForBudget = activeBudget ? receipts.filter(receipt => {
        try {
            const purchaseDate = parseISO(receipt.purchase_date);
            const startDate = parseISO(activeBudget.period_start);
            const endDate = parseISO(activeBudget.period_end);
            return purchaseDate >= startDate && purchaseDate <= endDate;
        } catch (e) {
            console.error("Error parsing receipt or budget date for filtering:", e);
            return false;
        }
    }) : [];

    const currentPeriodSpending = receiptsForBudget.reduce((sum, receipt) => {
        const amount = receipt.total_amount;
        return sum + (typeof amount === 'number' && !isNaN(amount) ? amount : 0);
    }, 0);

    const budgetProgress = activeBudget && activeBudget.amount > 0 ? (currentPeriodSpending / activeBudget.amount) * 100 : 0;

    // Calculate remaining budget and days
    const remainingBudget = activeBudget ? activeBudget.amount - currentPeriodSpending : 0;
    const daysLeft = activeBudget ? Math.max(0, differenceInDays(parseISO(activeBudget.period_end), new Date())) : 0;
    const dailySpendingAllowance = daysLeft > 0 && remainingBudget > 0 ? remainingBudget / daysLeft : 0;

    // Analyze spending pattern
    const analyzeSpendingPattern = () => {
        if (receiptsForBudget.length < 2) return null;

        const averageReceiptValue = currentPeriodSpending / receiptsForBudget.length;
        const totalDays = activeBudget ? differenceInDays(new Date(), parseISO(activeBudget.period_start)) + 1 : 30;
        const shopsPerWeek = (receiptsForBudget.length / totalDays) * 7;

        let pattern = '';
        let forecast = '';

        if (shopsPerWeek < 1) {
            pattern = 'Weekly shopper - Big trips, less frequent';
            forecast = budgetProgress > 50 ? 'Likely to stay within budget' : 'On track for underspend';
        } else if (shopsPerWeek > 3) {
            pattern = 'Frequent shopper - Multiple small trips';
            forecast = budgetProgress > 80 ? 'Risk of overspend' : 'Frequent but controlled';
        } else {
            pattern = 'Regular shopper - Balanced approach';
            forecast = budgetProgress > 75 ? 'Watch spending closely' : 'Good spending pace';
        }

        return {
            averageTrip: averageReceiptValue,
            shopsPerWeek: shopsPerWeek,
            pattern,
            forecast
        };
    };

    const spendingAnalysis = analyzeSpendingPattern();
    
    const userCurrency = user?.currency || 'GBP';

    // Handle receipt click to open detail modal
    const handleReceiptClick = (receipt) => {
        // Changed: Always open detail modal first for better insights viewing experience
        setSelectedReceipt(receipt);
    };

    // Handle receipt update from edit modal
    const handleReceiptUpdated = async () => {
        setSelectedReceipt(null); // Close detail modal if open
        setEditingReceipt(null); // Close edit modal
        await loadData(); // Reload all data to reflect changes
    };

    return (
        <div className="p-3 md:p-6 lg:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                        Welcome Back!
                    </h1>
                    <p className="text-slate-600">Here's your spending summary and insights.</p>
                </div>
                <Link to={createPageUrl("ScanReceipt")}>
                    <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                        <ScanLine className="w-5 h-5 mr-2" />
                        Scan New Receipt
                    </Button>
                </Link>
            </div>

            {/* Email Receipt Processing Alert */}
            {emailReceiptsProcessing > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Alert className="border-indigo-200 bg-indigo-50">
                        <Mail className="h-5 w-5 text-indigo-600" />
                        <AlertDescription className="flex items-center justify-between">
                            <span className="text-indigo-800 font-medium">
                                📧 Email received... {emailReceiptsProcessing} receipt{emailReceiptsProcessing !== 1 ? 's are' : ' is'} processing
                            </span>
                            <span className="text-indigo-600 text-sm flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Extracting data
                            </span>
                        </AlertDescription>
                    </Alert>
                </motion.div>
            )}

            {/* Processing Alert */}
            {processingCount > 0 && emailReceiptsProcessing === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Alert className="border-blue-200 bg-blue-50">
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                        <AlertDescription className="flex items-center justify-between">
                            <span className="text-blue-800 font-medium">
                                {processingCount} receipt{processingCount !== 1 ? 's are' : ' is'} currently processing
                            </span>
                            <span className="text-blue-600 text-sm">
                                Check back in a few minutes
                            </span>
                        </AlertDescription>
                    </Alert>
                </motion.div>
            )}

            {/* Ready to Review Alert (formerly Ready to Validate) */}
            {readyToReviewCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Alert className="border-emerald-200 bg-emerald-50">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                        <AlertDescription className="flex items-center justify-between">
                            <span className="text-emerald-800 font-medium">
                                {readyToReviewCount} receipt{readyToReviewCount !== 1 ? 's are' : ' is'} ready for review
                            </span>
                            <Link to={createPageUrl("Receipts") + "?filter=pending"}>
                                <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                                    Review Now
                                </Button>
                            </Link>
                        </AlertDescription>
                    </Alert>
                </motion.div>
            )}

            {/* Insights Ready Alert */}
            {insightsReadyCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6"
                >
                    <Alert className="border-purple-200 bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors" onClick={() => navigate(createPageUrl("Receipts"))}>
                        <Info className="h-5 w-5 text-purple-600" />
                        <AlertDescription className="flex items-center justify-between">
                            <span className="text-purple-800 font-medium">
                                {insightsReadyCount} receipt{insightsReadyCount !== 1 ? 's have' : ' has'} new AI insights ready!
                            </span>
                            <Link to={createPageUrl("Receipts")}>
                                <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100">
                                    View Insights
                                </Button>
                            </Link>
                        </AlertDescription>
                    </Alert>
                </motion.div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* Combined Budget & Stats Card */}
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <PiggyBank className="w-5 h-5 text-emerald-600" />
                                Budget & Stats
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Quick Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Card className="border-none shadow-sm bg-white/80">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600">This Period</p>
                                                <p className="text-2xl font-bold text-slate-900">
                                                    {formatCurrency(currentPeriodSpending, userCurrency)}
                                                </p>
                                            </div>
                                            <ShoppingCart className="w-7 h-7 text-emerald-600" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border-none shadow-sm bg-white/80">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600">Receipts Scanned</p>
                                                <p className="text-2xl font-bold text-slate-900">
                                                    {receiptsForBudget.length}
                                                </p>
                                            </div>
                                            <ReceiptIcon className="w-7 h-7 text-blue-600" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Budget Status */}
                            {activeBudget && (
                                <>
                                    <div className="my-4 border-t border-slate-200" />
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="text-center p-4 bg-emerald-50 rounded-lg">
                                            <p className="text-sm text-emerald-700 font-medium">Remaining</p>
                                            <p className={`text-lg md:text-xl font-bold break-all ${remainingBudget >= 0 ? 'text-emerald-800' : 'text-red-600'}`}>
                                                {formatCurrency(remainingBudget, userCurrency)}
                                            </p>
                                        </div>
                                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                                            <p className="text-sm text-blue-700 font-medium">Days Left</p>
                                            <p className="text-xl font-bold text-blue-800">{daysLeft}</p>
                                        </div>
                                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                                            <p className="text-sm text-orange-700 font-medium">Daily Allowance</p>
                                            <p className="text-xl font-bold text-orange-800 break-words">
                                                {formatCurrency(dailySpendingAllowance, userCurrency)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Budget Progress</span>
                                            <span>{budgetProgress.toFixed(0)}% used</span>
                                        </div>
                                        <Progress value={budgetProgress} className="h-3" />
                                        {budgetProgress > 90 && (
                                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                                <span className="text-sm text-red-700 font-medium">
                                                    Budget limit nearly reached!
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* NEW: Weekly Digest */}
                    {receipts.length > 0 && (
                        <WeeklyDigest 
                            receipts={receipts} 
                            budgets={budgets}
                            currency={userCurrency}
                        />
                    )}

                    {/* Placeholder for future analytical content */}
                    {receipts.length > 0 && (
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                                    Coming Soon: Advanced Analytics
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-600 text-center py-8">
                                    More detailed spending breakdowns and forecasting will appear here as we develop additional analytical features.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
                
                {/* Right Column */}
                <div className="space-y-6">
                    {/* Combined Analysis & Insights Card */}
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-purple-600" />
                                Analysis & Insights
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Spending Analysis */}
                            {spendingAnalysis && (
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Spending Pattern
                                    </h4>
                                    <div className="text-sm text-slate-600 space-y-1">
                                        <p><strong>Pattern:</strong> {spendingAnalysis.pattern}</p>
                                        <p><strong>Average trip:</strong> {formatCurrency(spendingAnalysis.averageTrip, userCurrency)}</p>
                                        <p><strong>Forecast:</strong> {spendingAnalysis.forecast}</p>
                                    </div>
                                </div>
                            )}

                            {/* Key Insights */}
                            <div className="my-4 border-t border-slate-200" />
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-slate-800">Key Price Movements</h4>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            <p className="text-sm">These insights compare your current budget period to the previous one, highlighting significant changes (&gt;3%) in your spending patterns and price movements.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <div className="space-y-4 pt-2">
                                {!priceChangeInsight && !monetaryImpactInsight && !shrinkflationInsight && !crossStoreInsight ? (
                                    <div className="text-center py-4 text-sm text-slate-500">
                                        <p className="mb-2">No significant price changes detected for this period.</p>
                                        <p className="text-xs text-slate-400">Insights appear when items show &gt;3% price changes or significant monetary impact.</p>
                                    </div>
                                ) : (
                                    <>
                                        {monetaryImpactInsight && (
                                            <InsightCard
                                                icon={Banknote}
                                                color="blue"
                                                title={monetaryImpactInsight.value > 0 ? "Top Monetary Impact (Increase)" : "Top Monetary Impact (Savings)"}
                                                description={`'${monetaryImpactInsight.product}' had the biggest impact on your wallet, changing by ${formatCurrency(Math.abs(monetaryImpactInsight.value), userCurrency)} this period.`}
                                            />
                                        )}
                                        {priceChangeInsight && (
                                            <InsightCard
                                                icon={priceChangeInsight.value > 0 ? TrendingUp : TrendingDown}
                                                color={priceChangeInsight.value > 0 ? "red" : "green"}
                                                title={priceChangeInsight.value > 0 ? "Price Alert" : "Price Drop"}
                                                description={`'${priceChangeInsight.product}' is ${priceChangeInsight.value > 0 ? 'up' : 'down'} by ${Math.abs(priceChangeInsight.value * 100).toFixed(1)}% this period (avg: ${formatCurrency(priceChangeInsight.to, userCurrency)} vs ${formatCurrency(priceChangeInsight.from, userCurrency)}).`}
                                            />
                                        )}
                                        {shrinkflationInsight && (
                                            <InsightCard
                                                icon={TrendingDown}
                                                color="orange"
                                                title="Shrinkflation Detected"
                                                description={`'${shrinkflationInsight.product}' pack size is down by ${Math.abs(shrinkflationInsight.packSizeChange).toFixed(1)}% this period.`}
                                            />
                                        )}
                                        {crossStoreInsight && (
                                            <InsightCard
                                                icon={DollarSign}
                                                color="emerald"
                                                title="Smart Buy Opportunity"
                                                description={`For "${crossStoreInsight.product}", we've seen ${formatCurrency(crossStoreInsight.difference, userCurrency)} difference between stores recently.`}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions & Recent Receipts */}
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>Quick Actions & Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Quick Actions */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-slate-800">Quick Actions</h4>
                                <Link to={createPageUrl("ShoppingList")}>
                                    <Button variant="outline" className="w-full justify-start">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        AI Shopping List
                                    </Button>
                                </Link>
                                <Link to={createPageUrl("Analytics")}>
                                    <Button variant="outline" className="w-full justify-start">
                                        <TrendingUp className="w-4 h-4 mr-2" />
                                        View Analytics
                                    </Button>
                                </Link>
                                <Link to={createPageUrl("Budget")}>
                                    <Button variant="outline" className="w-full justify-start">
                                        <PiggyBank className="w-4 h-4 mr-2" />
                                        Manage Budget
                                    </Button>
                                </Link>
                            </div>

                            {/* Recent Receipts */}
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-slate-800">Recent Receipts</h4>
                                    <Link to={createPageUrl("Receipts")}>
                                        <Button variant="outline" size="sm" className="hover:bg-emerald-50 border-emerald-200">
                                            View All
                                        </Button>
                                    </Link>
                                </div>
                                
                                {loading ? (
                                    <div className="text-center py-4">
                                        <p className="text-slate-600 text-sm">Loading receipts...</p>
                                    </div>
                                ) : receipts.length > 0 ? (
                                    <div className="space-y-3">
                                        {receipts.slice(0, 2).map((receipt) => (
                                            <div 
                                                key={receipt.id} 
                                                className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors duration-200 cursor-pointer"
                                                onClick={() => handleReceiptClick(receipt)} // Added onClick
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                                                        <img 
                                                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ac71e3ac2c3a563bdfc531/8bf57a74a_Roundedlogo21.png" 
                                                            alt="Receipt" 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 text-sm">{receipt.supermarket || 'Unknown Store'}</p>
                                                        <p className="text-xs text-slate-600">
                                                            {receipt.purchase_date ? new Date(receipt.purchase_date).toLocaleDateString() : 'No date'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-slate-900 text-sm">{formatCurrency(receipt.total_amount || 0, userCurrency)}</p>
                                                    <p className="text-xs text-slate-600">{receipt.items?.length || 0} items</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <ReceiptIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                        <p className="text-slate-600 text-sm mb-3">No receipts yet</p>
                                        <Link to={createPageUrl("ScanReceipt")}>
                                            <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
                                                Scan First Receipt
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Set a Budget Card */}
                    {!activeBudget && (
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Set a Budget</CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <PiggyBank className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-600 mb-4">Create a budget to better track your spending.</p>
                                <Link to={createPageUrl("Budget")}>
                                    <Button variant="outline">Go to Budget Page</Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Modals for Receipt Details and Editing */}
            <ReceiptDetailModal
                receipt={selectedReceipt}
                isOpen={!!selectedReceipt}
                onClose={() => setSelectedReceipt(null)}
                onEdit={setEditingReceipt}
            />

            <EditReceiptModal
                receipt={editingReceipt}
                isOpen={!!editingReceipt}
                onClose={() => {
                    setEditingReceipt(null);
                    // If 'edit' param exists in URL, remove it after closing the modal
                    const urlParams = new URLSearchParams(location.search);
                    if (urlParams.get('edit')) {
                        urlParams.delete('edit');
                        const newUrl = `${location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
                        navigate(newUrl, { replace: true });
                    }
                }}
                onSave={handleReceiptUpdated}
            />
        </div>
    );
}

const InsightCard = ({ icon: Icon, color, title, description }) => {
    let bgColorClass, textColorClass, iconColorClass;

    switch (color) {
        case "red":
            bgColorClass = "bg-red-50";
            textColorClass = "text-red-700";
            iconColorClass = "text-red-600";
            break;
        case "green":
            bgColorClass = "bg-green-50";
            textColorClass = "text-green-700";
            iconColorClass = "text-green-600";
            break;
        case "blue":
            bgColorClass = "bg-blue-50";
            textColorClass = "text-blue-700";
            iconColorClass = "text-blue-600";
            break;
        case "orange":
            bgColorClass = "bg-orange-50";
            textColorClass = "text-orange-700";
            iconColorClass = "text-orange-600";
            break;
        case "emerald":
            bgColorClass = "bg-emerald-50";
            textColorClass = "text-emerald-700";
            iconColorClass = "text-emerald-600";
            break;
        default:
            bgColorClass = "bg-slate-50";
            textColorClass = "text-slate-700";
            iconColorClass = "text-slate-600";
    }

    return (
        <div className={`p-3 rounded-lg ${bgColorClass} flex items-start space-x-3`}>
            <Icon className={`w-5 h-5 flex-shrink-0 ${iconColorClass}`} />
            <div>
                <h5 className={`font-semibold text-sm ${textColorClass}`}>{title}</h5>
                <p className={`text-xs ${textColorClass}`}>{description}</p>
            </div>
        </div>
    );
};