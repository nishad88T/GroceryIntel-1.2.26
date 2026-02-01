import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/components/utils/currency';
import { User } from '@/entities/all';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export default function SpendingChart({ receipts }) {
    const [userCurrency, setUserCurrency] = useState('GBP');

    useEffect(() => {
        User.me().then(user => {
            if (user && user.currency) {
                setUserCurrency(user.currency);
            }
        });
    }, []);

    const categorySpending = {};
    
    if (receipts && receipts.length > 0) {
        receipts.forEach(receipt => {
            const items = receipt.items || [];
            items.forEach(item => {
                const category = item.category || 'other';
                const totalPrice = parseFloat(item.total_price) || 0;
                categorySpending[category] = (categorySpending[category] || 0) + totalPrice;
            });
        });
    }

    const data = Object.entries(categorySpending).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value
    }));

    return (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle>Category Spending Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value, userCurrency)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}