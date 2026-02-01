import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Zap, Target, Rocket } from "lucide-react";

export default function DevelopmentRoadmap() {
    const roadmapItems = {
        "Pre-Launch Priorities (0-3 months)": [
            {
                title: "Analytics Sophistication - Basket-level Inflation Decomposition",
                description: "Extend BasketInflationInsight to group item breakdown by category and present category-level inflation figures (e.g. 'Fruit & veg +8%, dairy +12%, household goods +3%'). This aligns perfectly with professional analysis.",
                status: "immediate",
                priority: "high"
            },
            {
                title: "Shrinkflation Flagging - Normalized Per 100g/ml Tracking",
                description: "Refine the shrinkflation calculation in insightCalculations.js to normalize prices to a standard unit (e.g., price per 100g/ml) before comparing them across periods. The underlying data is already captured.",
                status: "immediate", 
                priority: "high"
            },
            {
                title: "Export Options - CSV/Excel Export",
                description: "Implement backend function to generate CSV or Excel files from user's Receipt data, making it available on the Receipts or Analytics pages. Valuable immediate feature, particularly for premium users.",
                status: "immediate",
                priority: "medium"
            },
            {
                title: "Review Bold Claims Made on Webapp",
                description: "Ensure all features we build align with and effectively support any bold claims made in marketing and copy. Strategic alignment between features and messaging.",
                status: "immediate",
                priority: "high"
            },
            {
                title: "'Why GroceryTrack?' Messaging Enhancement",
                description: "Enhance Landing Page and About page with more direct copy to clearly articulate benefits vs. manual tracking, features, and multi-device capabilities.",
                status: "immediate",
                priority: "medium"
            },
            {
                title: "Enhanced OCR Processing Logic",
                description: "Implement conditional OCR routing - Google Vision for large/complex receipts for premium users, with 'taster' Google Vision scans for freemium users to demonstrate value.",
                status: "planning",
                priority: "high"
            },
            {
                title: "Receipt Processing Accuracy Improvements",
                description: "Continue refining OCR extraction accuracy and post-processing validation.",
                status: "ongoing",
                priority: "high"
            },
            {
                title: "Core Onboarding Flow",
                description: "Streamline the new user experience from registration to first successful receipt scan.",
                status: "planning",
                priority: "high"
            }
        ],
        "For 3-6 months": [
            {
                title: "Nutrition Database Integration",
                description: "Link scanned items to trusted databases (e.g., McCance & Widdowson, USDA, Open Food Facts) beyond current Calorie Ninjas API for enhanced accuracy and coverage.",
                status: "future",
                priority: "high"
            },
            {
                title: "Time-series Granularity Enhancements",
                description: "Add monthly/quarterly/yearly views, smoothing options for trend lines, and index rebasing (Jan 2023 = 100). Build on existing monthly/yearly views and OfficialInflationChart rebasing.",
                status: "future",
                priority: "medium"
            },
            {
                title: "Nutrition & Affordability Angle",
                description: "Implement sophisticated nutrition cost analysis: 'Protein costs per 100g up 15% YoY, making balanced diets more expensive.' Create affordability indices for key nutrients and food categories.",
                status: "future",
                priority: "high"
            },
            {
                title: "Advanced Multi-User Household Management",
                description: "Enhanced sharing capabilities, individual vs. household analytics, role-based permissions.",
                status: "future",
                priority: "medium"
            },
            {
                title: "Comprehensive Admin Dashboard",
                description: "Advanced user management, system analytics, and operational insights for platform management.",
                status: "future",
                priority: "medium"
            }
        ],
        "Long-term Vision (6+ months)": [
            {
                title: "Scenario Analysis - Brand Swapping Projections",
                description: "Professional-grade what-if modeling: 'If you swap brand A for Aldi's own, projected annual saving = £X.' Requires complex modeling, potentially using LLM for purchase history analysis.",
                status: "future",
                priority: "high"
            },
            {
                title: "Professional Applications & Partnerships",
                description: "Media & PR anonymized indices, academic datasets, fintech partnerships, local council integrations. Position as 'independent, receipt-based view of grocery inflation in the UK'.",
                status: "future", 
                priority: "medium"
            },
            {
                title: "Offline-First PWA Capabilities",
                description: "Full offline functionality for receipt scanning and data viewing, with intelligent sync when connectivity returns. Major architectural enhancement.",
                status: "future",
                priority: "low"
            },
            {
                title: "AI Shopping Assistant & Recommendations",
                description: "Personalized shopping recommendations based on purchase history, budget constraints, and nutritional goals.",
                status: "future",
                priority: "medium"
            },
            {
                title: "Integration Ecosystem",
                description: "APIs for third-party developers, webhooks for budgeting apps, and data export partnerships.",
                status: "future",
                priority: "low"
            }
        ]
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "immediate": return <Zap className="w-4 h-4 text-orange-600" />;
            case "ongoing": return <Clock className="w-4 h-4 text-blue-600" />;
            case "planning": return <Target className="w-4 h-4 text-purple-600" />;
            case "future": return <Rocket className="w-4 h-4 text-emerald-600" />;
            default: return <Clock className="w-4 h-4 text-slate-600" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "immediate": return "bg-orange-100 text-orange-800 border-orange-300";
            case "ongoing": return "bg-blue-100 text-blue-800 border-blue-300";
            case "planning": return "bg-purple-100 text-purple-800 border-purple-300";
            case "future": return "bg-emerald-100 text-emerald-800 border-emerald-300";
            default: return "bg-slate-100 text-slate-800 border-slate-300";
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case "high": return "bg-red-100 text-red-800 border-red-300";
            case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-300";
            case "low": return "bg-green-100 text-green-800 border-green-300";
            default: return "bg-slate-100 text-slate-800 border-slate-300";
        }
    };

    return (
        <div className="space-y-8">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">GroceryTrack Development Roadmap</h2>
                <p className="text-slate-600">Strategic development priorities and feature timeline</p>
            </div>

            {Object.entries(roadmapItems).map(([phase, items]) => (
                <Card key={phase} className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl text-emerald-800">{phase}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={index} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                                        <h3 className="font-semibold text-slate-900 flex-1">{item.title}</h3>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Badge variant="outline" className={getStatusColor(item.status)}>
                                                {getStatusIcon(item.status)}
                                                <span className="ml-1 capitalize">{item.status}</span>
                                            </Badge>
                                            <Badge variant="outline" className={getPriorityColor(item.priority)}>
                                                <span className="capitalize">{item.priority}</span>
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-slate-600 text-sm leading-relaxed">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}

            <Card className="border-none shadow-lg bg-gradient-to-r from-emerald-50 to-teal-50">
                <CardContent className="p-6">
                    <h3 className="font-bold text-emerald-800 mb-2">Development Philosophy</h3>
                    <p className="text-emerald-700 text-sm">
                        This roadmap balances immediate user value with long-term strategic positioning. 
                        We prioritize features that demonstrate clear ROI and support premium tier conversions, 
                        while building toward professional-grade capabilities that differentiate GroceryTrack 
                        as the definitive platform for grocery spending intelligence.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}