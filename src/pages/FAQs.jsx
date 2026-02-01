import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import LegalFooter from '@/components/shared/LegalFooter';

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-none shadow-md bg-white/80 backdrop-blur-sm mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-6 flex justify-between items-center hover:bg-slate-50 transition-colors rounded-lg"
      >
        <h3 className="font-semibold text-slate-900 pr-4">{question}</h3>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="px-6 pb-6 text-slate-700 leading-relaxed">
              {answer}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default function FAQsPage() {
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

  const faqs = [
    {
      question: "What is GroceryIntel™?",
      answer: "GroceryIntel™ is a smart budgeting web app that helps you plan, shop, and track your grocery spending. We provide detailed insights into price changes, spending patterns, and nutritional information—empowering you to make wiser financial and food choices week after week."
    },
    {
      question: "How does GroceryIntel™ work?",
      answer: (
        <div>
          <p className="mb-3">GroceryIntel™ follows a continuous improvement cycle to help you manage your grocery spending:</p>
          <ol className="list-decimal pl-6 space-y-2 mb-3">
            <li><strong>Plan:</strong> Browse curated recipes or import your own from websites. Create meal plans for the week.</li>
            <li><strong>Shop:</strong> Generate AI-powered shopping lists with estimated costs based on your past purchases.</li>
            <li><strong>Track:</strong> Snap photos of receipts in-app, or forward receipt photos and online grocery order emails to <code className="px-1.5 py-0.5 bg-emerald-100 rounded text-sm font-mono">receipts@groceryintel.com</code> from your registered email address.</li>
            <li><strong>Analyze:</strong> Our system extracts all item details automatically in the background—no waiting. Once processing completes, review and correct any data, then instantly access analytics on spending, personal inflation, nutrition, and more.</li>
          </ol>
          <p className="text-sm text-slate-600"><strong>Important:</strong> Send one receipt per email for best results. Processing happens in the background, and you'll receive an in-app notification when your receipt is ready for review.</p>
        </div>
      )
    },
    {
      question: "How accurate is the receipt scanning?",
      answer: "Our advanced OCR technology is highly accurate. However, receipt quality can vary. We allow you to easily review and correct any scanned data to ensure your insights are always precise."
    },

    {
      question: "How do I import recipes from websites?",
      answer: (
        <div>
          <p className="mb-2">Go to <strong>Parse Recipe</strong> in the menu, paste any recipe URL from your browser, and our AI will extract ingredients, instructions, cooking times, and nutritional info automatically.</p>
          <p className="mb-2"><strong>Legal note:</strong> Imported recipes are stored privately in your account for personal use only. You're responsible for ensuring any recipe you import complies with copyright laws. GroceryIntel does not claim ownership of imported recipes and they are never made publicly visible.</p>
          <p>See our Terms of Use (Section 8) for full details on recipe usage and copyright responsibilities.</p>
        </div>
      )
    },

    {
      question: "How do budgets work?",
      answer: "You can set flexible budgets that align with your actual pay schedule (weekly, monthly, or custom). GroceryIntel™ tracks your spending against these budgets in real-time and provides alerts when you're approaching your limit."
    },
    {
      question: "What kind of insights will I get?",
      answer: "You'll see breakdowns of spending by category and store, personal inflation rates for items you buy regularly, price volatility alerts, budget projections, and nutritional summaries of your purchases. We go beyond just total spending to show you what's really driving your costs."
    },
    {
      question: "What is 'personal inflation tracking'?",
      answer: "Unlike national inflation rates, personal inflation shows how prices change for the specific items YOU buy. GroceryIntel™ tracks price movements for your regular purchases over time, helping you see which items are getting more expensive and by how much."
    },
    {
      question: "Do you track nutrition information?",
      answer: "Yes! GroceryIntel™ links your spending to nutritional data, showing you how much you spend on protein, carbs, healthy vs. processed foods, and more. This helps you balance cost with nutrition quality."
    },
    {
      question: "Do you offer a free trial?",
      answer: "Yes! New users receive a one-month free trial with 4 scans and access to all features. After your trial, both our plans are very affordable—Standard costs less than a cup of coffee! We believe in transparent pricing and delivering value from day one."
    },
    {
      question: "What are the subscription plans?",
      answer: (
        <div>
          <p className="mb-2">We offer two plans: <strong>Standard</strong> (12 scans/month, £35.99/year or £3.59/month) with full analytics and insights, and <strong>Plus</strong> (30 scans/month, £59.99/year or £5.99/month) with extra capacity. Both plans give you access to all analytics, nutrition insights, recipes, and meal planning. Visit our <a href="/pricing" className="text-emerald-600 hover:underline font-medium">Pricing page</a> for full details.</p>
        </div>
      )
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit and debit cards (Visa, Mastercard, Amex) as well as digital wallets. All payments are processed securely through Stripe."
    },
    {
      question: "What if I exceed my monthly scan limit?",
      answer: "If you reach your monthly scan limit (12 for Standard, 30 for Plus), you'll be notified. You can either wait until the next month when your limit resets, or upgrade to the Plus plan for a higher limit."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time through your account settings. If you cancel, you'll retain access until the end of your current billing period."
    },
    {
      question: "Can I use GroceryIntel™ with my family/household?",
      answer: "Yes! You can create a household and invite family members using a simple invite code. All household members share the same receipts, budgets, meal plans, and insights. The subscription is managed at the household level - when you subscribe, all household members benefit from the plan's scan allowance."
    },
    {
      question: "How does billing work for households vs individuals?",
      answer: (
        <div>
          <p className="mb-2"><strong>Individual users</strong> (not in a household): Your personal subscription tier determines your scan limits and features.</p>
          <p className="mb-2"><strong>Household members</strong>: The household's subscription tier applies to all members. When a paying member creates or joins a household, their subscription automatically applies to the entire household. Only one subscription is needed per household.</p>
          <p>If you're using GroceryIntel alone, you can subscribe individually. If you later create or join a household, your subscription seamlessly transfers to benefit everyone.</p>
        </div>
      )
    },
    {
      question: "Is my data safe and private?",
      answer: "Yes, absolutely. We prioritize your privacy and data security. We comply with UK GDPR regulations and use industry-standard encryption and security measures. We do not sell, trade, or rent your personal data. Please refer to our Privacy Policy for more details."
    },
    {
      question: "Do you have a mobile app?",
      answer: "GroceryIntel™ is a progressive web app (PWA), which means you can access it from any device's web browser. On mobile devices, you can 'Add to Home Screen' for an app-like experience without needing to download anything from app stores."
    },
    {
      question: "What if I have an issue or feedback?",
      answer: (
        <div>
          <p>We're here to help! You can contact us via email at <a href="mailto:support@groceryintel.com" className="text-emerald-600 hover:underline font-medium">support@groceryintel.com</a> or use the in-app feedback form once you're logged into the application.</p>
        </div>
      )
    },
    {
      question: "Can I use GroceryIntel™ for business expenses?",
      answer: "GroceryIntel™ is designed and engineered for personal and household grocery spending. While you could technically scan business receipts, our analytics and categorization are geared toward household food and essentials, so it might not be the best fit for detailed business expense tracking."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block p-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg mb-4">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-slate-600">
            Find answers to common questions about GroceryIntel™
          </p>
        </motion.div>

        {/* FAQ List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 mb-12"
        >
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </motion.div>

        {/* Still Have Questions CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Card className="border-none shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                Still have questions? We're here to help!
              </h2>
              <Button
                onClick={() => window.location.href = 'mailto:support@groceryintel.com'}
                size="lg"
                className="bg-white text-emerald-700 hover:bg-slate-100 shadow-lg px-8 py-6 text-lg font-semibold"
              >
                Contact Support →
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <div className="mt-16">
          <LegalFooter />
        </div>
      </div>
    </div>
  );
}