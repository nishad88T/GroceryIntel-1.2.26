import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import {
    ShoppingCart,
    ScanLine,
    TrendingUp,
    PiggyBank,
    Calendar,
    HeartPulse,
    Users,
    ChefHat,
    Sparkles
} from 'lucide-react';
import LegalFooter from '@/components/shared/LegalFooter';

const Feature = ({ icon: Icon, title, description }) => (
    <div className="flex items-start gap-4 p-6 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
        <div className="flex-shrink-0">
            <Icon className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
            <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
        </div>
    </div>
);

export default function FeaturesPage() {
  const navigate = useNavigate();

  const handleGetStarted = async () => {
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (isAuthenticated) {
        navigate(createPageUrl('Dashboard'));
      } else {
        await base44.auth.redirectToLogin();
      }
    } catch (error) {
      console.error("Navigation failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-6xl mx-auto px-4 py-8 md:px-6 md:py-12">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block p-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Why GroceryIntel™
          </h1>
          <p className="text-xl text-slate-700">
            The complete grocery improvement cycle: plan meals, shop smarter, track spending, and improve week by week.
          </p>
        </motion.div>

        {/* What You Get - NOW FIRST */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-8">What You Get</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Planning */}
            <Feature
              icon={ChefHat}
              title="Recipes & Meal Planning"
              description="Import recipes from any website, access curated collections, plan meals, and organize your week. AI extracts ingredients, instructions, and nutritional info automatically."
            />
            <Feature
              icon={Calendar}
              title="Shopping List Generator"
              description="Auto-create smart shopping lists with estimated costs based on your past receipts."
            />
            
            {/* Shopping/Tracking */}
            <Feature
              icon={ScanLine}
              title="Effortless Receipt Scanning"
              description="Snap photos of paper receipts or forward online grocery order emails. Background processing means you upload instantly and validate later—no waiting around while shopping like other apps require."
            />
            <Feature
              icon={PiggyBank}
              title="Flexible Budget Tracking"
              description="Set budgets that align with your actual pay schedule and track spending effortlessly."
            />
            
            {/* Insights */}
            <Feature
              icon={TrendingUp}
              title="Personal Inflation Tracking"
              description="See how your basket's prices evolve over time."
            />
            <Feature
              icon={Sparkles}
              title="Smart Financial Insights"
              description="Identify rising costs, better store options, and smarter swaps."
            />
            <Feature
              icon={HeartPulse}
              title="Nutrition Meets Value"
              description="Link spending patterns with the nutritional quality of your food."
            />
            <Feature
              icon={Users}
              title="Household Sharing"
              description="Sync spending and insights across your family for complete visibility."
            />
          </div>
        </motion.div>

        {/* Why It Matters - NOW SECOND */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <Card className="border-none shadow-xl bg-emerald-50/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Why It Matters</h2>
              <p className="text-lg text-slate-700 leading-relaxed max-w-3xl mx-auto">
                Groceries make up roughly <strong>12–15% of household budgets</strong> — one of the few expenses you can truly control.
              </p>
              <p className="text-lg text-slate-700 leading-relaxed max-w-3xl mx-auto mt-4">
                Small, consistent changes (<strong>10–15% improvement</strong>) can save hundreds each year, reduce waste, and promote healthier eating habits.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Reframed Comparison - NOW THIRD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl md:text-3xl">Where Budget Apps Stop, GroceryIntel™ Continues</CardTitle>
              <p className="text-slate-600 mt-4 max-w-3xl mx-auto leading-relaxed">
                Budgeting apps are a great starting point for building financial awareness. GroceryIntel™ simply goes further — focusing on groceries, the one area families can actively control, optimise, and improve week by week.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-4 px-4 text-slate-700 font-semibold">Traditional Budgeting Apps</th>
                      <th className="text-left py-4 px-4 text-emerald-700 font-semibold">GroceryIntel™</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-4 px-4 text-slate-600">
                        Often show only total grocery spend
                      </td>
                      <td className="py-4 px-4 text-slate-800">
                        Breaks down every receipt into item-level insights and trends
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-slate-600">
                        Usually requires manual categorisation
                      </td>
                      <td className="py-4 px-4 text-slate-800">
                        Automatic, accurate receipt scanning with itemised classification
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-slate-600">
                        Uses broad or generic spending categories
                      </td>
                      <td className="py-4 px-4 text-slate-800">
                        Clear grocery-specific categories for meaningful insight
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-slate-600">
                        Limited visibility into price changes
                      </td>
                      <td className="py-4 px-4 text-slate-800">
                        Track your personal inflation and item-level price movement over time
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-slate-600">
                        Doesn't link cost with nutrition or value
                      </td>
                      <td className="py-4 px-4 text-slate-800">
                        Connects spend with nutritional impact to support smarter choices
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4 text-slate-600">
                        Helps manage a monthly budget overall
                      </td>
                      <td className="py-4 px-4 text-slate-800">
                        <strong>Adds the full grocery improvement cycle:</strong> plan meals, choose recipes, auto-create shopping lists with estimated costs, then track actual spend with receipt uploads
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-8 p-6 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-slate-700 text-center leading-relaxed">
                  <strong>In short:</strong> Traditional budgeting apps help you understand your money. GroceryIntel™ helps you <em>improve</em> it — turning everyday grocery shopping into smarter financial and lifestyle decisions.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-lg font-semibold"
          >
            Get Started Today →
          </Button>
        </motion.div>

        {/* Footer */}
        <div className="mt-16">
          <LegalFooter />
        </div>
      </div>
    </div>
  );
}