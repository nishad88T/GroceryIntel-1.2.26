import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    Lightbulb,
    Eye,
    Sparkles,
    BarChart3,
    Target,
    Loader2,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Zap
} from 'lucide-react';
import { formatCurrency } from '@/components/utils/currency';

export default function PersonalInsights() {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [userCurrency, setUserCurrency] = useState('GBP');
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const user = await base44.auth.me();
            if (user.currency) {
                setUserCurrency(user.currency);
            }
            setIsAdmin(user.role === 'admin');
            await fetchInsights();
        } catch (err) {
            console.error('Error loading user data:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const fetchInsights = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await base44.functions.invoke('generateAdvancedInsights', {});
            
            if (response.data.success) {
                setInsights(response.data);
            } else {
                setError(response.data.error || 'Failed to generate insights');
            }
        } catch (err) {
            console.error('Error fetching insights:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleComputeSummary = async () => {
        setGenerating(true);
        try {
            await base44.functions.invoke('computeWeeklySummary', {});
            await fetchInsights();
        } catch (err) {
            console.error('Error computing summary:', err);
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'positive':
                return <CheckCircle2 className="w-5 h-5 text-green-600" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-orange-600" />;
            default:
                return <Lightbulb className="w-5 h-5 text-blue-600" />;
        }
    };

    const getDirectionIcon = (direction) => {
        switch (direction) {
            case 'increasing':
                return <ArrowUpRight className="w-4 h-4 text-red-600" />;
            case 'decreasing':
                return <ArrowDownRight className="w-4 h-4 text-green-600" />;
            case 'volatile':
                return <Activity className="w-4 h-4 text-orange-600" />;
            default:
                return <Minus className="w-4 h-4 text-slate-400" />;
        }
    };

    const getImpactBadge = (impact) => {
        const colors = {
            high: 'bg-red-100 text-red-800 border-red-200',
            medium: 'bg-orange-100 text-orange-800 border-orange-200',
            low: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
        return <Badge className={`${colors[impact] || 'bg-slate-100 text-slate-800'} border`}>{impact?.toUpperCase()}</Badge>;
    };

    const getPeriodBadge = (period) => {
        const labels = {
            over_8_weeks: '8 Weeks',
            recent_4_weeks: '4 Weeks',
            latest_week: 'Latest Week'
        };
        const colors = {
            over_8_weeks: 'bg-purple-100 text-purple-800',
            recent_4_weeks: 'bg-blue-100 text-blue-800',
            latest_week: 'bg-teal-100 text-teal-800'
        };
        return <Badge className={colors[period]}>{labels[period] || period}</Badge>;
    };

    const getBudgetStatusColor = (status) => {
        switch (status) {
            case 'on_track':
                return 'text-green-600';
            case 'approaching_limit':
                return 'text-orange-600';
            case 'overspend_risk':
            case 'over_budget':
                return 'text-red-600';
            default:
                return 'text-slate-600';
        }
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
                <Skeleton className="h-12 w-64" />
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-48" />
                    <Skeleton className="h-48" />
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (error && !insights) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <Alert variant="destructive" className="mb-6">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription className="ml-2">
                        {error}
                    </AlertDescription>
                </Alert>
                <Card>
                    <CardHeader>
                        <CardTitle>No Insights Available</CardTitle>
                        <CardDescription>
                            Generate your first weekly summary to see personalized insights
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleComputeSummary} disabled={generating}>
                            {generating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate Weekly Summary
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const data = insights?.insights;

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                            <Sparkles className="w-6 md:w-8 h-6 md:h-8 text-emerald-600" />
                            Personal Insights
                        </h1>
                        <p className="text-slate-600 mt-2 text-sm md:text-base">
                            AI-powered financial analyst for your grocery spending
                        </p>
                        {insights?.analysis_period && (
                            <div className="flex flex-wrap gap-2 mt-2 text-xs md:text-sm text-slate-500">
                                <span>📊 {insights.analysis_period.weeks_analyzed} weeks analyzed</span>
                                <span>•</span>
                                <span>{insights.analysis_period.earliest_week} to {insights.analysis_period.latest_week}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Executive Summary */}
                {data?.executive_summary && (
                    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-emerald-600" />
                                Executive Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-800 leading-relaxed font-medium">{data.executive_summary}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Spending Trends */}
                {data?.spending_trends && data.spending_trends.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                            Spending Trends
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {data.spending_trends.map((trend, idx) => (
                                <Card key={idx} className="hover:shadow-lg transition-all border-l-4 border-l-emerald-500">
                                    <CardHeader>
                                        <div className="flex items-start justify-between gap-2">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                {getDirectionIcon(trend.direction)}
                                                {trend.title}
                                            </CardTitle>
                                            <div className="flex gap-1 flex-shrink-0">
                                                {getImpactBadge(trend.impact)}
                                                {trend.period && getPeriodBadge(trend.period)}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <p className="text-slate-700 text-sm leading-relaxed">{trend.insight}</p>
                                        {trend.action_items && trend.action_items.length > 0 && (
                                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                                <p className="text-xs font-semibold text-emerald-800 mb-2 flex items-center gap-1">
                                                    <Zap className="w-3 h-3" />
                                                    Action Items:
                                                </p>
                                                <ul className="space-y-1">
                                                    {trend.action_items.map((action, i) => (
                                                        <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                                                            <span className="text-emerald-600 mt-1">→</span>
                                                            {action}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Inflation Analysis */}
                {data?.inflation_analysis && (
                    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                                Inflation Analysis: Personal vs National
                            </CardTitle>
                            <CardDescription>
                                How your grocery inflation compares to official statistics
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-slate-800 leading-relaxed">{data.inflation_analysis.summary}</p>
                            
                            {data.inflation_analysis.key_variances && data.inflation_analysis.key_variances.length > 0 && (
                                <div className="space-y-2">
                                    <p className="font-semibold text-slate-900 text-sm">Key Variances (Personal vs National):</p>
                                    {data.inflation_analysis.key_variances.map((variance, idx) => (
                                        <div key={idx} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-blue-100">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-medium text-slate-900 text-sm">{variance.category}</p>
                                                    {getImpactBadge(variance.impact)}
                                                </div>
                                                <p className="text-xs text-slate-600 mt-1">{variance.message}</p>
                                                {variance.cost_delta && (
                                                    <p className="text-xs text-red-600 font-semibold mt-1">
                                                        💰 Additional cost: {variance.cost_delta}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {data.inflation_analysis.forecast && (
                                <Alert className="bg-blue-100 border-blue-300">
                                    <TrendingUp className="w-4 h-4 text-blue-700" />
                                    <AlertDescription className="ml-2 text-blue-900">
                                        <span className="font-semibold">Forecast: </span>
                                        {data.inflation_analysis.forecast}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Volatility Alerts */}
                {data?.volatility_alerts && data.volatility_alerts.length > 0 && (
                    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-orange-600" />
                                Price Volatility Alerts
                            </CardTitle>
                            <CardDescription>
                                Categories with significant price fluctuations
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data.volatility_alerts.map((alert, idx) => (
                                    <div key={idx} className="bg-white rounded-lg p-4 border border-orange-200">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-semibold text-slate-900">{alert.category}</h3>
                                            {alert.price_range && (
                                                <Badge variant="outline" className="text-xs">
                                                    {alert.price_range}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-700 mb-2">{alert.alert}</p>
                                        {alert.recommendation && (
                                            <div className="bg-orange-50 rounded p-2 mt-2">
                                                <p className="text-xs text-orange-900">
                                                    <span className="font-semibold">💡 Strategy: </span>
                                                    {alert.recommendation}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Budget Guidance */}
                {data?.budget_guidance && data.budget_guidance.status !== 'no_budget' && (
                    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-purple-600" />
                                Budget Guidance & Trajectory
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">Status:</span>
                                <span className={`font-semibold text-base ${getBudgetStatusColor(data.budget_guidance.status)}`}>
                                    {data.budget_guidance.status.replace(/_/g, ' ').toUpperCase()}
                                </span>
                            </div>

                            {data.budget_guidance.trajectory && (
                                <Alert className={`border-2 ${
                                    data.budget_guidance.status === 'overspend_risk' || data.budget_guidance.status === 'over_budget'
                                        ? 'bg-red-50 border-red-300'
                                        : 'bg-purple-50 border-purple-300'
                                }`}>
                                    <AlertDescription className={`text-sm font-medium ${
                                        data.budget_guidance.status === 'overspend_risk' || data.budget_guidance.status === 'over_budget'
                                            ? 'text-red-900'
                                            : 'text-purple-900'
                                    }`}>
                                        <span className="font-bold">📈 Trajectory: </span>
                                        {data.budget_guidance.trajectory}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {data.budget_guidance.recommendations && data.budget_guidance.recommendations.length > 0 && (
                                <div className="space-y-2">
                                    <p className="font-semibold text-slate-900 text-sm">Recommendations:</p>
                                    <ul className="space-y-2">
                                        {data.budget_guidance.recommendations.map((rec, idx) => (
                                            <li key={idx} className="text-sm text-slate-700 flex items-start gap-2 bg-white rounded p-2 border border-purple-100">
                                                <span className="text-purple-600 mt-1">✓</span>
                                                {rec}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {data.budget_guidance.risk_areas && data.budget_guidance.risk_areas.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="font-semibold text-red-800 text-sm mb-2">⚠️ Risk Areas:</p>
                                    <ul className="space-y-1">
                                        {data.budget_guidance.risk_areas.map((risk, idx) => (
                                            <li key={idx} className="text-xs text-red-700">• {risk}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Quick Wins & Categories to Watch */}
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Quick Wins */}
                    {data?.quick_wins && data.quick_wins.length > 0 && (
                        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-green-600" />
                                    Quick Wins
                                </CardTitle>
                                <CardDescription>Immediate savings opportunities</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {data.quick_wins.map((win, idx) => (
                                        <li key={idx} className="text-sm text-slate-700 flex items-start gap-2 bg-white rounded p-2 border border-green-100">
                                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                            {win}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Categories to Watch */}
                    {data?.categories_to_watch && data.categories_to_watch.length > 0 && (
                        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-orange-600" />
                                    Categories to Watch
                                </CardTitle>
                                <CardDescription>Monitor these closely</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {data.categories_to_watch.map((cat, idx) => (
                                        <li key={idx} className="text-sm bg-white rounded p-3 border border-orange-100">
                                            <p className="font-semibold text-slate-900 flex items-center gap-1">
                                                👁️ {cat.category}
                                            </p>
                                            <p className="text-slate-600 text-xs mt-1">{cat.reason}</p>
                                            {cat.metric_to_track && (
                                                <p className="text-xs text-orange-700 mt-1 font-medium">
                                                    Track: {cat.metric_to_track}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Metadata - Only show for admins */}
                {isAdmin && insights && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500 justify-center">
                            {insights.tokens_used && (
                                <span>🤖 {insights.tokens_used} tokens used</span>
                            )}
                            {insights.data_sources?.insight_frequency && (
                                <span>📅 {insights.data_sources.insight_frequency} digest</span>
                            )}
                            {insights.generated_at && (
                                <span>⏱️ Generated: {new Date(insights.generated_at).toLocaleString()}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}