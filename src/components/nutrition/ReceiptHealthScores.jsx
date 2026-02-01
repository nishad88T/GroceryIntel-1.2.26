import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import { fetchAndProcessNutritionData } from './nutritionUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';

const HealthScoreBadge = ({ score }) => {
    let colorClass, text;
    if (score > 1.5) {
        colorClass = "bg-green-100 text-green-800";
        text = "Excellent";
    } else if (score > 0.8) {
        colorClass = "bg-blue-100 text-blue-800";
        text = "Good";
    } else if (score > 0.4) {
        colorClass = "bg-yellow-100 text-yellow-800";
        text = "Fair";
    } else {
        colorClass = "bg-red-100 text-red-800";
        text = "Needs Improvement";
    }
    return <Badge className={`${colorClass} ml-auto`}>{text}</Badge>;
};

export default function ReceiptHealthScores({ receipts, loading }) {
    const [userCurrency, setUserCurrency] = useState('GBP');
    const [scoredReceipts, setScoredReceipts] = useState([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        User.me().then(user => user && user.currency && setUserCurrency(user.currency));
    }, []);

    const processData = useCallback(async () => {
        if (!receipts || receipts.length === 0 || loading) return;
        setProcessing(true);

        try {
            const { enhancedItems } = await fetchAndProcessNutritionData(receipts);
            const receiptScores = {};

            enhancedItems.forEach(item => {
                if (!item.receipt_id || !item.hasNutrition) return;
                if (!receiptScores[item.receipt_id]) {
                    receiptScores[item.receipt_id] = { totalScore: 0, totalCost: 0, date: item.purchase_date, supermarket: item.supermarket };
                }
                receiptScores[item.receipt_id].totalScore += item.health_score * item.total_price;
                receiptScores[item.receipt_id].totalCost += item.total_price;
            });

            const finalScores = Object.entries(receiptScores)
                .map(([id, data]) => {
                    const avgScore = data.totalCost > 0 ? data.totalScore / data.totalCost : 0;
                    return { id, score: avgScore, date: data.date, supermarket: data.supermarket, totalSpend: data.totalCost };
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));
                
            setScoredReceipts(finalScores);
        } catch (error) {
            console.error('Error processing health scores:', error);
            setScoredReceipts([]);
        }
        setProcessing(false);
    }, [receipts, loading]);

    useEffect(() => {
        processData();
    }, [processData]);
    
    if (loading || processing) {
        return <Skeleton className="h-64 w-full" />;
    }

    if (scoredReceipts.length === 0) {
        return null; // Don't render if no scores available
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        Receipt Health Scores
                    </CardTitle>
                    <CardDescription>
                        A health rating for your recent shopping trips based on nutritional content.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {scoredReceipts.slice(0, 5).map(receipt => (
                            <div key={receipt.id} className="flex items-center p-3 border rounded-lg bg-slate-50/50">
                                <div>
                                    <p className="font-semibold text-slate-800">{receipt.supermarket}</p>
                                    <p className="text-xs text-slate-600">
                                        {format(parseISO(receipt.date), 'MMMM d, yyyy')} - {formatCurrency(receipt.totalSpend, userCurrency)}
                                    </p>
                                </div>
                                <HealthScoreBadge score={receipt.score} />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}