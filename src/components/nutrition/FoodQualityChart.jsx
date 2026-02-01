
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';
import { Apple } from 'lucide-react';

const FOOD_QUALITY_MAP = {
  whole_foods: { name: "Whole Foods", color: '#22c55e', categories: ["vegetables_fruits", "meat_fish", "dairy_eggs"] },
  starchy_foods: { name: "Starchy Foods", color: '#f59e0b', categories: ["bakery", "pantry_staples"] },
  processed_foods: { name: "Processed Foods", color: '#ef4444', categories: ["snacks_sweets", "beverages", "frozen_foods"] },
  non_food: { name: "Non-Food Items", color: '#6b7280', categories: ["household_cleaning", "personal_care"] },
  other: { name: "Other", color: '#8b5cf6', categories: ["other"] },
};

const CustomTooltip = ({ active, payload, label, totalSpending, currency }) => {
    if (active && payload && payload.length) {
        const value = payload[0].value;
        const percentage = totalSpending > 0 ? ((value / totalSpending) * 100).toFixed(1) : 0;
        return (
            <div className="p-3 bg-white border rounded-lg shadow-lg text-sm">
                <p className="font-bold text-slate-800 mb-1">{label}</p>
                <p className="text-red-600 font-medium">{`Spent: ${formatCurrency(value, currency)} (${percentage}%)`}</p>
                <p className="text-xs text-slate-600 mt-1">
                    {label === 'Whole Foods' && 'Fresh, minimally processed foods'}
                    {label === 'Starchy Foods' && 'Grains, bread, pasta, rice'}
                    {label === 'Processed Foods' && 'Packaged snacks, sugary drinks, ready meals'}
                    {label === 'Non-Food Items' && 'Household and personal care products'}
                </p>
            </div>
        );
    }
    return null;
};

export default function FoodQualityChart({ receipts, loading, onCategoryClick }) {
  const [userCurrency, setUserCurrency] = useState('GBP');

  useEffect(() => {
    User.me().then(user => {
      if (user && user.currency) setUserCurrency(user.currency);
    });
  }, []);

  const qualitySpending = { whole_foods: 0, starchy_foods: 0, processed_foods: 0, non_food: 0, other: 0 };

  receipts.forEach(receipt => {
    receipt.items?.forEach(item => {
      for (const qualityKey in FOOD_QUALITY_MAP) {
        if (FOOD_QUALITY_MAP[qualityKey].categories.includes(item.category)) {
          qualitySpending[qualityKey] += item.total_price || 0;
          return;
        }
      }
    });
  });

  const chartData = Object.entries(qualitySpending)
    .filter(([, amount]) => amount > 0)
    .map(([key, amount]) => ({
      key,
      name: FOOD_QUALITY_MAP[key].name,
      amount,
      color: FOOD_QUALITY_MAP[key].color
    }))
    .sort((a, b) => b.amount - a.amount);
    
  const totalSpending = chartData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Apple className="w-5 h-5 text-red-600" />
            Food Quality Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 60 }} onClick={(data) => {
                    if (data && data.activePayload && onCategoryClick) {
                        onCategoryClick(data.activePayload[0].payload.key);
                    }
                }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value, userCurrency)}
                  />
                  <Tooltip
                    cursor={{fill: 'rgba(148, 163, 184, 0.1)'}}
                    content={<CustomTooltip totalSpending={totalSpending} currency={userCurrency} />}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={`cell-${entry.key}`} fill={entry.color} className="cursor-pointer" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-500">No data available for food quality analysis.</div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
