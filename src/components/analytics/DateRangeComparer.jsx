import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, getDaysInMonth } from 'date-fns';

import KeyMetrics from './KeyMetrics';
import SpendingTrendChart from './SpendingTrendChart';
import CategoryBreakdownChart from './CategoryBreakdownChart';
import SupermarketSpendChart from './SupermarketSpendChart';
import TopItemsTable from './TopItemsTable';

const MONTHS = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' }
];

const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

const quickPresets = [
    { label: "This Month", range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
    { label: "Last Month", range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
    { label: "Last 3 Months", range: { from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) } },
    { label: "This Year", range: { from: startOfYear(new Date()), to: endOfYear(new Date()) } },
];

const DateSelector = ({ date, onDateChange, label }) => {
    const currentDate = date || new Date();
    const day = currentDate.getDate();
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    
    const daysInMonth = getDaysInMonth(new Date(year, month));
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleChange = (type, value) => {
        const newDate = new Date(currentDate);
        if (type === 'day') newDate.setDate(parseInt(value));
        if (type === 'month') newDate.setMonth(parseInt(value));
        if (type === 'year') newDate.setFullYear(parseInt(value));
        onDateChange(newDate);
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <div className="grid grid-cols-3 gap-2">
                <Select value={day.toString()} onValueChange={(val) => handleChange('day', val)}>
                    <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                        {days.map(d => (
                            <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                <Select value={month.toString()} onValueChange={(val) => handleChange('month', val)}>
                    <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                        {MONTHS.map(m => (
                            <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                <Select value={year.toString()} onValueChange={(val) => handleChange('year', val)}>
                    <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {YEARS.map(y => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {format(currentDate, 'EEEE, MMMM do, yyyy')}
            </div>
        </div>
    );
};

const filterReceiptsByPeriod = (receipts, period) => {
    if (!period || !period.from || !period.to || !receipts) return [];
    
    try {
        return receipts.filter(r => {
            if (!r.purchase_date) return false;
            const purchaseDate = new Date(r.purchase_date);
            if (isNaN(purchaseDate.getTime())) return false;
            const fromDate = period.from instanceof Date ? period.from : new Date(period.from);
            const toDate = period.to instanceof Date ? period.to : new Date(period.to);
            if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return false;
            return purchaseDate >= fromDate && purchaseDate <= toDate;
        });
    } catch (error) {
        console.error('Error filtering receipts by period:', error);
        return [];
    }
};

export default function DateRangeComparer({ receipts, currency = 'GBP', activeBudget }) {
    const [periodA, setPeriodA] = useState(() => {
        if (activeBudget && activeBudget.period_start && activeBudget.period_end) {
            return {
                from: new Date(activeBudget.period_start),
                to: new Date(activeBudget.period_end)
            };
        }
        return {
            from: startOfMonth(new Date()),
            to: endOfMonth(new Date())
        };
    });
    const [periodB, setPeriodB] = useState({
        from: startOfMonth(subMonths(new Date(), 1)),
        to: endOfMonth(subMonths(new Date(), 1)),
    });
    const [showComparison, setShowComparison] = useState(false);

    const receiptsA = filterReceiptsByPeriod(receipts, periodA);
    const receiptsB = showComparison ? filterReceiptsByPeriod(receipts, periodB) : null;

    const applyPreset = (preset) => {
        setPeriodA(preset.range);
    };

    const isUsingBudgetPeriod = activeBudget && 
        periodA.from.getTime() === new Date(activeBudget.period_start).getTime() && 
        periodA.to.getTime() === new Date(activeBudget.period_end).getTime();

    const useBudgetPeriod = () => {
        if (activeBudget) {
            setPeriodA({
                from: new Date(activeBudget.period_start),
                to: new Date(activeBudget.period_end)
            });
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-base sm:text-lg">
                            <Calendar className="w-5 h-5 text-emerald-600" />
                            Period Selection
                        </span>
                        {activeBudget && !isUsingBudgetPeriod && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={useBudgetPeriod}
                                className="text-xs sm:text-sm w-full sm:w-auto"
                            >
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                Use Budget Period
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-6">
                    {/* Quick Presets */}
                    <div>
                        <h4 className="text-sm font-medium text-slate-700 mb-3">Quick Periods</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {quickPresets.map(preset => (
                                <Button 
                                    key={preset.label} 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => applyPreset(preset)}
                                    className="text-xs"
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Date Selection */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Period A */}
                        <div className="space-y-4 p-4 bg-emerald-50 rounded-lg">
                            <h4 className="font-semibold text-emerald-800 flex items-center gap-2">
                                Period A (Primary)
                            </h4>
                            <DateSelector 
                                date={periodA.from} 
                                onDateChange={(date) => setPeriodA({...periodA, from: date})}
                                label="Start Date"
                            />
                            <DateSelector 
                                date={periodA.to} 
                                onDateChange={(date) => setPeriodA({...periodA, to: date})}
                                label="End Date"
                            />
                        </div>

                        {/* Period B */}
                        <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                            <h4 className="font-semibold text-purple-800 flex items-center gap-2">
                                Period B (Comparison)
                            </h4>
                            <DateSelector 
                                date={periodB.from} 
                                onDateChange={(date) => setPeriodB({...periodB, from: date})}
                                label="Start Date"
                            />
                            <DateSelector 
                                date={periodB.to} 
                                onDateChange={(date) => setPeriodB({...periodB, to: date})}
                                label="End Date"
                            />
                        </div>
                    </div>

                    {/* Summary and Compare Button */}
                    <div className="flex flex-col md:flex-row items-center gap-4 pt-4 border-t">
                        <div className="text-sm text-slate-600 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                                <span className="font-medium">Period A:</span>
                                {periodA.from && periodA.to && (
                                    <span>{format(periodA.from, 'MMM d')} - {format(periodA.to, 'MMM d, yyyy')}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                                <span className="font-medium">Period B:</span>
                                {periodB.from && periodB.to && (
                                    <span>{format(periodB.from, 'MMM d')} - {format(periodB.to, 'MMM d, yyyy')}</span>
                                )}
                            </div>
                        </div>
                        <Button onClick={() => setShowComparison(true)} className="bg-emerald-600 hover:bg-emerald-700 w-full md:w-auto">
                            Compare Periods
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Comparison Results */}
            {showComparison && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                        <KeyMetrics receiptsA={receiptsA} receiptsB={receiptsB} loading={false} className="xl:col-span-2" />
                        
                        <CategoryBreakdownChart receiptsA={receiptsA} receiptsB={receiptsB} loading={false} />
                        <SupermarketSpendChart receiptsA={receiptsA} receiptsB={receiptsB} loading={false} />
                        
                        <SpendingTrendChart receiptsA={receiptsA} receiptsB={receiptsB} loading={false} className="xl:col-span-2" />
                        
                        <div className="xl:col-span-2">
                            <TopItemsTable 
                                receipts={receiptsA} 
                                loading={false} 
                                title={`Top Items - Period A (${format(periodA.from, 'MMM d')} - ${format(periodA.to, 'MMM d')})`}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}