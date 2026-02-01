import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, Info, Sparkles, Tag } from "lucide-react"; // Added Tag icon
import { formatCurrency } from "@/components/utils/currency";
import AdvancedInflationTracker from "./AdvancedInflationTracker";
import VolatilityDashboard from "./VolatilityDashboard";
import BasketInflationInsight from "./BasketInflationInsight";
import BudgetProjectionsInsight from "./BudgetProjectionsInsight";
import { Button } from "@/components/ui/button"; // Added Button component

// Static demo data - NO API CALLS
const DEMO_MONTHLY_SPENDING = [
    { month: "Jan", amount: 320 },
    { month: "Feb", amount: 285 },
    { month: "Mar", amount: 340 },
    { month: "Apr", amount: 315 },
    { month: "May", amount: 360 },
    { month: "Jun", amount: 385 }
];

// Updated Category Breakdown data structure and renamed
const DEMO_CATEGORY_SPENDING = [
    { category: "Vegetables & Fruits", value: 380, color: "#10b981" },
    { category: "Meat & Fish", value: 420, color: "#ef4444" },
    { category: "Dairy & Eggs", value: 180, color: "#3b82f6" },
    { category: "Bakery", value: 120, color: "#f59e0b" },
    { category: "Beverages", value: 145, color: "#8b5cf6" },
    { category: "Pantry Staples", value: 220, color: "#f97316" },
    { category: "Other", value: 85, color: "#64748b" }
];

// New demo data for Supermarket Spending
const DEMO_SUPERMARKET_SPENDING = [
    { store: "Tesco", amount: 650, color: "#ef4444" },
    { store: "Sainsbury's", amount: 480, color: "#f59e0b" },
    { store: "Asda", amount: 320, color: "#10b981" },
    { store: "Morrisons", amount: 200, color: "#3b82f6" },
    { store: "Lidl", amount: 150, color: "#8b5cf6" },
];

// Updated Price Trends data (removed chicken)
const DEMO_PRICE_TRENDS = [
    { month: "Jan", milk: 1.25, bread: 1.05, eggs: 2.45 },
    { month: "Feb", milk: 1.29, bread: 1.08, eggs: 2.55 },
    { month: "Mar", milk: 1.29, bread: 1.10, eggs: 2.65 },
    { month: "Apr", milk: 1.32, bread: 1.12, eggs: 2.75 },
    { month: "May", milk: 1.35, bread: 1.15, eggs: 2.85 },
    { month: "Jun", milk: 1.39, bread: 1.18, eggs: 2.95 }
];

const DEMO_TOP_ITEMS = [
    { name: "Milk (Semi-Skimmed)", frequency: 24, avgPrice: 1.32, totalSpent: 31.68 },
    { name: "Bread (White Sliced)", frequency: 22, avgPrice: 1.10, totalSpent: 24.20 },
    { name: "Eggs (Free Range)", frequency: 18, avgPrice: 2.75, totalSpent: 49.50 },
    { name: "Chicken Breast", frequency: 15, avgPrice: 4.35, totalSpent: 65.25 },
    { name: "Banana", frequency: 20, avgPrice: 0.85, totalSpent: 17.00 }
];

