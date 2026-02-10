import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
    ShoppingCart,
    ScanLine,
    TrendingUp,
    Eye,
    DollarSign,
    Sprout,
    Camera,
    BarChart3,
    Lightbulb,
    Users,
    Check
} from "lucide-react";
import { useLocation } from 'react-router-dom';
import { appClient } from "@/api/appClient";
import { motion } from "framer-motion";
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

export default function LandingPage() {
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const refCode = params.get('ref');
        if (refCode) {
            sessionStorage.setItem('referralCode', refCode);
            console.log('Referral code found and stored:', refCode);
        }
    }, [location]);

    const handleLogin = async () => {
        try {
            await appClient.auth.redirectToLogin();
        } catch (error) {
            console.error("Login failed:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
            {/* Header */}
            <header className="p-4 md:p-6 bg-white/90 backdrop-blur-sm border-b border-emerald-100/50 sticky top-0 z-50">
                <div className="container mx-auto flex justify-between items-center">
                    <Link to={createPageUrl('/')} className="flex items-center gap-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <ShoppingCart className="w-4 h-4 md:w-6 md:h-6 text-white" />
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900">GroceryIntel™</h1>
                    </Link>
                    
                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link to={createPageUrl('Features')} className="text-slate-700 hover:text-emerald-600 font-medium transition-colors">
                            Features
                        </Link>
                        <Link to={createPageUrl('About')} className="text-slate-700 hover:text-emerald-600 font-medium transition-colors">
                            About
                        </Link>
                        <Link to={createPageUrl('Pricing')} className="text-slate-700 hover:text-emerald-600 font-medium transition-colors">
                            Pricing
                        </Link>
                        <Link to={createPageUrl('FAQs')} className="text-slate-700 hover:text-emerald-600 font-medium transition-colors">
                            FAQs
                        </Link>
                        <Button onClick={handleLogin} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
                            Get Started
                        </Button>
                    </nav>
                    
                    {/* Mobile Login Button */}
                    <Button onClick={handleLogin} className="md:hidden bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm px-4">
                        Login
                    </Button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="container mx-auto px-6 py-16 md:py-24 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                        GroceryIntel™ – Smarter Grocery Habits Made
                        <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent"> Effortless</span>
                    </h2>
                    <p className="text-xl md:text-2xl text-slate-700 font-medium mb-4">
                        Empowering households, one receipt at a time.
                    </p>
                    <p className="text-lg text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                        Groceries make up 12–15% of the average household budget — yet most families don't know where that money goes. Prices shift weekly, receipts pile up, and small overspends add up fast.
                    </p>
                    <p className="text-lg text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed">
                        GroceryIntel™ helps you take back control — not with spreadsheets, but with simple, automated insights that make smarter grocery decisions second nature.
                    </p>
                    <Button
                        onClick={handleLogin}
                        size="lg"
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-lg font-semibold"
                    >
                        Get Started →
                    </Button>
                </motion.div>
            </section>

            {/* Why Track Groceries */}
            <section className="bg-white py-16 md:py-20">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-4">
                            Why Track Groceries?
                        </h3>
                        <p className="text-xl text-center text-slate-700 mb-12">
                            Because groceries are the one expense you can actually control.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            <Feature
                                icon={Eye}
                                title="Visibility"
                                description="See exactly what drives your costs — down to the item level."
                            />
                            <Feature
                                icon={DollarSign}
                                title="Smarter Spending"
                                description="Spot patterns and opportunities to make more informed choices — no guesswork, just clarity."
                            />
                            <Feature
                                icon={Sprout}
                                title="Better Living"
                                description="Connect your grocery spend to nutrition and food quality — for smarter, more informed shopping."
                            />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* How GroceryIntel Helps */}
            <section className="py-16 md:py-20">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-6">
                            How GroceryIntel™ Helps
                        </h3>
                        <p className="text-lg text-center text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed">
                            Built by an accountant who got tired of spreadsheets, GroceryIntel™ turns everyday receipts into professional-grade insights:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            <Feature
                                icon={Camera}
                                title="Scan any grocery receipt"
                                description="Paper or digital — we handle it all."
                            />
                            <Feature
                                icon={BarChart3}
                                title="Analyse trends"
                                description="Across items, stores, and prices over time."
                            />
                            <Feature
                                icon={Lightbulb}
                                title="Act on personalized insights"
                                description="Shop smarter and save more with actionable recommendations."
                            />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* What Makes GroceryIntel Different */}
            <section className="bg-slate-50 py-16 md:py-20">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-6">
                            What Makes GroceryIntel™ Different
                        </h3>
                        <p className="text-lg text-center text-slate-700 max-w-3xl mx-auto mb-8 leading-relaxed">
                            GroceryIntel™ goes beyond budgeting apps. Instead of just telling you <strong>"You spent £400 on groceries,"</strong> it shows what's driving those costs — item by item, store by store, over time.
                        </p>
                        <div className="text-center">
                            <Link to={createPageUrl('Features')}>
                                <Button
                                    variant="outline"
                                    className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                                >
                                    Learn More →
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Plans & Pricing */}
            <section className="py-16 md:py-20">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-4">
                            Plans & Pricing
                        </h3>
                        <p className="text-xl text-center text-slate-700 mb-2">
                            Same insights. Just sized for your household.
                        </p>
                        <p className="text-center text-slate-600 mb-12 italic">
                            Standard is cheaper than the average cup of coffee in the UK.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
                            {/* Standard Tier */}
                            <Card className="border-2 border-slate-200 hover:border-emerald-500 transition-colors">
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
                                        <p className="text-3xl font-bold text-slate-900">£35.99<span className="text-lg font-normal text-slate-600">/year</span></p>
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
                                                <span className="text-slate-700">Full analytics</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                                <span className="text-slate-700">12 scans/month</span>
                                            </li>
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Plus Tier */}
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
                                        <p className="text-3xl font-bold text-slate-900">£59.99<span className="text-lg font-normal text-slate-600">/year</span></p>
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
                                                <span className="text-slate-700">Full analytics</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                                <span className="text-slate-700">30 scans/month</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                                <span className="text-slate-700">Household sharing</span>
                                            </li>
                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="text-center space-y-4">
                            <p className="text-slate-700 text-lg">
                                🎯 No locked features. No confusing tiers. Just the same mission, sized for your household.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Join the Movement */}
            <section className="bg-gradient-to-r from-emerald-500 to-teal-600 py-16 md:py-20">
                <div className="container mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
                            🚀 Join the Movement
                        </h3>
                        <p className="text-xl text-white mb-8">
                            Start tracking, learning, and saving — one receipt at a time.
                        </p>
                        <Button
                            onClick={handleLogin}
                            size="lg"
                            className="bg-white text-emerald-700 hover:bg-slate-100 shadow-lg px-8 py-6 text-lg font-semibold"
                        >
                            Get Started →
                        </Button>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <div className="bg-white py-8">
                <div className="container mx-auto px-6">
                    <LegalFooter />
                </div>
            </div>
        </div>
    );
}