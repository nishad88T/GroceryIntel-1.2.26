import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Cookie, Settings, Shield, Mail } from 'lucide-react';
import LegalFooter from '@/components/shared/LegalFooter';

const Section = ({ icon: Icon, title, children }) => (
  <div className="mb-8">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
    </div>
    <div className="text-slate-700 leading-relaxed space-y-4">
      {children}
    </div>
  </div>
);

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <Cookie className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Cookie Policy</h1>
              <p className="text-slate-600 text-sm mt-1">Last updated: 14 October 2025</p>
            </div>
          </div>
          <div className="text-slate-600 space-y-1">
            <p><strong>Operated by:</strong> GroceryIntel Ltd</p>
            <p><strong>Contact:</strong> <a href="mailto:support@groceryintel.com" className="text-purple-600 hover:underline">support@groceryintel.com</a></p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm mb-8">
            <CardContent className="p-6 md:p-8 space-y-8">
              
              {/* What Are Cookies */}
              <Section icon={Cookie} title="What Are Cookies?">
                <p>
                  Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and improve your experience.
                </p>
              </Section>

              {/* How We Use Cookies */}
              <Section icon={Settings} title="How We Use Cookies">
                <p>
                  GroceryIntel uses only <strong>essential and functional cookies</strong> necessary for the app to operate correctly. These cookies enable:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>User authentication and session management</li>
                  <li>Secure access to your account and data</li>
                  <li>Basic functionality of the application</li>
                </ul>
                <p className="mt-4">
                  Additionally, certain cookies related to application deployment and performance are managed by our hosting provider, <strong>Vercel</strong>. These cookies help ensure the reliable delivery and optimal performance of our service.
                </p>
                <p className="mt-4">
                  <strong>We do not use tracking, advertising, or analytics cookies.</strong>
                </p>
              </Section>

              {/* Managing Cookies */}
              <Section icon={Shield} title="Managing Cookies">
                <p>
                  You can manage or disable cookies through your browser settings. However, please note that disabling essential cookies may affect the functionality of GroceryIntel and prevent you from accessing certain features.
                </p>
                <p className="mt-4">
                  For more information on managing cookies, visit your browser's help section:
                </p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Google Chrome</a></li>
                  <li><a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Mozilla Firefox</a></li>
                  <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Safari</a></li>
                  <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Microsoft Edge</a></li>
                </ul>
              </Section>

              {/* Updates to This Policy */}
              <Section icon={Cookie} title="Updates to This Policy">
                <p>
                  We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated "Last updated" date.
                </p>
              </Section>

              {/* Contact */}
              <Section icon={Mail} title="Contact Us">
                <p>
                  If you have questions about our use of cookies, please contact us at <a href="mailto:support@groceryintel.com" className="text-purple-600 hover:underline font-semibold">support@groceryintel.com</a>.
                </p>
              </Section>

            </CardContent>
          </Card>
        </motion.div>

        <LegalFooter />
      </div>
    </div>
  );
}