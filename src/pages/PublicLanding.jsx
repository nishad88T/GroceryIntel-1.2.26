
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { appClient } from '@/api/appClient';
import {
    ShoppingCart,
    TrendingUp,
    PiggyBank,
    BarChart3,
    Bell,
    Users,
    Eye,
    DollarSign,
    Sprout,
    Camera,
    Calendar,
    Shield,
    Check,
    ChevronRight,
    Mail,
    MapPin,
    Phone,
    Zap,
    Target,
    Clock,
    Star,
    Award,
    BookOpen,
    HelpCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function PublicLanding() {
    const [activeSection, setActiveSection] = useState('home');

    useEffect(() => {
        const handleScroll = () => {
            const sections = ['home', 'features', 'pricing', 'faqs', 'about'];
            const scrollPosition = window.scrollY + 100;

            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const { offsetTop, offsetHeight } = element;
                    if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const offset = 80; // Account for fixed header
            const elementPosition = element.offsetTop - offset;
            window.scrollTo({
                top: elementPosition,
                behavior: 'smooth'
            });
        }
    };

    const handleGetStarted = () => {
        appClient.auth.redirectToLogin();
    };

    const navItems = [
        { id: 'home', label: 'Home' },
        { id: 'features', label: 'Features' },
        { id: 'pricing', label: 'Pricing' },
        { id: 'faqs', label: 'FAQs' },
        { id: 'about', label: 'About' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
            {/* Fixed Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-emerald-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection('home')}>
                            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-slate-900">GroceryIntel™</span>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollToSection(item.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        activeSection === item.id
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>

                        {/* Get Started Button */}
                        <Button
                            onClick={handleGetStarted}
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
                        >
                            Get Started
                        </Button>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-emerald-100 shadow-lg">
                <div className="grid grid-cols-5 gap-1 p-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => scrollToSection(item.id)}
                            className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-medium transition-all ${
                                activeSection === item.id
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'text-slate-600'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <main className="pt-16">
                {/* HOME SECTION */}
                <section id="home" className="min-h-screen flex items-center justify-center px-4 py-20">
                    <div className="max-w-7xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full text-emerald-700 text-sm font-medium mb-6">
                                <Sprout className="w-4 h-4" />
                                Effortless Grocery Tracking
                            </div>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                                Empowering households, one receipt at a time.
                            </h1>
                            <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                                Groceries eat up 12-15% of UK household income — yet most of us don't know where that money goes. Prices shift weekly, receipts pile up, and small overspends add up fast.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    onClick={handleGetStarted}
                                    size="lg"
                                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg text-lg px-8 py-6"
                                >
                                    Get Started →
                                </Button>
                                <Button
                                    onClick={() => scrollToSection('features')}
                                    size="lg"
                                    variant="outline"
                                    className="text-lg px-8 py-6 border-2"
                                >
                                    Learn More
                                </Button>
                            </div>

                            {/* Why Track Section */}
                            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
                                <FeatureCard
                                    icon={Eye}
                                    title="Why Track Groceries?"
                                    description="Families often overspend without realizing. Receipts pile up, but you need data — not clutter — to make smarter decisions."
                                />
                                <FeatureCard
                                    icon={TrendingUp}
                                    title="Inflation Hurts"
                                    description="When Aldi milk jumps from £1.28 to £1.48, you feel it. But tracking individual price changes by hand is next to impossible."
                                />
                                <FeatureCard
                                    icon={Target}
                                    title="Budgets That Fit Your Life"
                                    description="Most apps assume you're paid on the 1st. GroceryIntel™ lets you budget from payday to payday — because that's how real life works."
                                />
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* FEATURES SECTION */}
                <section id="features" className="min-h-screen py-20 px-4 bg-white">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                                Smart Features for Smart Shopping
                            </h2>
                            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                                Everything you need to take control of your grocery spending
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <DetailedFeatureCard
                                icon={Camera}
                                title="Scan & Track Receipts"
                                description="Just snap a photo of your receipt. Our AI reads the items, prices, and store details — no manual entry."
                                color="emerald"
                            />
                            <DetailedFeatureCard
                                icon={PiggyBank}
                                title="Custom Budget Periods"
                                description="Set budgets that match YOUR pay schedule (20th to 19th, weekly, etc.) — not just calendar months."
                                color="blue"
                            />
                            <DetailedFeatureCard
                                icon={BarChart3}
                                title="Spending Analytics"
                                description="Visualize trends over time, compare stores, and see where every penny goes with interactive charts."
                                color="purple"
                            />
                            <DetailedFeatureCard
                                icon={TrendingUp}
                                title="Personal Inflation Tracker"
                                description="Track how prices of YOUR groceries change over time — not generic inflation stats."
                                color="orange"
                            />
                            <DetailedFeatureCard
                                icon={Calendar}
                                title="AI Shopping Lists"
                                description="Generate smart shopping lists based on your purchase history and budget."
                                color="teal"
                            />
                            <DetailedFeatureCard
                                icon={Users}
                                title="Household Sharing"
                                description="Share your budget and receipts with family members. Everyone sees the same data."
                                color="indigo"
                            />
                        </div>
                    </div>
                </section>

                {/* PRICING SECTION */}
                <section id="pricing" className="min-h-screen py-20 px-4 bg-gradient-to-br from-slate-50 to-emerald-50">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                                Simple, Transparent Pricing
                            </h2>
                            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                                Choose the plan that fits your needs
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                            {/* Standard Plan */}
                            <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader className="text-center pb-8">
                                    <div className="inline-block p-3 bg-slate-100 rounded-full mb-4">
                                        <ShoppingCart className="w-8 h-8 text-slate-600" />
                                    </div>
                                    <CardTitle className="text-2xl mb-2">Standard</CardTitle>
                                    <div className="text-sm text-slate-600 mb-4">Individuals / small households</div>
                                    <div className="text-4xl font-bold text-slate-900 mb-2">
                                        £35.99<span className="text-lg font-normal text-slate-600">/year</span>
                                    </div>
                                    <p className="text-slate-600">or £3.59/month</p>
                                    <div className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold mt-2">
                                        Save 16% annually
                                    </div>
                                    <p className="text-sm text-slate-500 italic mt-2">
                                        Less than the cost of a coffee — for smarter shopping.
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-3 mb-8">
                                        <PricingFeature text="Full analytics & insights" />
                                        <PricingFeature text="Full nutrition diagnostics" />
                                        <PricingFeature text="Shopping List Generator" />
                                        <PricingFeature text="Recipes & Meal Planning" />
                                        <PricingFeature text="12 scans/month" />
                                    </ul>
                                    <p className="text-xs text-slate-500 mb-4 italic">
                                        Perfect for smaller households with less frequent shopping and more receipts.
                                    </p>
                                    <Button onClick={handleGetStarted} variant="outline" className="w-full">
                                        Get Started
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Plus Plan */}
                            <Card className="border-2 border-emerald-500 shadow-xl hover:shadow-2xl transition-shadow relative">
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                                    MOST POPULAR
                                </div>
                                <CardHeader className="text-center pb-8">
                                    <div className="inline-block p-3 bg-emerald-100 rounded-full mb-4">
                                        <Star className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <CardTitle className="text-2xl mb-2">Plus</CardTitle>
                                    <div className="text-sm text-slate-600 mb-4">Shared or growing households</div>
                                    <div className="text-4xl font-bold text-slate-900 mb-2">
                                        £59.99<span className="text-lg font-normal text-slate-600">/year</span>
                                    </div>
                                    <p className="text-slate-600">or £5.99/month</p>
                                    <div className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold mt-2">
                                        Save 17% annually
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-3 mb-8">
                                        <PricingFeature text="Full analytics & insights" highlighted />
                                        <PricingFeature text="Full nutrition diagnostics" highlighted />
                                        <PricingFeature text="Shopping List Generator" highlighted />
                                        <PricingFeature text="Recipes & Meal Planning" highlighted />
                                        <PricingFeature text="30 scans/month" highlighted />
                                        <PricingFeature text="Household sharing" highlighted />
                                    </ul>
                                    <p className="text-xs text-slate-500 mb-4 italic">
                                        Ideal for bigger households with more frequent shopping and more receipts.
                                    </p>
                                    <Button onClick={handleGetStarted} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                                        Get Started
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* FAQs SECTION */}
                <section id="faqs" className="min-h-screen py-20 px-4 bg-white">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                                Frequently Asked Questions
                            </h2>
                            <p className="text-lg text-slate-600">
                                Everything you need to know about GroceryIntel™
                            </p>
                        </div>

                        <div className="space-y-6">
                            <FAQItem
                                question="How does receipt scanning work?"
                                answer="Simply take a photo of your receipt. Our AI extracts all the items, prices, and store details automatically. You can review and edit before saving."
                            />
                            <FAQItem
                                question="Is my data secure?"
                                answer="Yes! We use bank-level encryption and follow UK GDPR standards. Your data is stored securely and never shared with third parties."
                            />
                            <FAQItem
                                question="Can I track multiple stores?"
                                answer="Absolutely! Track all your grocery shopping across different supermarkets and compare prices to find the best deals."
                            />
                            <FAQItem
                                question="What if the scan isn't perfect?"
                                answer="You can easily review and correct any items before saving. Our AI improves over time based on your corrections."
                            />
                            <FAQItem
                                question="Can I share with family members?"
                                answer="Yes, with our Plus plan! Add up to 5 household members to share budgets and receipts."
                            />
                            <FAQItem
                                question="How do custom budget periods work?"
                                answer="Unlike most apps that force monthly budgets from the 1st, we let you set budget periods that match your actual pay schedule (e.g., 20th to 19th)."
                            />
                        </div>
                    </div>
                </section>

                {/* ABOUT SECTION */}
                <section id="about" className="min-h-screen py-20 px-4 bg-gradient-to-br from-emerald-50 to-teal-50">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                                About GroceryIntel™
                            </h2>
                            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                                Built for real people, not spreadsheets
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h3>
                                <p className="text-slate-700 leading-relaxed mb-4">
                                    We believe every household deserves to understand where their money goes — especially when it comes to groceries, one of the biggest recurring expenses.
                                </p>
                                <p className="text-slate-700 leading-relaxed">
                                    GroceryIntel™ was born from frustration with generic budgeting apps that don't understand grocery shopping's unique challenges: fluctuating prices, multiple stores, and pay schedules that don't align with calendar months.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-4">Our Philosophy</h3>
                                <p className="text-slate-700 leading-relaxed mb-4">
                                    <strong>Privacy First:</strong> Your data is yours. We never sell it or share it with advertisers.
                                </p>
                                <p className="text-slate-700 leading-relaxed mb-4">
                                    <strong>Real-Life Budgeting:</strong> We design around how people actually live, not accounting textbooks.
                                </p>
                                <p className="text-slate-700 leading-relaxed">
                                    <strong>Continuous Improvement:</strong> We're constantly refining our AI and adding features based on user feedback.
                                </p>
                            </div>
                        </div>

                        {/* Why Choose Us */}
                        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
                            <h3 className="text-2xl font-bold text-slate-900 text-center mb-8">
                                Why Choose GroceryIntel™?
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="text-center">
                                    <div className="inline-block p-4 bg-emerald-100 rounded-full mb-4">
                                        <Award className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <h4 className="font-semibold text-slate-900 mb-2">Specialized Focus</h4>
                                    <p className="text-slate-600 text-sm">
                                        Unlike generic finance apps, we're laser-focused on grocery tracking
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
                                        <Zap className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <h4 className="font-semibold text-slate-900 mb-2">AI-Powered</h4>
                                    <p className="text-slate-600 text-sm">
                                        Advanced OCR and machine learning eliminate manual data entry
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="inline-block p-4 bg-purple-100 rounded-full mb-4">
                                        <Users className="w-8 h-8 text-purple-600" />
                                    </div>
                                    <h4 className="font-semibold text-slate-900 mb-2">Family-Friendly</h4>
                                    <p className="text-slate-600 text-sm">
                                        Share budgets and insights with your entire household
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* CTA Section */}
                        <div className="text-center mt-16">
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">
                                Ready to take control of your grocery spending?
                            </h3>
                            <Button
                                onClick={handleGetStarted}
                                size="lg"
                                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg text-lg px-8 py-6"
                            >
                                Get Started Today →
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-slate-900 text-white py-12 px-4">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                                        <ShoppingCart className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-xl font-bold">GroceryIntel™</span>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    Smart grocery tracking for modern households
                                </p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-4">Quick Links</h4>
                                <ul className="space-y-2 text-sm text-slate-400">
                                    <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button></li>
                                    <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Pricing</button></li>
                                    <li><button onClick={() => scrollToSection('faqs')} className="hover:text-white transition-colors">FAQs</button></li>
                                    <li><button onClick={() => scrollToSection('about')} className="hover:text-white transition-colors">About</button></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-4">Legal</h4>
                                <ul className="space-y-2 text-sm text-slate-400">
                                    <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                                    <li><a href="/terms" className="hover:text-white transition-colors">Terms of Use</a></li>
                                    <li><a href="/cookies" className="hover:text-white transition-colors">Cookie Policy</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-4">Contact</h4>
                                <ul className="space-y-2 text-sm text-slate-400">
                                    <li className="flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        <a href="mailto:support@groceryintel.com" className="hover:text-white transition-colors">
                                            support@groceryintel.com
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
                            <p>© 2025 GroceryIntel™. All rights reserved.</p>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, description }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
        >
            <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                <CardContent className="p-6 text-center">
                    <div className="inline-block p-3 bg-emerald-100 rounded-full mb-4">
                        <Icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-600 text-sm">{description}</p>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function DetailedFeatureCard({ icon: Icon, title, description, color }) {
    const colorClasses = {
        emerald: 'bg-emerald-100 text-emerald-600',
        blue: 'bg-blue-100 text-blue-600',
        purple: 'bg-purple-100 text-purple-600',
        orange: 'bg-orange-100 text-orange-600',
        teal: 'bg-teal-100 text-teal-600',
        indigo: 'bg-indigo-100 text-indigo-600',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
        >
            <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                <CardContent className="p-6">
                    <div className={`inline-block p-3 rounded-full mb-4 ${colorClasses[color]}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-600">{description}</p>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function PricingFeature({ text, highlighted }) {
    return (
        <li className="flex items-center gap-2">
            <Check className={`w-5 h-5 flex-shrink-0 ${highlighted ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className={highlighted ? 'text-slate-900 font-medium' : 'text-slate-600'}>{text}</span>
        </li>
    );
}

function FAQItem({ question, answer }) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Card className="border-none shadow-md">
            <CardContent className="p-0">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
                >
                    <span className="text-lg font-semibold text-slate-900">{question}</span>
                    <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                {isOpen && (
                    <div className="px-6 pb-6">
                        <p className="text-slate-600 leading-relaxed">{answer}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
