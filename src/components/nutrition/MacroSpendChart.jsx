import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';

const MACRO_MAP = {
  protein: { name: "Protein Focused", color: '#3b82f6', categories: ["meat_fish", "dairy_eggs"] },
  carbs: { name: "Carb Focused", color: '#22c55e', categories: ["vegetables_fruits", "bakery", "pantry_staples"] },
  fat_sugar: { name: "Fats & Sugars", color: '#ef4444', categories: ["snacks_sweets", "beverages"] },
  mixed: { name: "Mixed / Other", color: '#a855f7', categories: ["frozen_foods", "other"] },
};

const CustomTooltip = ({ active, payload, currency, totalSpending }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const percentage = totalSpending > 0 ? ((data.value / totalSpending) * 100).toFixed(1) : 0;
        return (
            <div className="p-3 bg-white border rounded-lg shadow-lg text-sm">
                <p className="font-bold text-slate-800 mb-1">{data.name}</p>
                <p className="text-emerald-600 font-medium">{`Spent: ${formatCurrency(data.value, currency)} (${percentage}%)`}</p>
            </div>
        );
    }
    return null;
};

export default function MacroSpendChart({ receipts, loading, onCategoryClick }) {
  const [userCurrency, setUserCurrency] = useState('GBP');

  useEffect(() => {
    User.me().then(user => {
      if (user && user.currency) setUserCurrency(user.currency);
    });
  }, []);

  const macroSpending = { protein: 0, carbs: 0, fat_sugar: 0, mixed: 0 };
  let totalSpending = 0;

  receipts.forEach(receipt => {
    receipt.items?.forEach(item => {
      totalSpending += item.total_price || 0;
      for (const macroKey in MACRO_MAP) {
        if (MACRO_MAP[macroKey].categories.includes(item.category)) {
          macroSpending[macroKey] += item.total_price || 0;
          return;
        }
      }
    });
  });

  const chartData = Object.entries(macroSpending)
    .filter(([, amount]) => amount > 0)
    .map(([key, amount]) => ({
      key,
      name: MACRO_MAP[key].name,
      value: amount,
      color: MACRO_MAP[key].color
    }));
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Spending by Nutritional Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-80 w-full cursor-pointer">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value" nameKey="name" onClick={(data) => onCategoryClick(data.key)}>
                    {chartData.map((entry) => <Cell key={`cell-${entry.key}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip currency={userCurrency} totalSpending={totalSpending} />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-500">No data available for analysis.</div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}