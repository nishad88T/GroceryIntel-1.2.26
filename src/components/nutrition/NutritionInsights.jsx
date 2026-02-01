import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Lightbulb, ThumbsUp, TrendingDown, Apple, AlertTriangle, Target } from 'lucide-react';

const MACRO_MAP = {
  protein: ["meat_fish", "dairy_eggs"],
  carbs: ["vegetables_fruits", "bakery", "pantry_staples"],
  fat_sugar: ["snacks_sweets", "beverages"],
};

const FOOD_QUALITY_MAP = {
  whole_foods: ["vegetables_fruits", "meat_fish", "dairy_eggs"],
  processed_foods: ["snacks_sweets", "beverages", "frozen_foods"],
};

const InsightCard = ({ icon: Icon, title, children, color }) => (
  <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
    <CardContent className="p-6">
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-lg mb-2">{title}</h3>
          <p className="text-slate-700">{children}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function NutritionInsights({ receipts }) {
  const macroSpending = { protein: 0, carbs: 0, fat_sugar: 0 };
  const qualitySpending = { whole_foods: 0, processed_foods: 0 };
  let totalSpend = 0;
  let fruitAndVegSpend = 0;

  receipts.forEach(receipt => {
    receipt.items?.forEach(item => {
      totalSpend += item.total_price || 0;
      if (item.category === 'vegetables_fruits') {
        fruitAndVegSpend += item.total_price || 0;
      }
      
      for (const macro in MACRO_MAP) {
        if (MACRO_MAP[macro].includes(item.category)) {
          macroSpending[macro] += item.total_price || 0;
          break;
        }
      }
      
      for (const quality in FOOD_QUALITY_MAP) {
        if (FOOD_QUALITY_MAP[quality].includes(item.category)) {
          qualitySpending[quality] += item.total_price || 0;
          break;
        }
      }
    });
  });

  if (totalSpend === 0) return null;

  const processedPercentage = (qualitySpending.processed_foods / totalSpend) * 100;
  const wholeFoodsPercentage = (qualitySpending.whole_foods / totalSpend) * 100;
  const PROCESSED_FOOD_BENCHMARK = 25; // General guideline: aim for <25% of budget on processed foods

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-6">
      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-emerald-600" />
            Nutritional Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fruitAndVegSpend > totalSpend * 0.2 ? (
            <InsightCard icon={ThumbsUp} title="Great Job on Produce!" color="bg-green-500">
              Your spending on fruits and vegetables is strong. Keep up the healthy habit!
            </InsightCard>
          ) : (
            <InsightCard icon={Apple} title="Boost Your Greens" color="bg-yellow-500">
              Consider increasing your spending on the 'Vegetables & Fruits' category for more essential nutrients.
            </InsightCard>
          )}

          {processedPercentage > PROCESSED_FOOD_BENCHMARK ? (
            <InsightCard icon={AlertTriangle} title="High Processed Food Spending" color="bg-red-500">
              {processedPercentage.toFixed(0)}% of your spending goes to processed foods. Health guidelines suggest aiming for under {PROCESSED_FOOD_BENCHMARK}% for better nutrition.
            </InsightCard>
          ) : (
            <InsightCard icon={Target} title="Balanced Food Choices" color="bg-blue-500">
              You're keeping processed food spending below {PROCESSED_FOOD_BENCHMARK}%. Well done on mindful shopping!
            </InsightCard>
          )}

          {wholeFoodsPercentage > 50 ? (
            <InsightCard icon={ThumbsUp} title="Whole Foods Champion!" color="bg-green-500">
              {wholeFoodsPercentage.toFixed(0)}% of your spending is on whole foods. Excellent nutritional choices!
            </InsightCard>
          ) : (
            <InsightCard icon={TrendingDown} title="Room for Improvement" color="bg-orange-500">
              Try increasing your whole foods purchases (fresh produce, lean proteins) for better nutritional value.
            </InsightCard>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}