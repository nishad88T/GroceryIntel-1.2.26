import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScanLine, Edit, PiggyBank, TrendingUp, CheckCircle, BookOpen, Camera, Calendar, Shield, Smartphone, Share, ChefHat, Bell, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  {
    icon: Smartphone,
    title: "Install the App on Your Phone",
    description: "Add GroceryIntel to your home screen for instant access and a native app-like experience.",
    details: [
      "On iPhone/iPad: Open Safari, tap the Share icon (square with arrow), then 'Add to Home Screen'.",
      "On Android: Open Chrome, tap the three-dot menu, then 'Install app' or 'Add to Home Screen'.",
      "Enable notifications in Settings to get alerts when your receipts finish processing.",
      "The app icon will appear on your home screen for quick access."
    ],
    highlight: {
      icon: Bell,
      title: "Stay Updated with Notifications",
      content: "Enable notifications to know instantly when your receipts have finished processing and are ready for review."
    }
  },
  {
    icon: ScanLine,
    title: "Scan Your Receipts",
    description: "Go to the 'Scan Receipt' page to capture your grocery expenses. Our AI extracts all the details automatically.",
    details: [
      "Fit the entire receipt in the camera frame (step back for long receipts).",
      "Place the receipt flat on a dark surface and ensure good, even lighting with no shadows.",
      "Cover any sensitive information like credit card numbers or personal details with your finger or a piece of paper.",
      "Make sure all text on the receipt is clear and readable.",
      "Use the 'Camera' button for live capture or 'Upload' for existing photos.",
      "Click 'Process All Photos' when you've added all sections of the receipt."
    ],
    highlight: {
        icon: Mail,
        title: "Email Your Receipts (Low Friction)",
        content: "Forward receipt photos or online grocery order emails directly to receipts@groceryintel.com from your registered email (one receipt per email). Both physical receipt images and digital order confirmations are supported. Processing happens automatically in the background—just remember to review and validate when ready!"
    }
  },
  {
    icon: Edit,
    title: "Review and Validate",
    description: "After processing, the AI presents the extracted items for your review. This validation step is crucial for ensuring your data is perfectly accurate.",
    details: [
      "Quickly correct any item names, prices, or quantities the AI may have misread.",
      "Re-assign items to different categories if needed.",
      "Add or verify the supermarket and purchase date.",
      "Once everything looks correct, click 'Save Receipt' to add it to your permanent history."
    ]
  },
  {
    icon: PiggyBank,
    title: "Set Your Smart Budget",
    description: "Visit the 'Budget' page to create budgets that match YOUR pay schedule. This gives you realistic insight into your spending habits.",
    details: [
      "Use 'Custom Monthly' to align your budget with your payday (e.g., from the 20th to the 19th of the next month). The dashboard will track days left until your next payday.",
      "Alternatively, use 'Weekly' or standard 'Monthly' (1st to 31st) budgets.",
      "Enter your total spending limit and set optional limits for specific categories.",
      "Get smart forecasting to see if you're on track to stay within your budget."
    ],
    highlight: {
        icon: Calendar,
        title: "Budgets That Match Your Pay Schedule",
        content: "Most people aren't paid on the 1st of the month. GroceryIntel™'s 'Custom Monthly' budget lets you set a period that aligns with when you actually receive your money, giving you a far more accurate picture of your spending habits within your pay cycle."
    }
  },
  {
    icon: TrendingUp,
    title: "Analyze Your Spending",
    description: "The 'Analytics' page provides powerful charts and comparison tools to help you understand your spending habits and track personal inflation.",
    details: [
      "View spending trends over time with interactive charts.",
      "See breakdowns by category and supermarket to identify where your money goes.",
      "Enable 'Comparison Mode' to compare any two time periods (e.g., this month vs. last month).",
      "Track your personal inflation to see how prices of items you buy have changed."
    ]
  },
  {
    icon: ChefHat,
    title: "Save & Plan Recipes",
    description: "Import recipes from any website, plan your meals, and generate shopping lists automatically.",
    details: [
      "Go to 'Parse Recipe' in the menu to import recipes from any website.",
      "Simply copy the recipe URL from your browser and paste it into the Parse Recipe page.",
      "The AI will extract ingredients, instructions, cooking times, and nutritional info.",
      "Use 'Meal Plan' to schedule recipes for the week ahead.",
      "Generate a smart shopping list based on your meal plan with one tap."
    ],
    highlight: {
      icon: ChefHat,
      title: "Easy Recipe Import",
      content: "Found a recipe online? Copy the URL, go to 'Parse Recipe' in GroceryIntel, paste it, and the AI will do the rest—extracting all the details and saving it to your library!"
    }
  }
];

export default function GuidePage() {
  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block p-4 bg-gradient-to-r from-rose-500 to-rose-600 rounded-xl shadow-lg mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">How to Use GroceryIntel™</h1>
          <p className="text-slate-600 mt-2">A complete guide to smart grocery expense tracking that fits YOUR lifestyle.</p>
        </motion.div>

        <div className="space-y-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-4 p-6 bg-white/50">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-grow">
                    <CardTitle className="text-xl font-bold text-slate-900">{step.title}</CardTitle>
                    <p className="text-slate-600 mt-1">{step.description}</p>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-2">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700">{detail}</span>
                      </li>
                    ))}
                  </ul>
                  {step.highlight && (
                     <div className="mt-6 p-4 bg-emerald-50 border-l-4 border-emerald-400 rounded-r-lg">
                        <div className="flex items-start gap-3">
                            <step.highlight.icon className="w-6 h-6 text-emerald-600 mt-1"/>
                            <div>
                                <h4 className="font-bold text-emerald-900">{step.highlight.title}</h4>
                                <p className="text-sm text-emerald-800 mt-1">{step.highlight.content}</p>
                            </div>
                        </div>
                     </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Additional Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12"
        >
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-600" />
                Pro Tips for Better Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>• <strong>Install the app:</strong> Add to your home screen for quick access</p>
              <p>• <strong>Email receipts:</strong> Forward receipt photos or online grocery order emails to <code className="px-1 py-0.5 bg-emerald-100 rounded text-xs font-mono">receipts@groceryintel.com</code> from your registered email (one per email) for automatic processing</p>
              <p>• <strong>Import recipes:</strong> Copy recipe URLs and paste them in the 'Parse Recipe' page</p>
              <p>• <strong>Quick Import page:</strong> Use the Import page for fast recipe and receipt uploads</p>
              <p>• <strong>Privacy first:</strong> Always hide sensitive information (credit cards, addresses) before scanning</p>
              <p>• <strong>Good lighting:</strong> Scan receipts in bright, even lighting for best results</p>
              <p>• <strong>Flat surface:</strong> Place receipts on a flat, dark surface for best contrast</p>
              <p>• <strong>Step back:</strong> For long receipts, step back to fit the entire receipt in frame</p>
              <p>• <strong>Budget forecasting:</strong> Check your dashboard regularly to see spending predictions</p>
              <p>• <strong>Enable notifications:</strong> Turn on notifications in Settings to know when receipts are processed</p>
              <p>• <strong>Currency:</strong> Change your base currency in Settings</p>
              <p>• <strong>Need help?</strong> Contact us at <a href="mailto:support@groceryintel.com" className="text-emerald-600 hover:underline font-medium">support@groceryintel.com</a></p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}