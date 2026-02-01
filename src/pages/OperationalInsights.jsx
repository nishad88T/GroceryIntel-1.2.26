
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, AlertTriangle, DollarSign, Zap, Database, Brain, CloudCog, Code, TrendingUp, FileText, Loader2, Star, Calendar as CalendarIcon, Activity, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client"; // Changed from getComprehensiveCreditReport
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';
import HistoricalRecategorizationTool from "@/components/admin/HistoricalRecategorizationTool";

const TEXTRACT_COST_PER_SCAN = 0.015;
const BASE44_MONTHLY_ALLOWANCE = 10000;

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

const CostDriverCard = ({ title, activity, costDriver, costImpact, icon: Icon, color = "blue", additionalNotes = null }) => {
    const colorClasses = {
        red: "bg-red-50 border-red-200 text-red-900",
        green: "bg-green-50 border-green-200 text-green-900",
        blue: "bg-blue-50 border-blue-200 text-blue-900",
        yellow: "bg-yellow-50 border-yellow-200 text-yellow-900",
        purple: "bg-purple-50 border-purple-200 text-purple-900",
        gray: "bg-gray-50 border-gray-200 text-gray-900",
        orange: "bg-orange-50 border-orange-200 text-orange-900"
    };

    const iconColors = {
        red: "text-red-600",
        green: "text-green-600",
        blue: "text-blue-600",
        yellow: "text-yellow-600",
        purple: "text-purple-600",
        gray: "text-gray-600",
        orange: "text-orange-600"
    };

    return (
        <Card className={`${colorClasses[color]} border-2`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className={`w-5 h-5 ${iconColors[color]}`} />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div>
                    <p className="text-sm font-semibold mb-1">Activity:</p>
                    <p className="text-sm">{activity}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold mb-1">Primary Cost Driver:</p>
                    <p className="text-sm">{costDriver}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold mb-1">Cost Impact:</p>
                    <p className="text-sm font-bold">{costImpact}</p>
                </div>
                {additionalNotes && (
                    <div className="pt-2 border-t border-current border-opacity-20">
                        <p className="text-xs">{additionalNotes}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const ConceptCard = ({ title, description, icon: Icon, items }) => (
    <Card className="h-full">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-slate-600" />
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-slate-600 mb-3">{description}</p>
            <ul className="text-sm space-y-1">
                {items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                        <span className="text-slate-400">•</span>
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </CardContent>
    </Card>
);

const CreditMonitoringDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState('current_month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const getDateRangeParams = () => {
        const now = new Date();
        let start_date, end_date;

        switch (dateRange) {
            case 'current_month':
                start_date = format(startOfMonth(now), 'yyyy-MM-dd');
                end_date = format(endOfMonth(now), 'yyyy-MM-dd');
                break;
            case 'last_month':
                const lastMonth = subMonths(now, 1);
                start_date = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
                end_date = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
                break;
            case 'last_3_months':
                start_date = format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd');
                end_date = format(endOfMonth(now), 'yyyy-MM-dd');
                break;
            case 'this_year':
                start_date = format(startOfYear(now), 'yyyy-MM-dd');
                end_date = format(endOfYear(now), 'yyyy-MM-dd');
                break;
            case 'last_year':
                const lastYear = subYears(now, 1);
                start_date = format(startOfYear(lastYear), 'yyyy-MM-dd');
                end_date = format(endOfYear(lastYear), 'yyyy-MM-dd');
                break;
            case 'custom':
                start_date = customStartDate;
                end_date = customEndDate;
                break;
            default:
                start_date = format(startOfMonth(now), 'yyyy-MM-dd');
                end_date = format(endOfMonth(now), 'yyyy-MM-dd');
        }

        return { start_date, end_date };
    };

    const fetchData = async () => {
        if (dateRange === 'custom' && (!customStartDate || !customEndDate)) {
            setError("Please select both start and end dates for custom range.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { start_date, end_date } = getDateRangeParams();
            const response = await base44.functions.invoke('getComprehensiveCreditReport', { start_date, end_date });
            console.log("Credit report response:", response);
            if (response.data) {
                setData(response.data);
            } else {
                throw new Error("Failed to fetch credit report or no data returned.");
            }
        } catch (err) {
            console.error("Credit report fetch error:", err);
            setError(err.response?.data?.error || err.message || "An unknown error occurred.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [dateRange, customStartDate, customEndDate]);

    const totals = React.useMemo(() => {
        if (!data || !data.report) return {};
        const grandTotals = { totalCredits: 0, totalTextractScans: 0, totalBase44Credits: 0 };
        data.eventTypes.forEach(type => grandTotals[type] = 0);

        Object.values(data.report).forEach(userData => {
            data.eventTypes.forEach(type => {
                grandTotals[type] += userData[type] || 0;
            });
            grandTotals.totalCredits += userData.totals.credits || 0;
            grandTotals.totalTextractScans += userData.totals.textract_scans || 0;
        });

        // Calculate base44 credits (everything except textract scans)
        grandTotals.totalBase44Credits = grandTotals.totalCredits - grandTotals.totalTextractScans;

        return grandTotals;
    }, [data]);

    const kpis = React.useMemo(() => {
        if (!data || !totals.totalCredits) return null;

        const estimatedTextractCost = totals.totalTextractScans * TEXTRACT_COST_PER_SCAN;
        
        // Calculate days in selected period for average daily calculation
        const periodStart = new Date(data.period.start);
        const periodEnd = new Date(data.period.end);
        const daysInPeriod = Math.max(1, Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)));

        const avgDailyCredits = totals.totalCredits / daysInPeriod;
        const avgDailyCost = estimatedTextractCost / daysInPeriod;

        // Credits remaining only relevant for current month
        const now = new Date();
        const isCurrentMonth = dateRange === 'current_month' || 
                               (startOfMonth(new Date(data.period.start)).getTime() === startOfMonth(now).getTime() && 
                                endOfMonth(new Date(data.period.end)).getTime() === endOfMonth(now).getTime());
        const creditsRemaining = isCurrentMonth ? Math.max(0, BASE44_MONTHLY_ALLOWANCE - totals.totalBase44Credits) : null;

        return {
            totalCredits: totals.totalCredits,
            totalTextractScans: totals.totalTextractScans,
            totalBase44Credits: totals.totalBase44Credits,
            estimatedCost: estimatedTextractCost,
            avgDailyCredits: avgDailyCredits,
            avgDailyCost: avgDailyCost,
            creditsRemaining: creditsRemaining,
            daysInPeriod
        };
    }, [data, totals, dateRange]);

    const monthlyTrendData = React.useMemo(() => {
        if (!data || !data.monthlyBreakdown) return [];
        
        return Object.entries(data.monthlyBreakdown)
            .map(([month, values]) => ({
                month,
                textract_scans: values.textract_scans,
                base44_credits: values.base44_credits,
                total_credits: values.total_credits,
                estimated_cost: values.textract_scans * TEXTRACT_COST_PER_SCAN
            }))
            .sort((a, b) => a.month.localeCompare(b.month)); // Ensure chronological order
    }, [data]);

    const eventTypeChartData = React.useMemo(() => {
        if (!data || !data.eventTypeAggregations) return [];
        
        return Object.entries(data.eventTypeAggregations)
            .map(([event_type, count]) => ({
                name: event_type.replace(/_/g, ' ').toUpperCase(),
                value: count
            }))
            .sort((a, b) => b.value - a.value);
    }, [data]);

    const topUsersData = React.useMemo(() => {
        if (!data || !data.report) return [];
        
        return Object.entries(data.report)
            .filter(([, userData]) => userData.totals.credits > 0)
            .map(([email, userData]) => ({
                email,
                credits: userData.totals.credits,
                textract_scans: userData.totals.textract_scans || 0
            }))
            .sort((a, b) => b.credits - a.credits)
            .slice(0, 10);
    }, [data]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                <span className="ml-3 text-slate-600">Loading Credit Consumption Dashboard...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    <strong>Failed to load credit report:</strong> {error}
                </AlertDescription>
            </Alert>
        );
    }

    if (!data || !data.report || Object.keys(data.report).length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Credit Consumption KPI Dashboard</CardTitle>
                    <CardDescription>
                        No credit consumption data available for the selected period. Data will appear once credit-consuming actions are logged.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Date Range Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-emerald-600" />
                        Select Reporting Period
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <Select value={dateRange} onValueChange={setDateRange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="current_month">Current Month</SelectItem>
                                    <SelectItem value="last_month">Last Month</SelectItem>
                                    <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                                    <SelectItem value="this_year">This Year</SelectItem>
                                    <SelectItem value="last_year">Last Year</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {dateRange === 'custom' && (
                            <>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="border rounded px-3 py-2"
                                    placeholder="Start Date"
                                />
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="border rounded px-3 py-2"
                                    placeholder="End Date"
                                />
                                <button
                                    onClick={fetchData}
                                    className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
                                >
                                    Apply
                                </button>
                            </>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                        Showing data from {format(new Date(data.period.start), 'MMM dd, yyyy')} to {format(new Date(data.period.end), 'MMM dd, yyyy')}
                    </p>
                </CardContent>
            </Card>

            {/* KPI Summary Cards */}
            {kpis && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-emerald-200 bg-emerald-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-700">Total Credits Consumed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-emerald-900">{kpis.totalCredits.toLocaleString()}</div>
                            <p className="text-xs text-emerald-600 mt-1">
                                {kpis.totalTextractScans.toLocaleString()} Textract + {kpis.totalBase44Credits.toLocaleString()} Base44
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-blue-700">Estimated Textract Cost</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-900">${kpis.estimatedCost.toFixed(2)}</div>
                            <p className="text-xs text-blue-600 mt-1">
                                @ ${TEXTRACT_COST_PER_SCAN} per scan × {kpis.totalTextractScans.toLocaleString()} scans
                            </p>
                        </CardContent>
                    </Card>

                    {kpis.creditsRemaining !== null && (
                        <Card className="border-purple-200 bg-purple-50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-purple-700">Base44 Credits Remaining</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-purple-900">{kpis.creditsRemaining.toLocaleString()}</div>
                                <p className="text-xs text-purple-600 mt-1">
                                    of {BASE44_MONTHLY_ALLOWANCE.toLocaleString()} monthly allowance
                                </p>
                                <div className="mt-2 w-full bg-purple-200 rounded-full h-2">
                                    <div
                                        className="bg-purple-600 h-2 rounded-full"
                                        style={{ width: `${Math.min(100, ((BASE44_MONTHLY_ALLOWANCE - kpis.creditsRemaining) / BASE44_MONTHLY_ALLOWANCE) * 100)}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-orange-200 bg-orange-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-orange-700">Average Daily Usage</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-orange-900">{kpis.avgDailyCredits.toFixed(1)}</div>
                            <p className="text-xs text-orange-600 mt-1">
                                credits/day (~${kpis.avgDailyCost.toFixed(3)}/day)
                            </p>
                            <p className="text-xs text-orange-500 mt-1">
                                Over {kpis.daysInPeriod} days
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Monthly Trend Chart */}
            {monthlyTrendData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-teal-600" />
                            Credit Consumption Trend
                        </CardTitle>
                        <CardDescription>Month-by-month breakdown of credit usage</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={monthlyTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" />
                                <Tooltip formatter={(value, name) => {
                                    if (name === 'Est. Cost ($)') return `$${value.toFixed(2)}`;
                                    return value.toLocaleString();
                                }} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="textract_scans" stackId="a" fill="#3b82f6" name="Textract Scans" />
                                <Bar yAxisId="left" dataKey="base44_credits" stackId="a" fill="#10b981" name="Base44 Credits" />
                                <Line yAxisId="right" type="monotone" dataKey="estimated_cost" stroke="#f59e0b" name="Est. Cost ($)" strokeWidth={2} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Top Consumers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Event Type */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            Top Event Types
                        </CardTitle>
                        <CardDescription>Credit consumption by integration type</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={eventTypeChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {eventTypeChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => value.toLocaleString()} />
                                <Legend align="right" verticalAlign="middle" layout="vertical" />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* By User */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-rose-600" />
                            Top Users
                        </CardTitle>
                        <CardDescription>Highest credit consumers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {topUsersData.map((user, idx) => (
                                <div key={user.email} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-700">#{idx + 1}</span>
                                        <span className="text-sm text-slate-600 truncate max-w-xs">{user.email}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-slate-900">{user.credits.toLocaleString()}</div>
                                        <div className="text-xs text-slate-500">{user.textract_scans.toLocaleString()} scans</div>
                                    </div>
                                </div>
                            ))}
                            {topUsersData.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-4">No user activity recorded for this period.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Activity Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Detailed User Activity</CardTitle>
                    <CardDescription>
                        Per-user breakdown of credit consumption for the selected period
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="w-full whitespace-nowrap">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-bold min-w-[200px]">User Email</TableHead>
                                    {data.eventTypes.map(type => (
                                        <TableHead key={type} className="text-center">{type.replace(/_/g, ' ')}</TableHead>
                                    ))}
                                    <TableHead className="text-right font-bold">Total Credits</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(data.report)
                                    .filter(([, userData]) => userData.totals.credits > 0)
                                    .sort(([, a], [, b]) => b.totals.credits - a.totals.credits)
                                    .map(([email, userData]) => (
                                        <TableRow key={email}>
                                            <TableCell className="font-medium">{email}</TableCell>
                                            {data.eventTypes.map(type => (
                                                <TableCell key={type} className="text-center">{userData[type] || 0}</TableCell>
                                            ))}
                                            <TableCell className="text-right font-semibold">{userData.totals.credits}</TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="bg-slate-50">
                                    <TableHead>Total by Activity</TableHead>
                                    {data.eventTypes.map(type => (
                                        <TableHead key={type} className="text-center">{totals[type] || 0}</TableHead>
                                    ))}
                                    <TableHead className="text-right font-extrabold text-lg">{totals.totalCredits || 0}</TableHead>
                                </TableRow>
                            </TableFooter>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                    <Alert className="mt-4 border-slate-200 bg-slate-50">
                        <AlertTriangle className="h-4 w-4 text-slate-600" />
                        <AlertDescription className="text-slate-700">
                            <strong>Note:</strong> This dashboard tracks explicitly logged integration events. Textract costs shown are estimates based on ${TEXTRACT_COST_PER_SCAN} per scan (excluding any free tier allowances you may have).
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
};

export default function OperationalInsights() {
    return (
        <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-slate-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Settings className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Operational Insights</h1>
                            <p className="text-slate-600">Technical cost drivers and computational details for administrators</p>
                        </div>
                    </div>

                    <Alert className="border-orange-200 bg-orange-50">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                            <strong>Admin Only:</strong> This page contains technical operational details for cost management, development planning, and system understanding.
                        </AlertDescription>
                    </Alert>
                </motion.div>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 max-w-3xl">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="cost-drivers">Cost Drivers</TabsTrigger>
                        <TabsTrigger value="monitoring">KPI Dashboard</TabsTrigger>
                        <TabsTrigger value="tools">Admin Tools</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6 mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    Purpose & Scope
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-700 mb-4">
                                    This page serves as a technical reference for understanding the computational and financial cost drivers
                                    within GroceryIntel. It details when external services (LLMs, OCR, APIs) are invoked and how they
                                    consume resources (e.g., Base44 integration credits, external API charges).
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">Administrators</Badge>
                                    <Badge variant="outline">Developers</Badge>
                                    <Badge variant="outline">Product Managers</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ConceptCard
                                title="Base44 Integration Credits (High-Cost)"
                                description="Primary credit allowance for Base44-provided integrations and backend functions"
                                icon={Zap}
                                items={[
                                    "10,000 credit yearly allowance included in plan",
                                    "Consumed by InvokeLLM calls (OCR, AI list generation)",
                                    "Consumed by backend function calls (nutrition lookups, data exports)",
                                    "Overage fees apply when allowance exceeded",
                                    "All backend operations effectively draw from this pool"
                                ]}
                            />

                            <ConceptCard
                                title="Client-Side Analytics (Credit-Free)"
                                description="High-value computational work done in user's browser"
                                icon={Brain}
                                items={[
                                    "All inflation tracking, volatility analysis, and trends",
                                    "Dashboard insights and smart alerts",
                                    "All chart and table generation",
                                    "Price comparison and budget analysis",
                                    "Core value proposition with ZERO recurring costs",
                                    "Highly profitable and scalable"
                                ]}
                            />

                            <ConceptCard
                                title="Premium Plus Revenue Model"
                                description="Credit-heavy features offset by separate monetization"
                                icon={Star}
                                items={[
                                    "Detailed nutrition insights (calories, macros, trends)",
                                    "API-driven data fetching (Calorie Ninjas)",
                                    "£1.99-£3.99/month add-on pricing",
                                    "Users who need nutrition data cover the credit costs",
                                    "Protects core margins from high-cost features"
                                ]}
                            />

                            <ConceptCard
                                title="Future Credit Considerations"
                                description="Potential high-cost features to monitor"
                                icon={CloudCog}
                                items={[
                                    "AI-powered spending commentary (InvokeLLM calls)",
                                    "Data export functionality (backend processing)",
                                    "Advanced scenario modeling (potential LLM usage)",
                                    "All designed as Premium or Premium Plus features"
                                ]}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="cost-drivers" className="space-y-6 mt-6">
                        <Alert className="border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                                <strong>Critical Insight:</strong> Detailed nutrition analysis is now the highest credit consumer in the app - potentially 5-10x more expensive per user action than receipt scanning. This is why it's been moved to Premium Plus.
                            </AlertDescription>
                        </Alert>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <CostDriverCard
                                title="🔥 Premium Plus: Nutrition Data Lookup"
                                activity="Fetching detailed nutrition facts (calories, protein, macros) for receipt items via Calorie Ninjas API"
                                costDriver="calorieNinjasNutrition.js backend function (batches of 5 items per call)"
                                costImpact="⚠️ HIGHEST: 1 Integration Credit per 5-item batch. A 25-item receipt = 5 credits. Can exceed OCR costs by 5-10x."
                                icon={Brain}
                                color="red"
                                additionalNotes="Now exclusive to Premium Plus users (£1.99-£3.99/month add-on). Credit consumption logged in monitoring tab. This feature alone can consume 50-100+ credits per power user per month."
                            />

                            <CostDriverCard
                                title="Receipt Scanning & OCR"
                                activity="Uploading receipt images, extracting structured data (items, prices, dates, store info)"
                                costDriver="InvokeLLM integration call (sends image + prompt to LLM like GPT-4 Vision)"
                                costImpact="🔶 HIGH: 1 Integration Credit per scan. Cost scales linearly with scan volume."
                                icon={Database}
                                color="orange"
                                additionalNotes="Core functionality available to all tiers (Free: 5/month, Premium: 50/month). Credit consumption logged in monitoring tab."
                            />

                            <CostDriverCard
                                title="AI Shopping List Generation"
                                activity="Generating personalized shopping lists based on purchase history patterns"
                                costDriver="InvokeLLM integration call (sends purchase history + prompt to LLM)"
                                costImpact="🔶 MEDIUM: 1 Integration Credit per generation. User-initiated only."
                                icon={Zap}
                                color="yellow"
                                additionalNotes="Premium feature. Typically used 2-4 times per month by active users. Credit consumption logged in monitoring tab."
                            />

                            <CostDriverCard
                                title="Analytics: ONS Official Inflation Data"
                                activity="Fetching official UK inflation data for the 'Official Inflation Chart' comparison"
                                costDriver="onsDataFetcher.js backend function call to ONS API"
                                costImpact="💰 LOW: 1 Integration Credit per user session (cached client-side after first fetch)"
                                icon={TrendingUp}
                                color="blue"
                                additionalNotes="Only triggered when users access Analytics > Deep Dive tab and view the Official Inflation Chart. Minimal impact due to session-based caching."
                            />

                            <CostDriverCard
                                title="Household Management"
                                activity="Sending email invitations to household members"
                                costDriver="sendInvitation.js → Base44 Core.SendEmail integration"
                                costImpact="💰 LOW: 1 Integration Credit per invitation sent."
                                icon={CloudCog}
                                color="blue"
                                additionalNotes="Infrequent usage - typically 1-3 invites per household setup. Credit consumption logged in monitoring tab."
                            />

                            <CostDriverCard
                                title="🔄 Aggregated Grocery Data Processing"
                                activity="Scheduled processing of aggregated, anonymous market data for 'latest deals' insights"
                                costDriver="aggregateGroceryData.js backend function (runs every 3 days)"
                                costImpact="💰 MINIMAL: 1 Integration Credit per run (every 3 days). ~10 credits/month."
                                icon={Database}
                                color="blue"
                                additionalNotes="Processes validated receipts from all users, anonymizes and aggregates item/price/store data, maintains 10-day rolling window. Credit consumption logged in monitoring tab under 'aggregated_data_processing' event type."
                            />

                            <CostDriverCard
                                title="✅ Core Analytics (Cost-Free Zone)"
                                activity="Inflation tracking, volatility analysis, spending trends, budget insights, price alerts, category breakdowns"
                                costDriver="Client-side JavaScript calculations using already-fetched receipt data"
                                costImpact="✅ FREE: Zero recurring costs. Pure profit margin."
                                icon={TrendingUp}
                                color="green"
                                additionalNotes="This is your core value proposition and profit center. All charts, insights, and analytics run in the user's browser using data from previous scans. Infinitely scalable."
                            />

                            <CostDriverCard
                                title="Data Management & Admin Tools"
                                activity="Test data generation, account deletion, receipt recovery, data modeling"
                                costDriver="Backend functions: generateModeledData.js, deleteUserAccount.js, assignHouseholdToOldReceipts.js"
                                costImpact="💰 MINIMAL: Integration Credits for admin/troubleshooting tools only."
                                icon={Settings}
                                color="gray"
                                additionalNotes="Used for testing, account management, and data recovery. Very infrequent usage. Primarily admin-triggered."
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="monitoring" className="space-y-6 mt-6">
                        <CreditMonitoringDashboard />
                    </TabsContent>

                    <TabsContent value="tools" className="space-y-6 mt-6">
                        <HistoricalRecategorizationTool />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
