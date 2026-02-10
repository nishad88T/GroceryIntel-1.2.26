import React, { useState, useEffect, useCallback } from "react";
import { Receipt, Budget, User } from "@/entities/all";
import { motion } from "framer-motion";
import { TrendingUp, SlidersHorizontal, Eye, Sparkles } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"; 
import { Label } from "@/components/ui/label"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getBudgetAlignedPeriods, filterReceiptsByPeriod as filterReceipts } from "@/components/utils/periodCalculations";

import KeyMetrics from "../components/analytics/KeyMetrics";
import SpendingTrendChart from "../components/analytics/SpendingTrendChart";
import CategoryBreakdownChart from "../components/analytics/CategoryBreakdownChart";
import SupermarketSpendChart from "../components/analytics/SupermarketSpendChart";
import TopItemsTable from "../components/analytics/TopItemsTable";
import DateRangeComparer from "../components/analytics/DateRangeComparer";
import AdvancedInflationTracker from "../components/analytics/AdvancedInflationTracker";
import MultiRetailerComparison from "../components/analytics/MultiRetailerComparison";
import PersonalCPITracker from "../components/analytics/PersonalCPITracker";
import VolatilityDashboard from "../components/analytics/VolatilityDashboard";
import AnalyticsDrillDownModal from "../components/analytics/AnalyticsDrillDownModal";
// import OfficialInflationChart from "../components/analytics/OfficialInflationChart"; // DISABLED: ONS API calls paused
import { useUserContext, FeatureGuard } from "@/components/shared/FeatureGuard";
import MonthlyCycleChart from "../components/analytics/MonthlyCycleChart";
import { analyzeReceiptsForInsights } from "@/components/utils/insightCalculations";
import BasketInflationInsight from "../components/analytics/BasketInflationInsight";
import BudgetProjectionsInsight from "../components/analytics/BudgetProjectionsInsight";
import ReceiptDetailModal from "../components/receipts/ReceiptDetailModal";
import DemoInflationModel from "../components/analytics/DemoInflationModel";
import EnhancedCategoryInflation from "../components/analytics/EnhancedCategoryInflation";
import { calculateEnhancedCategoryInflation, generateLLMInterpretationPrompt } from "../components/utils/categoryInflationCalculations";
import { appClient } from "@/api/appClient";

