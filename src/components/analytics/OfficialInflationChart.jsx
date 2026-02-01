
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { onsDataFetcher } from '@/functions/onsDataFetcher';
import { format, parse } from 'date-fns';

// Helper to calculate personal inflation index
const calculatePersonalIndex = (receipts) => {
    if (!receipts || receipts.length < 5) return [];

    const monthlyBaskets = {};

    receipts.forEach(receipt => {
        if (!receipt.purchase_date) return;
        const monthKey = format(new Date(receipt.purchase_date), 'yyyy-MM');
        
        if (!monthlyBaskets[monthKey]) {
            monthlyBaskets[monthKey] = { items: {}, totalValue: 0, itemCount: 0 };
        }
        
        (receipt.items || []).forEach(item => {
            const canonicalName = item.canonical_name || item.name;
            const price = parseFloat(item.price_per_unit) || (parseFloat(item.total_price) / (parseInt(item.quantity) || 1));

            if (!canonicalName || !price || price <= 0) return;
            
            if (!monthlyBaskets[monthKey].items[canonicalName]) {
                monthlyBaskets[monthKey].items[canonicalName] = { total: 0, count: 0 };
            }
            monthlyBaskets[monthKey].items[canonicalName].total += price;
            monthlyBaskets[monthKey].items[canonicalName].count += 1;
        });
    });

    const commonProducts = Object.keys(monthlyBaskets).length > 1 
        ? Object.keys(monthlyBaskets[Object.keys(monthlyBaskets).sort()[0]].items)
        : [];

    const monthlyCosts = {};
    Object.keys(monthlyBaskets).forEach(month => {
        let totalCost = 0;
        let productsCounted = 0;
        commonProducts.forEach(product => {
            if (monthlyBaskets[month].items[product]) {
                const item = monthlyBaskets[month].items[product];
                totalCost += item.total / item.count; // Avg price for that product that month
                productsCounted++;
            }
        });
        if (productsCounted > 0) {
            monthlyCosts[month] = totalCost / productsCounted; // Average cost of a 'common' item
        }
    });

    const sortedMonths = Object.keys(monthlyCosts).sort();
    if (sortedMonths.length < 2) return [];

    const baseCost = monthlyCosts[sortedMonths[0]];
    return sortedMonths.map(month => ({
        date: month,
        value: (monthlyCosts[month] / baseCost) * 100 // Indexed to 100
    }));
};

export default function OfficialInflationChart({ receipts, loading: receiptsLoading }) {
    const [onsData, setOnsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const response = await onsDataFetcher();
                
                if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
                    // Re-index ONS data to start at 100 for the earliest month in their data
                    const baseValue = response.data[0].value;
                    const indexedData = response.data.map(d => ({ ...d, value: (d.value / baseValue) * 100 }));
                    // Map 'value' to 'cpi' to match the new LineChart's dataKey="cpi"
                    setOnsData(indexedData.map(d => ({ date: d.date, cpi: d.value })));
                } else if (response && response.error) {
                    setError(`${response.message || response.error}`);
                } else {
                    setError("No official inflation data available.");
                }
            } catch (err) {
                console.error("Error in ONS data fetch:", err);
                setError("Could not load official inflation data.");
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    // This useMemo and the calculatePersonalIndex helper are now unused by the new return block,
    // but are kept as per the instruction "keep existing code (imports and component logic until return statement)".
    const personalIndex = useMemo(() => calculatePersonalIndex(receipts), [receipts]);

    // The combinedData useMemo is removed as the new return block does not use combined data.

    if (loading || receiptsLoading) {
        return <Card className="xl:col-span-2"><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>;
    }
    
    if (error) {
        return (
            <Card className="xl:col-span-2">
                <CardHeader>
                    {/* Updated CardTitle consistent with new outline */}
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        Official UK Inflation (CPI)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            {error}
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }
    
    // The alert for not enough personal data (if (combinedData.length < 2)) is removed
    // as the personal index is no longer displayed by the new return block.

    return (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    Official UK Inflation (CPI)
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                    Compare your personal inflation to national data
                </CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 md:p-6">
                {onsData && onsData.length > 0 ? (
                    <div className="w-full h-[250px] sm:h-[300px]">
                        <ResponsiveContainer>
                            <LineChart data={onsData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                                <YAxis 
                                    stroke="#64748b" 
                                    fontSize={10} 
                                    tick={{ fontSize: 10 }} 
                                    domain={['dataMin - 5', 'dataMax + 5']} // Retained from original for better scaling
                                    tickFormatter={(val) => val.toFixed(0)} // Retained from original for cleaner integer ticks
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                                    formatter={(value) => `${value.toFixed(2)}%`}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                <Line 
                                    type="monotone" 
                                    dataKey="cpi" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2} 
                                    name="CPI (Annual %)" 
                                    dot={{ fill: '#3b82f6', r: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">Unable to load official inflation data.</p>
                        <p className="text-xs mt-1">Please try again later.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
