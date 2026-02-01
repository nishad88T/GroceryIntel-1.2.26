import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
    TrendingUp, 
    ShoppingCart, 
    PieChart, 
    Heart, 
    Sparkles,
    ArrowRight,
    CheckCircle
} from "lucide-react";
import { formatCurrency } from "@/components/utils/currency";
import { motion } from "framer-motion";

const CATEGORY_LABELS = {
    meat_fish: "Meat & Fish",
    vegetables_fruits: "Vegetables & Fruits",
    dairy_eggs: "Dairy & Eggs",
    bakery: "Bakery",
    snacks_sweets: "Snacks & Sweets",
    beverages: "Beverages",
    household_cleaning: "Household & Cleaning",
    personal_care: "Personal Care",
    frozen_foods: "Frozen Foods",
    pantry_staples: "Pantry Staples",
    other: "Other"
};

export default function ReceiptInsightsModal({ insights, currency, onClose, onViewAnalytics }) {
    if (!insights) return null;

    const categoryBreakdown = insights.category_breakdown || {};
    const sortedCategories = Object.entries(categoryBreakdown)
        .sort(([, a], [, b]) => b.total_spent - a.total_spent)
        .slice(0, 5);

    const qualityColor = insights.food_quality_score >= 7 ? "text-green-600" : 
                        insights.food_quality_score >= 4 ? "text-yellow-600" : "text-red-600";

    return (
        <Dialog open={!!insights} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Sparkles className="w-6 h-6 text-emerald-600" />
                        Your Receipt Insights
                    </DialogTitle>
                    <DialogDescription>
                        AI-powered analysis of your shopping trip
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="border-emerald-200 bg-emerald-50">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-600">Total Spent</p>
                                        <p className="text-2xl font-bold text-emerald-600">
                                            {formatCurrency(insights.total_spent, currency)}
                                        </p>
                                    </div>
                                    <ShoppingCart className="w-8 h-8 text-emerald-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-blue-200 bg-blue-50">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-600">Items</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {insights.item_count}
                                        </p>
                                    </div>
                                    <PieChart className="w-8 h-8 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Category Breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                                Spending by Category
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {sortedCategories.map(([category, data]) => (
                                <div key={category} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium">
                                            {CATEGORY_LABELS[category] || category}
                                        </span>
                                        <span className="text-slate-600">
                                            {formatCurrency(data.total_spent, currency)} ({data.percentage}%)
                                        </span>
                                    </div>
                                    <Progress value={data.percentage} className="h-2" />
                                </div>
                            ))}
                            {insights.top_category && (
                                <Badge className="mt-2 bg-emerald-100 text-emerald-700">
                                    Top Category: {CATEGORY_LABELS[insights.top_category] || insights.top_category}
                                </Badge>
                            )}
                        </CardContent>
                    </Card>

                    {/* Nutrition & Quality */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Heart className="w-5 h-5 text-red-500" />
                                    Nutrition Balance
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-700">
                                    {insights.nutrition_highlights}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    Food Quality
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`text-3xl font-bold ${qualityColor}`}>
                                        {insights.food_quality_score}/10
                                    </span>
                                </div>
                                <p className="text-sm text-slate-700">
                                    {insights.food_quality_notes}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Key Observations */}
                    {insights.key_observations && insights.key_observations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Key Observations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {insights.key_observations.map((obs, idx) => (
                                        <motion.li 
                                            key={idx}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="flex items-start gap-2 text-sm text-slate-700"
                                        >
                                            <span className="text-emerald-600 mt-0.5">•</span>
                                            {obs}
                                        </motion.li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Savings */}
                    {insights.savings_summary && (
                        <Card className="border-orange-200 bg-orange-50">
                            <CardContent className="p-4">
                                <p className="text-sm font-medium text-orange-800">
                                    💰 {insights.savings_summary}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button onClick={onClose} variant="outline" className="flex-1">
                            Close
                        </Button>
                        <Button 
                            onClick={onViewAnalytics} 
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                        >
                            View Full Analytics
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}