export default function AnalyticsPage() {
    const [allReceipts, setAllReceipts] = useState([]);
    const [allBudgets, setAllBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeBudget, setActiveBudget] = useState(null);
    const [drillDown, setDrillDown] = useState({ isOpen: false, type: null, title: '', data: null });
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const navigate = useNavigate();
    const { user, features } = useUserContext();
    
    const [periodA, setPeriodA] = useState({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });

    const [comparisonMode, setComparisonMode] = useState(false); 
    const [activeTab, setActiveTab] = useState('overview'); 

    const [comparisonPreset, setComparisonPreset] = useState('month-on-month');
    const [deepDivePeriods, setDeepDivePeriods] = useState({ current: null, comparison: null });

    const [basketInflationInsight, setBasketInflationInsight] = useState(null);
    const [budgetProjectionsInsight, setBudgetProjectionsInsight] = useState(null);
    const [inflationComparisonData, setInflationComparisonData] = useState(null);
    const [enhancedCategoryData, setEnhancedCategoryData] = useState(null);
    const [llmInterpretation, setLlmInterpretation] = useState(null);
    const [interpretationLoading, setInterpretationLoading] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const currentUser = await User.me();
            if (currentUser && currentUser.household_id) {
                const [receiptData, budgetData] = await Promise.all([
                    Receipt.filter({ household_id: currentUser.household_id }, "-purchase_date", 2000),
                    Budget.filter({ household_id: currentUser.household_id }, "-period_start", 50)
                ]);

                // Filter out test data receipts
                const filteredReceipts = (receiptData || []).filter(r => !r.is_test_data);
                setAllReceipts(filteredReceipts);
                setAllBudgets(budgetData || []);

                const urlParams = new URLSearchParams(window.location.search);
                const budgetIdFromUrl = urlParams.get('budgetId');
                
                const activeOrSelectedBudget = budgetIdFromUrl 
                    ? budgetData.find(b => b.id === budgetIdFromUrl) 
                    : budgetData.find(b => b.is_active);

                if (activeOrSelectedBudget) {
                    setActiveBudget(activeOrSelectedBudget);
                    const initialPeriod = {
                        from: parseISO(activeOrSelectedBudget.period_start),
                        to: parseISO(activeOrSelectedBudget.period_end)
                    };
                    setPeriodA(initialPeriod);
                    setDeepDivePeriods(getBudgetAlignedPeriods(activeOrSelectedBudget, comparisonPreset)); 
                } else {
                    setActiveBudget(null);
                    setDeepDivePeriods({ current: null, comparison: null });
                }
            } else {
                setAllReceipts([]);
                setAllBudgets([]);
                setActiveBudget(null);
                setDeepDivePeriods({ current: null, comparison: null });
            }
        } catch (error) {
            setAllReceipts([]);
            setAllBudgets([]);
            setActiveBudget(null);
            setDeepDivePeriods({ current: null, comparison: null });
        }
        setLoading(false);
    }, [comparisonPreset]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (activeBudget) {
            const periods = getBudgetAlignedPeriods(activeBudget, comparisonPreset);
            setDeepDivePeriods(periods);
        } else {
            setDeepDivePeriods({ current: null, comparison: null });
        }
    }, [activeBudget, comparisonPreset]);
    
    useEffect(() => {
        if (allReceipts.length > 0 && allBudgets.length > 0 && deepDivePeriods.current && deepDivePeriods.comparison) {
            if (!activeBudget) {
                setBasketInflationInsight(null);
                setBudgetProjectionsInsight(null);
                setInflationComparisonData(null);
                setEnhancedCategoryData(null);
                setLlmInterpretation(null);
                return;
            }
            
            const currentPeriod = deepDivePeriods.current;
            const comparisonPeriod = deepDivePeriods.comparison;

            const insights = analyzeReceiptsForInsights(allReceipts, { current: currentPeriod, previous: comparisonPeriod }, allBudgets);

            setBasketInflationInsight(insights.basketInflation);
            setBudgetProjectionsInsight(insights.budgetProjections);
            
            // Fetch inflation comparison data
            fetchInflationComparison();
            
            // Calculate enhanced category data
            calculateEnhancedCategories();
        } else {
            setBasketInflationInsight(null);
            setBudgetProjectionsInsight(null);
            setInflationComparisonData(null);
            setEnhancedCategoryData(null);
            setLlmInterpretation(null);
        }
    }, [allReceipts, allBudgets, deepDivePeriods, activeBudget]);
    
    const fetchInflationComparison = async () => {
        try {
            const { appClient } = await import('@/api/appClient');
            const response = await appClient.functions.invoke('getInflationComparison', {});
            if (response.data.success) {
                setInflationComparisonData(response.data);
            }
        } catch (error) {
            console.error('Error fetching inflation comparison:', error);
            setInflationComparisonData(null);
        }
    };
    
    const calculateEnhancedCategories = async () => {
        try {
            const categoryData = calculateEnhancedCategoryInflation(
                allReceipts, 
                deepDivePeriods, 
                inflationComparisonData
            );
            setEnhancedCategoryData(categoryData);
            
            // Generate LLM interpretation
            if (Object.keys(categoryData).length > 0) {
                setInterpretationLoading(true);
                const prompt = generateLLMInterpretationPrompt(categoryData, user?.currency || 'GBP');
                
                try {
                    const response = await appClient.integrations.Core.InvokeLLM({
                        prompt,
                        add_context_from_internet: false
                    });
                    setLlmInterpretation(response);
                } catch (llmError) {
                    console.error('Error generating LLM interpretation:', llmError);
                    setLlmInterpretation(null);
                } finally {
                    setInterpretationLoading(false);
                }
            }
        } catch (error) {
            console.error('Error calculating enhanced categories:', error);
            setEnhancedCategoryData(null);
            setLlmInterpretation(null);
        }
    };
    
    const handleUseBudgetPeriod = () => {
        if (activeBudget) {
            const newPeriodA = {
                from: parseISO(activeBudget.period_start),
                to: parseISO(activeBudget.period_end)
            };
            setPeriodA(newPeriodA);
        }
    };
    
    const isCurrentPeriodActiveBudget = activeBudget && periodA.from && periodA.to &&
        parseISO(activeBudget.period_start) && parseISO(activeBudget.period_end) &&
        periodA.from.getTime() === parseISO(activeBudget.period_start).getTime() &&
        periodA.to.getTime() === parseISO(activeBudget.period_end).getTime();
    
    const handleDrillDownRequest = (type, context) => {
        let periodName = 'Selected Period'; 
        let drillDownData = null;
        let drillDownTitle = '';

        switch (type) {
            case 'category':
                drillDownData = filterReceipts(allReceipts, periodA)
                    .flatMap(r => (r.items || []).map(item => ({
                        ...item, 
                        receipt_id: r.id, 
                        supermarket: r.supermarket, 
                        purchase_date: r.purchase_date 
                    })))
                    .filter(item => (item.category || 'other').toLowerCase() === context.toLowerCase());
                drillDownTitle = `Items in "${context.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}" (${periodName})`;
                break;
            case 'supermarket':
                drillDownData = filterReceipts(allReceipts, periodA)
                    .flatMap(r => (r.items || []).map(item => ({
                        ...item, 
                        receipt_id: r.id, 
                        supermarket: r.supermarket, 
                        purchase_date: r.purchase_date 
                    })))
                    .filter(item => (item.supermarket || 'Unknown').toLowerCase() === context.toLowerCase());
                drillDownTitle = `Items from "${context}" (${periodName})`;
                break;
            case 'inflation':
            case 'shrinkflation':
            case 'volatility':
                drillDownData = context;
                drillDownTitle = `Purchase History for "${context.product}"`;
                break;
            default:
                return;
        }

        if (drillDownData) {
            setDrillDown({
                isOpen: true,
                type: type,
                title: drillDownTitle,
                data: drillDownData
            });
        }
    };
    
    const handleViewReceipt = (receiptId) => {
        setDrillDown({ isOpen: false, type: null, title: '', data: null });
        
        const receipt = allReceipts.find(r => r.id === receiptId);
        
        if (receipt) {
            setSelectedReceipt(receipt);
        } else {
            // Handle case where receipt is not found, e.g., show an error or log
        }
    };

    const handleDeleteReceipt = async (receiptId) => {
        if (window.confirm('Are you sure you want to delete this receipt?')) {
            try {
                await Receipt.delete(receiptId);
                setSelectedReceipt(null);
                loadData();
            } catch (error) {
                // Handle error
            }
        }
    };

    const displayedReceiptsA = filterReceipts(allReceipts, periodA);
    
    const deepDiveReceiptsCurrent = filterReceipts(allReceipts, deepDivePeriods.current);
    const deepDiveReceiptsComparison = filterReceipts(allReceipts, deepDivePeriods.comparison);
    
    const hasDataA = displayedReceiptsA && displayedReceiptsA.length > 0;

    const hasSufficientDataForAdvancedAnalysis = allReceipts && allReceipts.length >= 3;
    
    const hasAdvancedAnalytics = features.hasAdvancedAnalytics;

    return (
        <div className="p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                           <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-slate-900">Spending Analytics</h1>
                            <p className="text-xs md:text-base text-slate-600">
                                Visualize habits, find savings, and track inflation.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Mobile-optimized tabs with better spacing */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-3 md:p-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:flex sm:flex-row gap-1 h-auto bg-slate-100 p-1">
                                    <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
                                        Overview
                                    </TabsTrigger>
                                    {hasAdvancedAnalytics && (
                                        <>
                                            <TabsTrigger value="deep-dive" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
                                                Deep Dive
                                            </TabsTrigger>
                                            <TabsTrigger value="demo" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
                                                Demo
                                            </TabsTrigger>
                                        </>
                                    )}
                                </TabsList>
                            </div>

                            <TabsContent value="overview" className="space-y-6 mt-4">
                                {/* Comparison toggle - only in Overview tab */}
                                <div className="flex items-center justify-end gap-2 px-1 pb-4 border-b">
                                    <Label htmlFor="comparison-mode" className="text-xs sm:text-sm text-slate-700 whitespace-nowrap">
                                        Comparison Mode
                                    </Label>
                                    <Switch
                                        id="comparison-mode"
                                        checked={comparisonMode}
                                        onCheckedChange={setComparisonMode}
                                    />
                                </div>

                                {comparisonMode ? (
                                    <DateRangeComparer 
                                        receipts={allReceipts}
                                        currency={user?.currency || 'GBP'}
                                    />
                                ) : (
                                    <div className="space-y-6 overflow-x-auto">
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                                            <KeyMetrics receiptsA={displayedReceiptsA} loading={loading} className="xl:col-span-2" /> 
                                            
                                            <CategoryBreakdownChart receiptsA={displayedReceiptsA} loading={loading} onDrillDown={handleDrillDownRequest} />
                                            <SupermarketSpendChart receiptsA={displayedReceiptsA} loading={loading} onDrillDown={handleDrillDownRequest} />

                                            {hasDataA && (
                                                <>
                                                    <SpendingTrendChart receiptsA={displayedReceiptsA} loading={loading} className="xl:col-span-2" />
                                                    
                                                    <div className="xl:col-span-2">
                                                        <MonthlyCycleChart receipts={displayedReceiptsA} loading={loading} />
                                                    </div>

                                                    <div className="xl:col-span-2">
                                                        <TopItemsTable 
                                                            receipts={displayedReceiptsA} 
                                                            loading={loading} 
                                                            title={`Top Items (Period: ${periodA.from ? format(periodA.from, 'LLL d') : ''} - ${periodA.to ? format(periodA.to, 'LLL d') : ''})`}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            {hasAdvancedAnalytics && (
                                <>
                                    <TabsContent value="deep-dive" className="space-y-6 mt-4">
                                        <FeatureGuard
                                            requires="advanced-analytics"
                                            fallbackTitle="Deep Dive Analytics"
                                            fallbackDescription="Deep Dive analytics require a premium subscription."
                                        >
                                            <div className="space-y-6 overflow-x-auto">
                                                <Card className="p-4 bg-orange-50 border-orange-200">
                                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-orange-900">Budget-Aligned Comparison</h3>
                                                            <p className="text-sm text-orange-800">
                                                                Select a period to compare your active budget against. All metrics below will update.
                                                            </p>
                                                        </div>
                                                        <Select value={comparisonPreset} onValueChange={setComparisonPreset}>
                                                            <SelectTrigger className="w-full md:w-64">
                                                                <SelectValue placeholder="Select comparison preset" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="month-on-month">Month-on-Month</SelectItem>
                                                                <SelectItem value="3-months-ago">3 Months</SelectItem>
                                                                <SelectItem value="6-months-ago">6 Months</SelectItem>
                                                                <SelectItem value="year-on-year">12 Months</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </Card>

                                                {hasSufficientDataForAdvancedAnalysis ? (
                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                                                        <BasketInflationInsight 
                                                            insight={basketInflationInsight} 
                                                            loading={loading} 
                                                            receipts={allReceipts}
                                                            comparisonPeriods={deepDivePeriods}
                                                            inflationComparisonData={inflationComparisonData}
                                                            selectedPeriod={comparisonPreset}
                                                        />
                                                        <BudgetProjectionsInsight insight={budgetProjectionsInsight} loading={loading} />

                                                        <div className="xl:col-span-2">
                                                            <EnhancedCategoryInflation 
                                                                categoryData={enhancedCategoryData}
                                                                loading={loading || interpretationLoading}
                                                                inflationComparisonData={inflationComparisonData}
                                                                selectedPeriod={comparisonPreset}
                                                                llmInterpretation={llmInterpretation}
                                                            />
                                                        </div>

                                                        <AdvancedInflationTracker 
                                                            receipts={allReceipts} 
                                                            loading={loading} 
                                                            onDrillDown={handleDrillDownRequest} 
                                                            className="xl:col-span-2" 
                                                            comparisonPeriods={deepDivePeriods} 
                                                        />
                                                        <VolatilityDashboard 
                                                            receipts={allReceipts} 
                                                            loading={loading} 
                                                            onDrillDown={handleDrillDownRequest} 
                                                            className="xl:col-span-2" 
                                                            comparisonPeriods={deepDivePeriods} 
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-slate-500">Not enough data for deep dive analysis. Please add more receipts.</div>
                                                )}
                                            </div>
                                        </FeatureGuard>
                                    </TabsContent>

                                    <TabsContent value="demo" className="mt-4">
                                        <DemoInflationModel currency={user?.currency || 'GBP'} />
                                    </TabsContent>
                                </>
                            )}
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
            
            <AnalyticsDrillDownModal 
                isOpen={drillDown.isOpen}
                onClose={() => setDrillDown({ isOpen: false, type: null, title: '', data: null })}
                type={drillDown.type}
                title={drillDown.title}
                data={drillDown.data}
                onViewReceipt={handleViewReceipt}
            />
            
            {selectedReceipt && (
                <ReceiptDetailModal
                    receipt={selectedReceipt}
                    onClose={() => setSelectedReceipt(null)}
                    onDelete={handleDeleteReceipt}
                    onEdit={(receipt) => {
                        setSelectedReceipt(null);
                        navigate(createPageUrl(`Receipts?edit=${receipt.id}&return=analytics`));
                    }}
                />
            )}
        </div>
    );
}