// Demo data for Advanced Inflation Tracker
const DEMO_INFLATION_DATA = {
    inflation: [
        {
            product: "Milk (Semi-Skimmed)",
            priceChange: 0.112,
            avgLastMonth: 1.25,
            avgThisMonth: 1.39,
            purchases: [
                { date: '2024-01-05', pricePerUnit: 1.25, store: 'Tesco', totalPrice: 1.25, quantity: 1 },
                { date: '2024-01-20', pricePerUnit: 1.29, store: 'Sainsbury\'s', totalPrice: 1.29, quantity: 1 },
                { date: '2024-02-10', pricePerUnit: 1.35, store: 'Tesco', totalPrice: 1.35, quantity: 1 },
                { date: '2024-02-25', pricePerUnit: 1.39, store: 'Asda', totalPrice: 1.39, quantity: 1 }
            ]
        },
        {
            product: "Chicken Breast",
            priceChange: 0.165,
            avgLastMonth: 3.99,
            avgThisMonth: 4.65,
            purchases: [
                { date: '2024-01-08', pricePerUnit: 3.99, store: 'Tesco', totalPrice: 7.98, quantity: 2 },
                { date: '2024-01-22', pricePerUnit: 4.15, store: 'Morrisons', totalPrice: 4.15, quantity: 1 },
                { date: '2024-02-12', pricePerUnit: 4.49, store: 'Tesco', totalPrice: 8.98, quantity: 2 },
                { date: '2024-02-28', pricePerUnit: 4.65, store: 'Sainsbury\'s', totalPrice: 4.65, quantity: 1 }
            ]
        },
        {
            product: "Eggs (Free Range)",
            priceChange: 0.204,
            avgLastMonth: 2.45,
            avgThisMonth: 2.95,
            purchases: [
                { date: '2024-01-07', pricePerUnit: 2.45, store: 'Asda', totalPrice: 2.45, quantity: 1 },
                { date: '2024-01-18', pricePerUnit: 2.55, store: 'Tesco', totalPrice: 2.55, quantity: 1 },
                { date: '2024-02-08', pricePerUnit: 2.85, store: 'Sainsbury\'s', totalPrice: 2.85, quantity: 1 },
                { date: '2024-02-22', pricePerUnit: 2.95, store: 'Morrisons', totalPrice: 2.95, quantity: 1 }
            ]
        }
    ],
    shrinkflation: [
        {
            product: "Chocolate Bar (Dairy Milk)",
            packSizeChange: -0.091,
            packSizeLastMonth: 110,
            packSizeThisMonth: 100,
            unit: 'g',
            purchases: [
                { date: '2024-01-10', packSize: 110, pricePerUnit: 1.50, store: 'Tesco', totalPrice: 1.50, quantity: 1 },
                { date: '2024-02-15', packSize: 100, pricePerUnit: 1.50, store: 'Tesco', totalPrice: 1.50, quantity: 1 }
            ]
        },
        {
            product: "Orange Juice",
            packSizeChange: -0.167,
            packSizeLastMonth: 1.2,
            packSizeThisMonth: 1.0,
            unit: 'l',
            purchases: [
                { date: '2024-01-12', packSize: 1.2, pricePerUnit: 2.20, store: 'Sainsbury\'s', totalPrice: 2.20, quantity: 1 },
                { date: '2024-02-18', packSize: 1.0, pricePerUnit: 2.20, store: 'Sainsbury\'s', totalPrice: 2.20, quantity: 1 }
            ]
        }
    ]
};

