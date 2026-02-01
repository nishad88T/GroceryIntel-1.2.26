
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { 
    Sparkles, 
    TrendingUp, 
    TrendingDown, 
    AlertCircle, 
    ChevronRight,
    ShoppingCart,
    DollarSign,
    Calendar,
    Lightbulb
} from "lucide-react";
import { formatCurrency } from "@/components/utils/currency";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";

const InsightCard = ({ icon: Icon, title, description, impact, color = "blue" }) => {
    const colorClasses = {
        blue: "bg-blue-50 border-blue-200 text-blue-900",
        green: "bg-green-50 border-green-200 text-green-900",
        red: "bg-red-50 border-red-200 text-red-900",
        orange: "bg-orange-50 border-orange-200 text-orange-900",
        purple: "bg-purple-50 border-purple-200 text-purple-900"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg border-2 ${colorClasses[color]}`}
        >
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${color === 'blue' ? 'bg-blue-100' : color === 'green' ? 'bg-green-100' : color === 'red' ? 'bg-red-100' : color === 'orange' ? 'bg-orange-100' : 'bg-purple-100'}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">{title}</h4>
                    <p className="text-xs opacity-90">{description}</p>
                    {impact && (
                        <Badge variant="outline" className="mt-2 text-xs">
                            {impact}
                        </Badge>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default function WeeklyDigest({ receipts, budgets, currency = 'GBP' }) {
    const [timeframe, setTimeframe] = useState('week'); // 'week' or 'month'
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!receipts || receipts.length === 0) {
            setLoading(false);
            return;
        }

        generateInsights();
    }, [receipts, timeframe, budgets, currency]);

    const generateInsights = () => {
        setLoading(true);
        
        // Determine date range
        const now = new Date();
        let startDate, endDate, previousStartDate, previousEndDate;
        
        if (timeframe === 'week') {
            startDate = startOfWeek(now, { weekStartsOn: 1 });
            endDate = endOfWeek(now, { weekStartsOn: 1 });
            previousStartDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
            previousEndDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        } else {
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            previousStartDate = startOfMonth(subMonths(now, 1));
            previousEndDate = endOfMonth(subMonths(now, 1));
        }

        // Filter receipts for current and previous period
        const currentReceipts = receipts.filter(r => {
            const date = new Date(r.purchase_date);
            return date >= startDate && date <= endDate;
        });

        const previousReceipts = receipts.filter(r => {
            const date = new Date(r.purchase_date);
            return date >= previousStartDate && date <= previousEndDate;
        });

        const generatedInsights = [];

        // 1. Aggregate insights from receipt_insights
        const allHighlights = currentReceipts
            .filter(r => r.receipt_insights && r.receipt_insights.highlights)
            .flatMap(r => r.receipt_insights.highlights);

        if (allHighlights.length > 0) {
            // Pick top 2 most interesting highlights
            const topHighlights = allHighlights.slice(0, 2);
            topHighlights.forEach((highlight) => {
                generatedInsights.push({
                    icon: Sparkles,
                    title: 'Recent Shopping Insight',
                    description: highlight,
                    color: 'purple'
                });
            });
        }

        // 2. Spending comparison
        const currentSpend = currentReceipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
        const previousSpend = previousReceipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
        
        if (currentSpend > 0 && previousSpend > 0) {
            const difference = currentSpend - previousSpend;
            const percentChange = (difference / previousSpend) * 100;
            
            if (Math.abs(percentChange) > 5) { // Only show if >5% change
                generatedInsights.push({
                    icon: difference > 0 ? TrendingUp : TrendingDown,
                    title: `Spending ${difference > 0 ? 'Increased' : 'Decreased'} This ${timeframe === 'week' ? 'Week' : 'Month'}`,
                    description: `You've spent ${formatCurrency(Math.abs(difference), currency)} ${difference > 0 ? 'more' : 'less'} compared to last ${timeframe === 'week' ? 'week' : 'month'} (${Math.abs(percentChange).toFixed(1)}% ${difference > 0 ? 'increase' : 'decrease'}).`,
                    impact: difference > 0 ? 'Consider budget adjustments' : 'Great savings!',
                    color: difference > 0 ? 'red' : 'green'
                });
            }
        }

        // 3. Category spending patterns
        const categorySpending = {};
        currentReceipts.forEach(r => {
            (r.items || []).forEach(item => {
                const cat = item.category || 'other';
                categorySpending[cat] = (categorySpending[cat] || 0) + (item.total_price || 0);
            });
        });

        const topCategory = Object.entries(categorySpending)
            .sort((a, b) => b[1] - a[1])[0];

        if (topCategory && currentSpend > 0) {
            const [category, amount] = topCategory;
            const percentage = (amount / currentSpend) * 100;
            
            if (percentage > 30) { // If one category is >30% of total
                generatedInsights.push({
                    icon: ShoppingCart,
                    title: 'Top Spending Category',
                    description: `${category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} accounts for ${percentage.toFixed(0)}% of your spending this ${timeframe === 'week' ? 'week' : 'month'} (${formatCurrency(amount, currency)}).`,
                    impact: percentage > 40 ? 'Consider diversifying purchases' : null,
                    color: 'blue'
                });
            }
        }

        // 4. Budget alert
        const activeBudget = budgets?.find(b => b.is_active);
        if (activeBudget && currentSpend > 0) {
            const budgetProgress = (currentSpend / activeBudget.amount) * 100;
            
            if (budgetProgress > 75) {
                generatedInsights.push({
                    icon: AlertCircle,
                    title: 'Budget Alert',
                    description: `You've used ${budgetProgress.toFixed(0)}% of your budget. ${formatCurrency(activeBudget.amount - currentSpend, currency)} remaining.`,
                    impact: budgetProgress > 90 ? 'Urgent: Nearing limit' : 'Monitor spending closely',
                    color: budgetProgress > 90 ? 'red' : 'orange'
                });
            }
        }

        // 5. Shopping frequency insight
        if (currentReceipts.length > 0) {
            const avgTripValue = currentSpend / currentReceipts.length;
            const daysInPeriod = timeframe === 'week' ? 7 : 30;
            const tripsPerWeek = (currentReceipts.length / daysInPeriod) * 7;

            if (tripsPerWeek > 3) {
                generatedInsights.push({
                    icon: Calendar,
                    title: 'Frequent Shopper Pattern',
                    description: `You're shopping ${tripsPerWeek.toFixed(1)} times per week with an average trip value of ${formatCurrency(avgTripValue, currency)}. Consider weekly bulk shops to save time and potentially money.`,
                    color: 'blue'
                });
            }
        }

        // If no insights, add a default encouraging message
        if (generatedInsights.length === 0) {
            generatedInsights.push({
                icon: Lightbulb,
                title: 'Keep Tracking!',
                description: `Continue scanning receipts to unlock personalized insights about your shopping habits and savings opportunities.`,
                color: 'purple'
            });
        }

        setInsights(generatedInsights.slice(0, 3)); // Show top 3 insights
        setLoading(false);
    };

    if (loading) {
        return (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-blue-50 backdrop-blur-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                            Your Shopping Insights
                        </CardTitle>
                        <CardDescription>
                            Personalized discoveries from your recent purchases
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant={timeframe === 'week' ? 'default' : 'outline'}
                            onClick={() => setTimeframe('week')}
                            className={timeframe === 'week' ? 'bg-purple-600' : ''}
                        >
                            Week
                        </Button>
                        <Button
                            size="sm"
                            variant={timeframe === 'month' ? 'default' : 'outline'}
                            onClick={() => setTimeframe('month')}
                            className={timeframe === 'month' ? 'bg-purple-600' : ''}
                        >
                            Month
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {insights.map((insight, idx) => (
                    <InsightCard
                        key={idx}
                        icon={insight.icon}
                        title={insight.title}
                        description={insight.description}
                        impact={insight.impact}
                        color={insight.color}
                    />
                ))}
            </CardContent>
        </Card>
    );
}
