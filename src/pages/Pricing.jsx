import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import LegalFooter from '@/components/shared/LegalFooter';

export default function PricingPage() {
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
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Flexible Plans, Powerful Insights
          </h1>
          <p className="text-xl text-slate-700 mb-2">
            Choose the right fit for your household. Same powerful insights,
          </p>
          <p className="text-xl text-slate-700">
            just sized for your scanning needs.
          </p>
          <p className="text-slate-600 mt-4 italic">
            At GroceryIntel™, we believe everyone deserves full financial clarity over their groceries. That's why both our plans offer the <strong>exact same powerful analytics and insights</strong>. The only difference? Your monthly scan allowance and household sharing capabilities.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* Standard Tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-slate-200 hover:border-emerald-500 transition-colors relative">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-3xl">☕</div>
                  <CardTitle className="text-2xl">Standard</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Individuals / small households
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-slate-900">
                    £35.99<span className="text-lg font-normal text-slate-600">/year</span>
                  </p>
                  <p className="text-slate-600">or £3.59/month</p>
                  <div className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold">
                    Save 16% annually
                  </div>
                  <p className="text-sm text-slate-500 italic">
                    Less than the cost of a coffee — for smarter shopping.
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <p className="font-semibold text-slate-900 mb-3">What You Get:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Full analytics & insights</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Full nutrition diagnostics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Shopping List Generator</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Recipes & Meal Planning</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700"><strong>12 scans/month</strong></span>
                    </li>
                  </ul>
                  <p className="text-xs text-slate-500 mt-4 italic">
                    Perfect for smaller households with less frequent shopping trips.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Plus Tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2 border-emerald-500 shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-3xl">👨‍👩‍👧‍👦</div>
                  <CardTitle className="text-2xl">Plus</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Shared or growing households
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-slate-900">
                    £59.99<span className="text-lg font-normal text-slate-600">/year</span>
                  </p>
                  <p className="text-slate-600">or £5.99/month</p>
                  <div className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold">
                    Save 17% annually
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="font-semibold text-slate-900 mb-3">What You Get:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Full analytics & insights</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Full nutrition diagnostics</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Shopping List Generator</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Recipes & Meal Planning</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700"><strong>30 scans/month</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700"><strong>Household sharing</strong></span>
                    </li>
                  </ul>
                  <p className="text-xs text-slate-500 mt-4 italic">
                    Ideal for bigger households with more frequent shopping and more receipts.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* No Tier Bias Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center space-y-4 mb-12"
        >
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <p className="text-slate-700 text-lg leading-relaxed">
                🎯 <strong>No locked features. No confusing tiers.</strong> Just the same mission, sized for your household usage. The difference between Standard and Plus is driven by how often you shop—<strong>smaller households with less monthly receipts versus bigger households with more frequent shops and more receipts.</strong>
              </p>
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