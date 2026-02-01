import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Receipt, Calendar, Store, Tag, AlertTriangle, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/components/utils/currency';

const categoryColors = {
    meat_fish: "border-red-500/50 bg-red-50 text-red-700",
    vegetables_fruits: "border-green-500/50 bg-green-50 text-green-700",
    dairy_eggs: "border-blue-500/50 bg-blue-50 text-blue-700",
    bakery: "border-yellow-500/50 bg-yellow-50 text-yellow-700",
    snacks_sweets: "border-pink-500/50 bg-pink-50 text-pink-700",
    beverages: "border-purple-500/50 bg-purple-50 text-purple-700",
    household_cleaning: "border-gray-500/50 bg-gray-50 text-gray-700",
    personal_care: "border-indigo-500/50 bg-indigo-50 text-indigo-700",
    frozen_foods: "border-cyan-500/50 bg-cyan-50 text-cyan-700",
    pantry_staples: "border-orange-500/50 bg-orange-50 text-orange-700",
    other: "border-slate-500/50 bg-slate-50 text-slate-700"
};

const getTopCategories = (items) => {
    const categoryCounts = items.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
    }, {});
    return Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([category]) => category);
};

const getStatusBadge = (status) => {
    switch (status) {
        case 'processing_background':
            return { text: 'Processing...', color: 'bg-blue-100 text-blue-800 animate-pulse', icon: Loader2, spin: true };
        case 'review_insights':
            return { text: 'Ready to Review', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle };
        case 'validated':
            return { text: 'Validated', color: 'bg-green-100 text-green-800', icon: CheckCircle };
        case 'failed_processing':
            return { text: 'Failed', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
        default:
            return { text: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle };
    }
};

import { toast } from 'sonner';

export default function ReceiptList({ receipts, loading, onReceiptClick, onReceiptEdit }) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {Array(6).fill(0).map((_, i) => (
                    <Card key={i} className="border-none shadow-lg bg-white/80 backdrop-blur-sm p-4">
                        <div className="flex justify-between items-start">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-6 w-1/5" />
                        </div>
                        <Skeleton className="h-4 w-1/2 mt-2" />
                        <div className="flex gap-2 mt-4">
                            <Skeleton className="h-6 w-16 rounded-full" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    if (receipts.length === 0) {
        return (
            <div className="text-center py-16 px-4">
                <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Receipts Found</h3>
                <p className="text-slate-600">Try adjusting your filters or scan a new receipt.</p>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {receipts.map((receipt, index) => {
                const purchaseDate = new Date(receipt.purchase_date);
                const isDateValid = !isNaN(purchaseDate.getTime());
                
                const displayStatus = receipt.validation_status || 'review_insights';
                const statusInfo = getStatusBadge(displayStatus);
                const StatusIcon = statusInfo.icon;

                // Check if receipt has insights
                const hasInsights = receipt.receipt_insights && 
                    (receipt.receipt_insights.summary || receipt.receipt_insights.highlights);

                return (
                    <motion.div
                        key={receipt.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        onClick={() => onReceiptClick && onReceiptClick(receipt)}
                        className="cursor-pointer"
                    >
                        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <CardContent className="p-4 md:p-6">
                                {/* Status Badge and Insights Indicator */}
                                <div className="mb-3 flex items-center gap-2">
                                    {displayStatus !== 'review_insights' && (
                                        <Badge className={`${statusInfo.color} flex items-center gap-1`}>
                                            <StatusIcon className={`w-3 h-3 ${statusInfo.spin ? 'animate-spin' : ''}`} />
                                            {statusInfo.text}
                                        </Badge>
                                    )}
                                    
                                    {/* Insights indicator for review_insights receipts */}
                                    {displayStatus === 'review_insights' && hasInsights && (
                                        <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            Insights Ready
                                        </Badge>
                                    )}
                                </div>
                                
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-base md:text-lg font-bold text-slate-900 truncate pr-2">{receipt.supermarket}</h3>
                                    <p className="font-bold text-emerald-600 text-sm md:text-base flex-shrink-0">
                                        {formatCurrency(receipt.total_amount, receipt.currency)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600 mb-3">
                                    {isDateValid ? (
                                        <>
                                            <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                                            {format(purchaseDate, "MMM d, yyyy")}
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-1 text-red-600">
                                            <AlertTriangle className="w-3 h-3 md:w-4 md:h-4" />
                                            <span>Invalid Date</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs md:text-sm font-medium text-slate-700 mb-2">
                                        {receipt.items && receipt.items.length > 0 ? 'Top Categories:' : 'Items:'}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {receipt.items && receipt.items.length > 0 ? (
                                            getTopCategories(receipt.items).map(cat => (
                                                <Badge key={cat} variant="outline" className={`text-xs ${categoryColors[cat]}`}>
                                                    {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-slate-500">No items yet</span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )
            })}
        </div>
    );
}