import React from 'react';
import LegalFooter from '@/components/shared/LegalFooter';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-3xl mx-auto px-4 py-8 md:px-6 md:py-12">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Privacy Policy</h1>
          <p className="text-slate-600 mt-2">Last updated: 18 December 2025</p>
        </header>

        <section className="space-y-1 text-slate-700 mb-8">
          <p><strong>Operated by:</strong> GroceryIntel Ltd</p>
          <p><strong>Company registration number:</strong> 16838153</p>
          <p><strong>ICO registration reference:</strong> ZC066318</p>
          <p className="mt-2"><strong>Registered Office:</strong><br/>128 City Road, London, EC1V 2NX, United Kingdom</p>
          <p className="mt-2"><strong>Contact:</strong> <a href="mailto:support@groceryintel.com" className="text-emerald-600 hover:underline">support@groceryintel.com</a></p>
        </section>

        <ol className="space-y-8 text-slate-800">
          <li>
            <h2 className="text-xl font-semibold mb-2">1. Overview</h2>
            <p>
              This Privacy Policy explains how GroceryIntel (“we”, “our”, or “us”) collects, uses, stores, and protects personal data when you use our application, website, and related services (the “Service”).
            </p>
            <p className="mt-2">
              GroceryIntel is currently offered as a Beta service. Features, data processing methods, and insights may evolve as we continue to improve the product.
            </p>
            <p className="mt-2">We comply with the UK General Data Protection Regulation (UK GDPR) and applicable UK data protection laws.</p>
          </li>

          <li>
            <h2 className="text-xl font-semibold mb-2">2. Information We Collect</h2>
            <p className="font-medium">We collect the following categories of data:</p>
            <div className="mt-3 space-y-4">
              <div>
                <p className="font-medium">a) Account Information</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Email address</li>
                  <li>Account status (trial, active subscription, cancelled)</li>
                  <li>Login and authentication details</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">b) Receipt and Grocery Data</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Items, prices, quantities, and store details from uploaded or scanned receipts</li>
                  <li>User-reviewed or corrected receipt data</li>
                  <li>Users are advised not to upload payment card details or unnecessary personal information</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">c) Usage Data</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Number of receipt scans and recipe imports</li>
                  <li>Feature usage and preferences</li>
                  <li>App interactions required to operate the Service</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">d) Payment Information</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Payments are processed securely by third-party providers (e.g. Stripe)</li>
                  <li>GroceryIntel does not store card or banking details</li>
                </ul>
              </div>
              <div>
                <p className="font-medium">e) Anonymous Crowd Price Data</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Store name, item name, and price</li>
                  <li>Fully anonymised and not linked to individual users</li>
                  <li>Used solely for short-term price analysis</li>
                </ul>
              </div>
            </div>
          </li>

          <li>
            <h2 className="text-xl font-semibold mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Operate receipt scanning, analytics, and budgeting features</li>
              <li>Provide insights into grocery spending, price changes, and trends</li>
              <li>Support meal planning, recipes, and nutritional summaries</li>
              <li>Manage subscriptions, trials, and payments</li>
              <li>Improve accuracy, reliability, and usability of the Service</li>
              <li>Communicate important service updates or support messages</li>
            </ul>
            <p className="mt-2 font-medium">We do not sell, rent, or trade personal data.</p>
          </li>

          <li>
            <h2 className="text-xl font-semibold mb-2">4. Beta Status and Disclaimers</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Features may change or be refined</li>
              <li>Data accuracy may improve over time as systems evolve</li>
              <li>Insights are provided for informational purposes only and are not financial advice or guarantees</li>
            </ul>
            <p className="mt-2">By using the Service, you acknowledge and accept these conditions.</p>
          </li>

          <li>
            <h2 className="text-xl font-semibold mb-2">5. Data Sharing and Processors</h2>
            <p>Your data may be processed by trusted third-party service providers, including:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li><strong>Supabase</strong> – application hosting and core functionality</li>
              <li><strong>Vercel</strong> – website hosting and deployment</li>
              <li><strong>Stripe</strong> – secure payment processing</li>
            </ul>
            <p className="mt-2">All processors operate under appropriate data protection and confidentiality agreements.</p>
          </li>

          <li>
            <h2 className="text-xl font-semibold mb-2">6. International Data Transfers</h2>
            <p>
              Some infrastructure providers (such as Supabase) currently operate servers outside the UK, including in the United States.
            </p>
            <p className="mt-2">
              Where international transfers occur, we rely on approved UK GDPR safeguards such as Standard Contractual Clauses (SCCs) or equivalent mechanisms. This section will be updated if transfer arrangements change.
            </p>
          </li>

          <li>
            <h2 className="text-xl font-semibold mb-2">7. Data Retention</h2>
            <p>We retain personal data only for as long as necessary to provide the Service and fulfil legitimate business purposes.</p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="font-medium">a) Active Accounts</p>
                <p>Identifiable user data is retained on a rolling <strong>14-month</strong> basis while an account remains active. This supports year-on-year comparisons and meaningful long-term insights.</p>
              </div>
              <div>
                <p className="font-medium">b) Inactive Accounts</p>
                <p>If an account becomes inactive, data is retained for up to <strong>6 months</strong> after the last activity. During the first 3 months, we may contact users with re-engagement or reactivation invitations. After this period, data is deleted or anonymised, unless retention is required for legal or regulatory reasons.</p>
              </div>
              <div>
                <p className="font-medium">c) Trial Users</p>
                <p>Trial users follow the same retention rules as inactive accounts. Trial data is not retained indefinitely if the account is not reactivated.</p>
              </div>
              <div>
                <p className="font-medium">d) Anonymous Crowd Price Data</p>
                <p>Retained for up to <strong>10 days</strong> on a rolling basis. Fully anonymised and cannot be linked back to individuals.</p>
              </div>
              <p className="mt-2">Users may request deletion of their data at any time.</p>
            </div>
          </li>

          <li>
            <h2 className="text-xl font-semibold mb-2">8. Security</h2>
            <p>We apply appropriate technical and organisational measures to protect personal data, including encryption, secure storage, and access controls. However, no online service can be guaranteed to be completely secure. You use the Service at your own risk.</p>
          </li>

          <li>
            <h2 className="text-xl font-semibold mb-2">9. Your Rights</h2>
            <p>Under UK GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-1">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent where applicable</li>
              <li>Object to or restrict certain processing activities</li>
            </ul>
            <p className="mt-2">You may exercise these rights via your account dashboard or by contacting <a href="mailto:support@groceryintel.com" className="text-emerald-600 hover:underline">support@groceryintel.com</a>.</p>
            <p className="mt-2">You also have the right to lodge a complaint with the Information Commissioner’s Office (ICO) in the UK.</p>
          </li>

          <li>
            <h2 className="text-xl font-semibold mb-2">10. Children’s Privacy</h2>
            <p>GroceryIntel is not intended for children under the age of 16. We do not knowingly collect personal data from children.</p>
          </li>

          <li>
            <h2 className="text-xl font-semibold mb-2">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. If material changes are made, we will notify users via email or in-app notice.</p>
          </li>

          <li>
            <h2 className="text-xl font-semibold mb-2">12. Contact</h2>
            <p>If you have any questions about this Privacy Policy or how your data is handled, please contact:</p>
            <p className="mt-2">Email: <a href="mailto:support@groceryintel.com" className="text-emerald-600 hover:underline">support@groceryintel.com</a></p>
            <p>In-app support: Available within the Service</p>
          </li>
        </ol>

        <div className="mt-12">
          <LegalFooter />
        </div>
      </div>
    </div>
  );
}