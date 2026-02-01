import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { InvokeLLM } from '@/integrations/Core';
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { Lightbulb, RefreshCw, TrendingUp, AlertTriangle, Target, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InsightCard = ({ insight, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100"
  >
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
        {insight.type === 'savings' && <Target className="w-4 h-4 text-white" />}
        {insight.type === 'warning' && <AlertTriangle className="w-4 h-4 text-white" />}
        {insight.type === 'trend' && <TrendingUp className="w-4 h-4 text-white" />}
        {insight.type === 'tip' && <Zap className="w-4 h-4 text-white" />}
        {!['savings', 'warning', 'trend', 'tip'].includes(insight.type) && <Lightbulb className="w-4 h-4 text-white" />}
      </div>
      <div className="flex-1">
        <p className="text-slate-800 font-medium leading-relaxed">{insight.text}</p>
        {insight.impact && (
          <Badge variant="outline" className="mt-2 text-emerald-700 border-emerald-200">
            {insight.impact}
          </Badge>
        )}
      </div>
    </div>
  </motion.div>
);

export default function AIInsightsPanel({ receipts, budgetData }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userCurrency, setUserCurrency] = useState('GBP');
  const [lastAnalyzed, setLastAnalyzed] = useState(null);

  useEffect(() => {
    User.me().then(user => user && user.currency && setUserCurrency(user.currency));
  }, []);

  const generateInsights = useCallback(async () => {
    if (!receipts || receipts.length === 0) return;
    
    setLoading(true);
    try {
      // Prepare spending data for AI analysis
      const totalSpending = receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
      const categorySpending = receipts.reduce((acc, receipt) => {
        (receipt.items || []).forEach(item => {
          acc[item.category] = (acc[item.category] || 0) + (item.total_price || 0);
        });
        return acc;
      }, {});

      const topItems = receipts.flatMap(r => r.items || [])
        .reduce((acc, item) => {
          const key = item.canonical_name || item.name;
          acc[key] = (acc[key] || 0) + (item.total_price || 0);
          return acc;
        }, {});

      const sortedItems = Object.entries(topItems)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);

      const storeSpending = receipts.reduce((acc, receipt) => {
        acc[receipt.supermarket] = (acc[receipt.supermarket] || 0) + (receipt.total_amount || 0);
        return acc;
      }, {});

      const analysisData = {
        totalSpending: totalSpending,
        numberOfReceipts: receipts.length,
        avgReceiptValue: totalSpending / receipts.length,
        categoryBreakdown: categorySpending,
        topItems: Object.fromEntries(sortedItems),
        storeBreakdown: storeSpending,
        budget: budgetData?.amount || null,
        currency: userCurrency,
        timeRange: `${receipts.length} receipts analyzed`
      };

      const result = await InvokeLLM({
        prompt: `You are a smart grocery spending advisor. Analyze this user's grocery spending data and provide 4-6 actionable insights that help them make wiser financial decisions.

SPENDING DATA:
${JSON.stringify(analysisData, null, 2)}

GUIDELINES:
1. Focus on actionable advice, not just observations
2. Identify potential savings opportunities
3. Highlight concerning spending patterns 
4. Suggest specific behavioral changes
5. Be encouraging and supportive, not judgmental
6. Use plain English, avoid jargon
7. Include specific amounts when relevant

INSIGHT TYPES (categorize each insight):
- "savings": Opportunities to save money
- "warning": Concerning spending patterns  
- "trend": Notable spending patterns or changes
- "tip": Practical shopping advice

EXAMPLE INSIGHTS:
- "You spent £45 on snacks this month. Switching to bulk buying could save you £15."
- "Your Tesco spending is 20% higher per item than at Aldi. Consider price comparing."
- "You're buying milk 3x per week in small bottles. A weekly 2L bottle could cut costs by 30%."

Format as JSON array:`,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: { type: "string", description: "The insight text" },
                  type: { type: "string", enum: ["savings", "warning", "trend", "tip"] },
                  impact: { type: "string", description: "Expected impact (e.g. 'Save £20/month')" }
                },
                required: ["text", "type"]
              }
            }
          },
          required: ["insights"]
        }
      });

      setInsights(result.insights || []);
      setLastAnalyzed(new Date());
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      setInsights([
        { 
          text: "Unable to generate insights right now. Try refreshing or check back later.", 
          type: "warning" 
        }
      ]);
    }
    setLoading(false);
  }, [receipts, budgetData, userCurrency]);

  useEffect(() => {
    if (receipts && receipts.length > 0) {
      generateInsights();
    }
  }, [receipts, generateInsights]);

  if (!receipts || receipts.length === 0) {
    return (
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-emerald-600" />
            AI Spending Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-slate-500">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>Scan some receipts to get personalized spending insights!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-emerald-600" />
            AI Spending Insights
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateInsights}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {lastAnalyzed && (
          <p className="text-xs text-slate-500">
            Last updated: {lastAnalyzed.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} index={index} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}