// Demo data for Volatility Dashboard
const DEMO_VOLATILITY_DATA = [
    {
        product: "Strawberries",
        minPrice: 1.99,
        maxPrice: 3.49,
        avgPrice: 2.65,
        volatility: 0.189,
        priceRange: 1.50,
        purchaseCount: 8,
        purchases: [
            { date: '2024-01-05', store: 'Tesco', totalPrice: 1.99, quantity: 1, pricePerUnit: 1.99, packSize: 400, unit: 'g' },
            { date: '2024-01-15', store: 'Sainsbury\'s', totalPrice: 3.49, quantity: 1, pricePerUnit: 3.49, packSize: 400, unit: 'g' },
            { date: '2024-01-25', store: 'Asda', totalPrice: 2.49, quantity: 1, pricePerUnit: 2.49, packSize: 400, unit: 'g' },
            { date: '2024-02-08', store: 'Tesco', totalPrice: 2.99, quantity: 1, pricePerUnit: 2.99, packSize: 400, unit: 'g' },
            { date: '2024-02-18', store: 'Morrisons', totalPrice: 2.49, quantity: 1, pricePerUnit: 2.49, packSize: 400, unit: 'g' },
            { date: '2024-02-28', store: 'Tesco', totalPrice: 3.29, quantity: 1, pricePerUnit: 3.29, packSize: 400, unit: 'g' }
        ]
    },
    {
        product: "Avocado",
        minPrice: 0.85,
        maxPrice: 1.49,
        avgPrice: 1.15,
        volatility: 0.186,
        priceRange: 0.64,
        purchaseCount: 12,
        purchases: [
            { date: '2024-01-03', store: 'Tesco', totalPrice: 0.85, quantity: 1, pricePerUnit: 0.85, packSize: 1, unit: 'each' },
            { date: '2024-01-10', store: 'Sainsbury\'s', totalPrice: 1.49, quantity: 1, pricePerUnit: 1.49, packSize: 1, unit: 'each' },
            { date: '2024-01-17', store: 'Asda', totalPrice: 0.99, quantity: 1, pricePerUnit: 0.99, packSize: 1, unit: 'each' },
            { date: '2024-01-24', pricePerUnit: 1.25, store: 'Tesco', totalPrice: 1.25, quantity: 1, packSize: 1, unit: 'each' },
            { date: '2024-02-02', store: 'Morrisons', totalPrice: 1.15, quantity: 1, pricePerUnit: 1.15, packSize: 1, unit: 'each' },
            { date: '2024-02-12', store: 'Tesco', totalPrice: 1.39, quantity: 1, pricePerUnit: 1.39, packSize: 1, unit: 'each' }
        ]
    },
    {
        product: "Salmon Fillet",
        minPrice: 4.99,
        maxPrice: 6.99,
        avgPrice: 5.85,
        volatility: 0.114,
        priceRange: 2.00,
        purchaseCount: 6,
        purchases: [
            { date: '2024-01-12', store: 'Tesco', totalPrice: 4.99, quantity: 1, pricePerUnit: 4.99, packSize: 240, unit: 'g' },
            { date: '2024-01-26', store: 'Sainsbury\'s', totalPrice: 6.99, quantity: 1, pricePerUnit: 6.99, packSize: 240, unit: 'g' },
            { date: '2024-02-09', store: 'Asda', totalPrice: 5.49, quantity: 1, pricePerUnit: 5.49, packSize: 240, unit: 'g' },
            { date: '2024-02-23', store: 'Morrisons', totalPrice: 6.49, quantity: 1, pricePerUnit: 6.49, packSize: 240, unit: 'g' }
        ]
    }
];

// Demo data for Basket Inflation Insight
const DEMO_BASKET_INFLATION = {
    value: 0.087, // 8.7% inflation
    basketSize: 12,
    currentBasketCost: 78.50,
    comparisonBasketCost: 72.20,
    itemBreakdown: [
        { name: "Milk (Semi-Skimmed)", currentAvgPrice: 1.39, comparisonAvgPrice: 1.25, inflation: 0.112, currentSpent: 5.56, quantity: 4 },
        { name: "Bread (White Sliced)", currentAvgPrice: 1.18, comparisonAvgPrice: 1.05, inflation: 0.124, currentSpent: 4.72, quantity: 4 },
        { name: "Eggs (Free Range)", currentAvgPrice: 2.95, comparisonAvgPrice: 2.45, inflation: 0.204, currentSpent: 8.85, quantity: 3 },
        { name: "Chicken Breast", currentAvgPrice: 4.65, comparisonAvgPrice: 3.99, inflation: 0.165, currentSpent: 9.30, quantity: 2 },
        { name: "Banana", currentAvgPrice: 0.89, comparisonAvgPrice: 0.85, inflation: 0.047, currentSpent: 4.45, quantity: 5 },
        { name: "Cheddar Cheese", currentAvgPrice: 2.85, comparisonAvgPrice: 2.65, inflation: 0.075, currentSpent: 8.55, quantity: 3 },
        { name: "Pasta (Dried)", currentAvgPrice: 1.15, comparisonAvgPrice: 0.99, inflation: 0.162, currentSpent: 3.45, quantity: 3 },
        { name: "Tomatoes", currentAvgPrice: 1.75, comparisonAvgPrice: 1.59, inflation: 0.101, currentSpent: 5.25, quantity: 3 },
        { name: "Potatoes", currentAvgPrice: 1.95, comparisonAvgPrice: 1.85, inflation: 0.054, currentSpent: 5.85, quantity: 3 },
        { name: "Carrots", currentAvgPrice: 0.79, comparisonAvgPrice: 0.75, inflation: 0.053, currentSpent: 2.37, quantity: 3 },
        { name: "Orange Juice", currentAvgPrice: 2.49, comparisonAvgPrice: 2.20, inflation: 0.132, currentSpent: 7.47, quantity: 3 },
        { name: "Coffee", currentAvgPrice: 4.25, comparisonAvgPrice: 3.95, inflation: 0.076, currentSpent: 12.75, quantity: 3 }
    ]
};

