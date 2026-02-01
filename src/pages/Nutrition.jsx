
import React, { useState, useEffect, useCallback } from "react";
import { Receipt, Budget, User } from "@/entities/all";
import { motion } from "framer-motion";
import { HeartPulse, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { subDays, startOfMonth, endOfMonth, format, parseISO } from "date-fns";

import NutritionDisclaimer from "@/components/nutrition/NutritionDisclaimer";
import MacroSpendChart from "@/components/nutrition/MacroSpendChart";
import FoodQualityChart from "@/components/nutrition/FoodQualityChart";
import NutritionInsights from "@/components/nutrition/NutritionInsights";
import DrillDownModal from "@/components/nutrition/DrillDownModal";
import NutrientTrendsChart from "@/components/nutrition/NutrientTrendsChart";
import FoodQualityPriceChart from "@/components/nutrition/FoodQualityPriceChart";

const MACRO_MAP = {
  protein: { name: "Protein Focused", categories: ["meat_fish", "dairy_eggs"] },
  carbs: { name: "Carb Focused", categories: ["vegetables_fruits", "bakery", "pantry_staples"] },
  fat_sugar: { name: "Fats & Sugars", categories: ["snacks_sweets", "beverages"] },
  mixed: { name: "Mixed / Other", categories: ["frozen_foods", "other"] }
};

const FOOD_QUALITY_MAP = {
  whole_foods: { name: "Whole Foods", categories: ["vegetables_fruits", "meat_fish", "dairy_eggs"] },
  starchy_foods: { name: "Starchy Foods", categories: ["bakery", "pantry_staples"] },
  processed_foods: { name: "Processed Foods", categories: ["snacks_sweets", "beverages", "frozen_foods"] },
  non_food: { name: "Non-Food Items", categories: ["household_cleaning", "personal_care"] },
  other: { name: "Other", categories: ["other"] }
};

export default function NutritionPage() {
  const [receipts, setReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState('this_month');
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [drillDown, setDrillDown] = useState({ isOpen: false, title: '', items: [] });
  const [userCurrency, setUserCurrency] = useState('GBP');
  const [activeBudget, setActiveBudget] = useState(null);

  useEffect(() => {
    User.me().then((user) => {
      if (user && user.currency) setUserCurrency(user.currency);
    });
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await User.me();
      if (user && user.household_id) {
        const [receiptData, budgetData] = await Promise.all([
          Receipt.filter({ household_id: user.household_id }, "-purchase_date", 1000),
          Budget.filter({ household_id: user.household_id, is_active: true })
        ]);
        setReceipts(receiptData || []);

        if (budgetData && budgetData.length > 0) {
          setActiveBudget(budgetData[0]);
        } else {
          setActiveBudget(null);
        }
      } else {
        setReceipts([]);
        setActiveBudget(null);
      }
    } catch (error) {
      console.error("Error loading nutrition data:", error);
      setReceipts([]);
      setActiveBudget(null);
    }
    setLoading(false);
  };

  const getDateRanges = useCallback(() => {
    const ranges = {
      '30d': { label: 'Last 30 Days', from: subDays(new Date(), 30), to: new Date() },
      'all': { label: 'All Time', from: null, to: null }
    };

    if (activeBudget && activeBudget.period_start && activeBudget.period_end) {
      ranges['this_month'] = {
        label: 'This Month',
        from: parseISO(activeBudget.period_start),
        to: parseISO(activeBudget.period_end)
      };
    } else {
      ranges['this_month'] = {
        label: 'This Month',
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
      };
    }

    return ranges;
  }, [activeBudget]);

  const applyFilters = useCallback(() => {
    let tempReceipts = [...receipts];

    let range;
    if (activeRange === 'custom' && customDateRange.from && customDateRange.to) {
      range = customDateRange;
    } else if (activeRange !== 'all' && activeRange !== 'custom') {
      const allDateRanges = getDateRanges();
      range = allDateRanges[activeRange];
    }

    if (range && range.from && range.to) {
      tempReceipts = tempReceipts.filter((r) => {
        const purchaseDate = new Date(r.purchase_date);
        const fromDate = new Date(range.from);
        fromDate.setHours(0, 0, 0, 0); 
        const toDate = new Date(range.to);
        toDate.setHours(23, 59, 59, 999); 
        return purchaseDate >= fromDate && purchaseDate <= toDate;
      });
    }

    setFilteredReceipts(tempReceipts);
  }, [receipts, activeRange, customDateRange, getDateRanges]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleDateSelect = (range) => {
    setCustomDateRange(range);
    setActiveRange('custom');
  };

  const handleChartClick = (type, categoryKey) => {
    const categoryMap = type === 'macro' ? MACRO_MAP : FOOD_QUALITY_MAP;
    const selectedCategory = categoryMap[categoryKey];
    if (!selectedCategory) return;

    const targetCategories = selectedCategory.categories;
    const items = filteredReceipts.flatMap((r) => r.items || []);
    const relevantItems = items.filter((item) => targetCategories.includes(item.category));

    const aggregatedItems = relevantItems.reduce((acc, item) => {
      const name = item.name.trim();
      if (!acc[name]) {
        acc[name] = { name, count: 0, totalCost: 0 };
      }
      acc[name].count += 1;
      acc[name].totalCost += item.total_price || 0;
      return acc;
    }, {});

    const sortedItems = Object.values(aggregatedItems).sort((a, b) => b.totalCost - a.totalCost);

    setDrillDown({
      isOpen: true,
      title: `Item Drill-Down: ${selectedCategory.name}`,
      items: sortedItems
    });
  };

  const dateRanges = getDateRanges();

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-red-50 via-white to-rose-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Nutrition Overview</h1>
              <p className="text-slate-600">Analyze the nutritional profile of your spending</p>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-wrap items-center gap-2 mb-6 p-2 bg-red-100/50 rounded-lg">
          {Object.entries(dateRanges).map(([key, { label }]) =>
            <Button key={key} onClick={() => setActiveRange(key)} variant={activeRange === key ? "default" : "ghost"} size="sm" className={activeRange === key ? 'bg-white text-red-700 shadow-md' : 'text-slate-600'}>
              {label}
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={activeRange === 'custom' ? "default" : "ghost"} size="sm" className={activeRange === 'custom' ? 'bg-white text-red-700 shadow-md' : 'text-slate-600'}>
                <Calendar className="mr-2 h-4 w-4" />
                {customDateRange.from && customDateRange.to ? `${format(customDateRange.from, "LLL dd")} - ${format(customDateRange.to, "LLL dd")}` : "Custom"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarUI mode="range" selected={customDateRange} onSelect={handleDateSelect} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        <NutritionDisclaimer />

        <NutritionInsights receipts={filteredReceipts} loading={loading} />
        
        <div className="space-y-8 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <MacroSpendChart receipts={filteredReceipts} loading={loading} onCategoryClick={(key) => handleChartClick('macro', key)} />
            <FoodQualityChart receipts={filteredReceipts} loading={loading} onCategoryClick={(key) => handleChartClick('quality', key)} />
          </div>
          
          <NutrientTrendsChart receipts={receipts} loading={loading} />
          
          <FoodQualityPriceChart receipts={filteredReceipts} loading={loading} />
        </div>
      </div>

      <DrillDownModal
        isOpen={drillDown.isOpen}
        onClose={() => setDrillDown({ isOpen: false, title: '', items: [] })}
        title={drillDown.title}
        items={drillDown.items}
        currency={userCurrency} />

    </div>);

}
