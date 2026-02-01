
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
    TrendingUp, 
    TrendingDown, 
    Lightbulb, 
    Clock, 
    Target, 
    AlertCircle, 
    CheckCircle, 
    BarChart3, 
    Users, 
    Zap, 
    Globe, 
    Smartphone,
    CreditCard,
    Store,
    Database,
    Rocket,
    LayoutDashboard,
    HeartPulse,
    Tags,
    Scan,
    Palette,
    ShieldCheck,
    Percent,
    MapPin,
    RefreshCw,
    DollarSign,
    Scale,
    PieChart,
    FileStack
} from "lucide-react";
import { FeatureGuard } from '@/components/shared/FeatureGuard';
import { CorrectionLog, OCRFeedback, Receipt } from '@/entities/all';

export default function AdminInsights() {
    const [correctionLogs, setCorrectionLogs] = useState([]);
    const [ocrFeedback, setOcrFeedback] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [corrections, feedback, receiptData] = await Promise.all([
                    CorrectionLog.list('-created_date', 100),
                    OCRFeedback.list('-created_date', 50),
                    Receipt.list('-created_date', 50)
                ]);
                setCorrectionLogs(corrections);
                setOcrFeedback(feedback);
                setReceipts(receiptData);
            } catch (error) {
                console.error('Failed to load admin data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Calculate OCR accuracy metrics
    const accuracyMetrics = useMemo(() => {
        if (correctionLogs.length === 0) {
            return {
                averageSuccessRate: 0,
                averageItemsCorrected: 0,
                totalScans: 0,
                perfectScans: 0,
                recentTrend: 'stable'
            };
        }

        const totalSuccessRate = correctionLogs.reduce((sum, log) => sum + (log.success_rate || 0), 0);
        const totalItemsCorrected = correctionLogs.reduce((sum, log) => sum + (log.items_corrected || 0), 0);
        const perfectScans = correctionLogs.filter(log => (log.success_rate || 0) >= 95).length;
        
        // Recent trend (last 10 vs previous 10)
        const recent10 = correctionLogs.slice(0, 10);
        const previous10 = correctionLogs.slice(10, 20);
        const recentAvg = recent10.length > 0 ? recent10.reduce((sum, log) => sum + (log.success_rate || 0), 0) / recent10.length : 0;
        const previousAvg = previous10.length > 0 ? previous10.reduce((sum, log) => sum + (log.success_rate || 0), 0) / previous10.length : 0;
        
        let recentTrend = 'stable';
        if (recentAvg > previousAvg + 2) recentTrend = 'improving';
        else if (recentAvg < previousAvg - 2) recentTrend = 'declining';

        return {
            averageSuccessRate: Math.round(totalSuccessRate / correctionLogs.length),
            averageItemsCorrected: Math.round((totalItemsCorrected / correctionLogs.length) * 10) / 10,
            totalScans: correctionLogs.length,
            perfectScans,
            perfectScanRate: Math.round((perfectScans / correctionLogs.length) * 100),
            recentTrend
        };
    }, [correctionLogs]);

    // Process feedback data
    const feedbackMetrics = useMemo(() => {
        if (ocrFeedback.length === 0) {
            return {
                averageRating: 0,
                totalFeedback: 0,
                commonIssues: [],
                positiveCount: 0
            };
        }

        const totalRating = ocrFeedback.reduce((sum, fb) => sum + (fb.rating || 0), 0);
        const averageRating = totalRating / ocrFeedback.length;
        const positiveCount = ocrFeedback.filter(fb => (fb.rating || 0) >= 4).length;
        
        // Count common issues
        const issueCount = {};
        ocrFeedback.forEach(fb => {
            (fb.issues || []).forEach(issue => {
                issueCount[issue] = (issueCount[issue] || 0) + 1;
            });
        });
        
        const commonIssues = Object.entries(issueCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([issue, count]) => ({ issue, count }));

        return {
            averageRating: Math.round(averageRating * 10) / 10,
            totalFeedback: ocrFeedback.length,
            commonIssues,
            positiveCount,
            positiveRate: Math.round((positiveCount / ocrFeedback.length) * 100)
        };
    }, [ocrFeedback]);

    const preLaunchPriorities = [
        {
            icon: BarChart3,
            title: "Inflation Model Validation",
            description: "Rigorously test all inflation and price volatility models with historical data to ensure accuracy.",
            category: "Core Logic"
        },
        {
            icon: Scan,
            title: "Hybrid OCR Model (Google Vision)",
            description: "Trial Google Vision OCR alongside the current LLM to improve accuracy, especially for long receipts.",
            category: "Accuracy"
        },
        {
            icon: HeartPulse,
            title: "Nutrition Analysis Validation",
            description: "Verify that nutritional calculations (e.g., price per 100g) are sensible and not generating junk data.",
            category: "Core Logic"
        },
        {
            icon: Tags,
            title: "Improve Item Categorization",
            description: "Refine logic so items like coffee aren't miscategorized as 'processed foods'.",
            category: "Accuracy"
        },
        {
            icon: Globe,
            title: "ONS Inflation API Check",
            description: "Confirm the ONS API integration is functional and reliable. Hide if necessary before launch.",
            category: "Integration"
        },
        {
            icon: LayoutDashboard,
            title: "Validate Dashboard Insights",
            description: "Ensure all dynamically generated insights on the main dashboard are accurate and make sense.",
            category: "UI/UX"
        },
        {
            icon: Percent,
            title: "Implement VAT Logic for Receipts",
            description: "Create logic to handle receipts from stores like Costco that don't include line-item VAT.",
            category: "Core Logic"
        },
        {
            icon: Palette,
            title: "Re-order Navigation Tabs",
            description: "Clean up and re-organize the main navigation menu for a more intuitive user experience.",
            category: "UI/UX"
        },
        {
            icon: ShieldCheck,
            title: "Update Legal Pages",
            description: "Integrate the final Terms of Use and Privacy Policy content into the app.",
            category: "Content"
        },
        {
            icon: MapPin,
            title: "Verify Store Location Capture",
            description: "Ensure the scan function correctly saves manually added store location data.",
            category: "Accuracy"
        },
        {
            icon: RefreshCw,
            title: "Budget Roll-Over Automation",
            description: "Implement automatic budget period roll-over when the current budget period ends, creating new budget periods seamlessly.",
            category: "Core Logic"
        },
        {
            icon: Store,
            title: "Store Name Standardisation",
            description: "Normalize supermarket names (e.g., 'Aldi', 'ALDI', 'Aldi Stores') to ensure consistent data for analytics and comparisons.",
            category: "Accuracy"
        },
        {
            icon: FileStack,
            title: "Receipt Scan - Validate Later Function",
            description: "Add a 'Validate Later' option for multi-receipt scans (e.g., 3+ images) to allow quick uploads without immediate review.",
            category: "UI/UX"
        },
        {
            icon: DollarSign,
            title: "Nutrition Analysis API - Credit Management",
            description: "Pause or gate the Calorie Ninjas API to prevent background credit consumption until credit system is production-ready.",
            category: "Integration"
        },
        {
            icon: TrendingUp,
            title: "Contextual Benchmarking vs UK Inflation",
            description: "Show how user's basket inflation compares to national UK grocery inflation (e.g., 'Your basket +6% vs national +9%').",
            category: "Analytics"
        },
        {
            icon: Scale,
            title: "Shrinkflation Flagging Enhancement",
            description: "Enhance shrinkflation detection with normalized 'per 100g/ml' tracking to catch subtle pack size reductions.",
            category: "Analytics"
        },
        {
            icon: PieChart,
            title: "Basket-Level Inflation Decomposition",
            description: "Extend analytics to show category-level inflation breakdowns (e.g., 'Fruit & veg +8%, dairy +12%, household goods +3%').",
            category: "Analytics"
        }
    ];

    const immediateIdeas = [
        {
            icon: Database,
            title: "Crowd-sourced Price Database",
            description: "Build the largest UK grocery price database from user receipts",
            priority: "High",
            effort: "Large",
            impact: "Game-changer"
        },
        {
            icon: CreditCard,
            title: "Open Banking Integration",
            description: "Sync bank transactions with receipts for automated tracking",
            priority: "High",
            effort: "Large",
            impact: "Game-changer"
        },
        {
            icon: TrendingUp,
            title: "Price Alert System",
            description: "Notify users when items they buy frequently go on sale",
            priority: "Medium",
            effort: "Medium",
            impact: "High"
        },
        {
            icon: Store,
            title: "Enhanced Store Branch Capture",
            description: "Capture specific store locations for hyper-local price comparisons",
            priority: "Medium",
            effort: "Medium",
            impact: "High"
        },
        {
            icon: Users,
            title: "Shopping List Collaboration",
            description: "Share shopping lists with family members",
            priority: "Low",
            effort: "Medium",
            impact: "Medium"
        }
    ];

    const futuristicIdeas = [
        {
            icon: Smartphone,
            title: "Mobile App Development",
            description: "Native iOS/Android apps for better camera and scanning experience",
            timeframe: "6-12 months",
            complexity: "Large"
        },
        {
            icon: Globe,
            title: "AI-Powered Shopping Recommendations",
            description: "Suggest optimal shopping strategies based on user patterns and market data",
            timeframe: "12-18 months",
            complexity: "High"
        },
        {
            icon: BarChart3,
            title: "Predictive Budget Analytics",
            description: "Predict future spending patterns and suggest budget adjustments",
            timeframe: "9-12 months",
            complexity: "Medium"
        },
        {
            icon: Zap,
            title: "Real-time Store Inventory Alerts",
            description: "Know when items are in stock at nearby stores",
            timeframe: "18+ months",
            complexity: "Very High"
        },
        {
            icon: Target,
            title: "Gamification & Rewards",
            description: "Achievement system for budget goals and sustainable shopping",
            timeframe: "6-9 months",
            complexity: "Medium"
        }
    ];

    if (loading) {
        return (
            <FeatureGuard requires="feature-guide">
                <div className="p-8">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-32 bg-slate-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </FeatureGuard>
        );
    }

    return (
        <FeatureGuard requires="feature-guide">
            <div className="p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Insights</h1>
                        <p className="text-slate-600">Development roadmap and system performance metrics</p>
                    </div>

                    <Tabs defaultValue="accuracy" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="accuracy">OCR Performance</TabsTrigger>
                            <TabsTrigger value="roadmap">Development Roadmap</TabsTrigger>
                        </TabsList>

                        <TabsContent value="accuracy" className="space-y-6">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600">Average Accuracy</p>
                                                <p className="text-3xl font-bold text-emerald-600">
                                                    {accuracyMetrics.averageSuccessRate}%
                                                </p>
                                            </div>
                                            <div className={`p-3 rounded-full ${
                                                accuracyMetrics.recentTrend === 'improving' ? 'bg-emerald-100' :
                                                accuracyMetrics.recentTrend === 'declining' ? 'bg-red-100' : 'bg-slate-100'
                                            }`}>
                                                {accuracyMetrics.recentTrend === 'improving' ? (
                                                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                                                ) : accuracyMetrics.recentTrend === 'declining' ? (
                                                    <TrendingDown className="w-6 h-6 text-red-600" />
                                                ) : (
                                                    <BarChart3 className="w-6 h-6 text-slate-600" />
                                                )}
                                            </div>
                                        </div>
                                        <Progress 
                                            value={accuracyMetrics.averageSuccessRate} 
                                            className="mt-4 h-2" 
                                        />
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600">Perfect Scans</p>
                                                <p className="text-3xl font-bold text-emerald-600">
                                                    {accuracyMetrics.perfectScanRate}%
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-full bg-emerald-100">
                                                <CheckCircle className="w-6 h-6 text-emerald-600" />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            {accuracyMetrics.perfectScans} of {accuracyMetrics.totalScans} scans
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600">Avg Corrections</p>
                                                <p className="text-3xl font-bold text-orange-600">
                                                    {accuracyMetrics.averageItemsCorrected}
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-full bg-orange-100">
                                                <AlertCircle className="w-6 h-6 text-orange-600" />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            Items per receipt
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600">User Satisfaction</p>
                                                <p className="text-3xl font-bold text-blue-600">
                                                    {feedbackMetrics.averageRating}/5
                                                </p>
                                            </div>
                                            <div className="p-3 rounded-full bg-blue-100">
                                                <Users className="w-6 h-6 text-blue-600" />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            {feedbackMetrics.positiveRate}% positive ({feedbackMetrics.totalFeedback} responses)
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Common Issues */}
                            {feedbackMetrics.commonIssues.length > 0 && (
                                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-orange-600" />
                                            Most Reported Issues
                                        </CardTitle>
                                        <CardDescription>
                                            Top issues reported by users during receipt scanning
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {feedbackMetrics.commonIssues.map(({ issue, count }, index) => (
                                                <div key={issue} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                                                            {index + 1}
                                                        </Badge>
                                                        <span className="font-medium capitalize">
                                                            {issue.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                    <Badge variant="secondary">{count} reports</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="roadmap" className="space-y-6">
                            {/* Pre-launch Priorities */}
                             <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Rocket className="w-5 h-5 text-orange-600" />
                                        Pre-Launch Priorities (0-3 months)
                                    </CardTitle>
                                    <CardDescription>
                                        Critical tasks for core feature stability and accuracy before BETA launch.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {preLaunchPriorities.map((idea, index) => (
                                            <div key={index} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow bg-white">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-orange-100 rounded-lg">
                                                        <idea.icon className="w-5 h-5 text-orange-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-slate-900">{idea.title}</h4>
                                                        <p className="text-sm text-slate-600 mt-1">{idea.description}</p>
                                                        <div className="flex gap-2 mt-3">
                                                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                                                {idea.category}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Immediate Ideas */}
                            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-emerald-600" />
                                        Immediate Priorities (3-6 months)
                                    </CardTitle>
                                    <CardDescription>
                                        Features ready for implementation that will have immediate impact.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {immediateIdeas.map((idea, index) => (
                                            <div key={index} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                                        <idea.icon className="w-5 h-5 text-emerald-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-slate-900">{idea.title}</h4>
                                                        <p className="text-sm text-slate-600 mt-1">{idea.description}</p>
                                                        <div className="flex gap-2 mt-3">
                                                            <Badge variant={idea.priority === 'High' ? 'default' : 'secondary'} className="text-xs">
                                                                {idea.priority} Priority
                                                            </Badge>
                                                            <Badge variant="outline" className="text-xs">
                                                                {idea.effort} Effort
                                                            </Badge>
                                                            <Badge variant="outline" className="text-xs text-emerald-600">
                                                                {idea.impact} Impact
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Futuristic Ideas */}
                            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Lightbulb className="w-5 h-5 text-blue-600" />
                                        Future Vision (6+ months)
                                    </CardTitle>
                                    <CardDescription>
                                        Advanced features that will transform the grocery tracking experience.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {futuristicIdeas.map((idea, index) => (
                                            <div key={index} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-blue-100 rounded-lg">
                                                        <idea.icon className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-semibold text-slate-900">{idea.title}</h4>
                                                        <p className="text-sm text-slate-600 mt-1">{idea.description}</p>
                                                        <div className="flex gap-2 mt-3">
                                                            <Badge variant="outline" className="text-xs">
                                                                {idea.timeframe}
                                                            </Badge>
                                                            <Badge variant="outline" className="text-xs">
                                                                {idea.complexity} Complexity
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </FeatureGuard>
    );
}