// Demo data for Budget Projections
const DEMO_BUDGET_PROJECTIONS = {
    nextBudgetSuggestion: 434.80,
    yearlyOverspendProjection: 192.00
};

export default function DemoInflationModel({ currency = "GBP" }) {
    const [showBreakdown, setShowBreakdown] = React.useState(false); // New state for breakdown button

    return (
        <div className="space-y-4 md:space-y-6 px-1 sm:px-0">
            <Alert className="border-purple-200 bg-purple-50">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-xs sm:text-sm text-purple-800">
                    <strong>Demo Mode:</strong> This is a sample dashboard showing what your analytics will look like with more data. 
                    All data shown is simulated for demonstration purposes.
                </AlertDescription>
            </Alert>

            {/* Advanced Analytics Components with Demo Data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <BasketInflationInsight 
                    insight={DEMO_BASKET_INFLATION} 
                    loading={false}
                    receipts={[]} // Empty since we're using demo data
                    comparisonPeriods={{ current: null, comparison: null }}
                />
                <BudgetProjectionsInsight 
                    insight={DEMO_BUDGET_PROJECTIONS} 
                    loading={false}
                />
            </div>

            <AdvancedInflationTracker 
                receipts={[]} 
                loading={false} 
                onDrillDown={() => {}} 
                className="w-full"
                comparisonPeriods={{ current: null, comparison: null }}
                demoData={DEMO_INFLATION_DATA}
            />

            <VolatilityDashboard 
                receipts={[]} 
                loading={false} 
                onDrillDown={() => {}}
                className="w-full"
                comparisonPeriods={{ current: null, comparison: null }}
                demoData={DEMO_VOLATILITY_DATA}
            />

            {/* Monthly Spending Trend */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                        Monthly Spending Trend
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                        See how your spending evolves over time
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-6">
                    <div className="w-full h-[250px] sm:h-[300px]">
                        <ResponsiveContainer>
                            <LineChart data={DEMO_MONTHLY_SPENDING}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tick={{ fontSize: 10 }} />
                                <YAxis stroke="#64748b" fontSize={10} tick={{ fontSize: 10 }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                                    formatter={(value) => formatCurrency(value, currency)}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="amount" 
                                    stroke="#10b981" 
                                    strokeWidth={2} 
                                    dot={{ fill: '#10b981', r: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Category Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base sm:text-lg">Spending by Category</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Distribution of your grocery spending
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        <div className="w-full h-[250px] sm:h-[300px]">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={DEMO_CATEGORY_SPENDING} // Updated data source
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => `${entry.category}: ${formatCurrency(entry.value, currency)}`} // Updated label key
                                        outerRadius={80} // Fixed outerRadius
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {DEMO_CATEGORY_SPENDING.map((entry, index) => ( // Updated data source
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value, currency)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Supermarket Comparison - NEW CARD */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base sm:text-lg">Spending by Supermarket</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                            Compare where you shop most
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        <div className="w-full h-[250px] sm:h-[300px]">
                            <ResponsiveContainer>
                                <BarChart data={DEMO_SUPERMARKET_SPENDING}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="store" stroke="#64748b" fontSize={10} tick={{ fontSize: 10 }} />
                                    <YAxis stroke="#64748b" fontSize={10} tick={{ fontSize: 10 }} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                                        formatter={(value) => formatCurrency(value, currency)}
                                    />
                                    <Bar dataKey="amount" fill="#10b981" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Price Trends - MODIFIED CARD with breakdown button */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-base sm:text-lg">Sample Price Trends</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Track how prices change over time
                            </CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowBreakdown(!showBreakdown)}
                            className="w-full sm:w-auto text-xs sm:text-sm"
                        >
                            <Info className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            {showBreakdown ? 'Hide' : 'View'} Breakdown
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-2 sm:p-6">
                    <div className="w-full h-[250px] sm:h-[300px]">
                        <ResponsiveContainer>
                            <LineChart data={DEMO_PRICE_TRENDS}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tick={{ fontSize: 10 }} />
                                <YAxis stroke="#64748b" fontSize={10} tick={{ fontSize: 10 }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                                    formatter={(value) => formatCurrency(value, currency)}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Line type="monotone" dataKey="milk" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Milk" />
                                <Line type="monotone" dataKey="bread" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Bread" />
                                <Line type="monotone" dataKey="eggs" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Eggs" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {showBreakdown && (
                        <div className="mt-6 space-y-3 overflow-x-auto">
                            <h4 className="font-semibold text-sm text-slate-800">Detailed Breakdown</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs sm:text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left p-2 font-semibold text-slate-700">Month</th>
                                            <th className="text-right p-2 font-semibold text-slate-700">Milk</th>
                                            <th className="text-right p-2 font-semibold text-slate-700">Bread</th>
                                            <th className="text-right p-2 font-semibold text-slate-700">Eggs</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {DEMO_PRICE_TRENDS.map((row, idx) => (
                                            <tr key={idx} className="border-b hover:bg-slate-50">
                                                <td className="p-2 text-slate-700">{row.month}</td>
                                                <td className="p-2 text-right text-slate-700">{formatCurrency(row.milk, currency)}</td>
                                                <td className="p-2 text-right text-slate-700">{formatCurrency(row.bread, currency)}</td>
                                                <td className="p-2 text-right text-slate-700">{formatCurrency(row.eggs, currency)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Top Items Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Most Purchased Items</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Your shopping patterns</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-6">
                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                        <table className="w-full min-w-[500px]">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2 text-xs sm:text-sm font-medium text-slate-600">Item</th>
                                    <th className="text-center p-2 text-xs sm:text-sm font-medium text-slate-600">Times Bought</th>
                                    <th className="text-right p-2 text-xs sm:text-sm font-medium text-slate-600">Avg Price</th>
                                    <th className="text-right p-2 text-xs sm:text-sm font-medium text-slate-600">Total Spent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {DEMO_TOP_ITEMS.map((item, idx) => (
                                    <tr key={idx} className="border-b hover:bg-slate-50">
                                        <td className="p-2 text-xs sm:text-sm">{item.name}</td>
                                        <td className="p-2 text-xs sm:text-sm text-center">
                                            <Badge variant="outline" className="text-xs">{item.frequency}x</Badge>
                                        </td>
                                        <td className="p-2 text-xs sm:text-sm text-right">{formatCurrency(item.avgPrice, currency)}</td>
                                        <td className="p-2 text-xs sm:text-sm text-right font-medium">{formatCurrency(item.totalSpent, currency)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Key Insights - NEW SECTION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-slate-600">Average Monthly Spend</p>
                                <p className="text-lg sm:text-2xl font-bold text-slate-900">{formatCurrency(425, currency)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                                <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-slate-600">Most Shopped Store</p>
                                <p className="text-lg sm:text-2xl font-bold text-slate-900">Tesco</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                                <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-slate-600">Top Category</p>
                                <p className="text-lg sm:text-2xl font-bold text-slate-900">Fresh Produce</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs sm:text-sm text-blue-800">
                    <strong>Start scanning receipts</strong> to see your real data populate these charts! 
                    The more receipts you add, the more accurate and personalized your insights become.
                </AlertDescription>
            </Alert>
        </div>
    );
}