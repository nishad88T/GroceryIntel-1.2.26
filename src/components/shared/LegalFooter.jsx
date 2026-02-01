import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ShoppingCart } from 'lucide-react';

export default function LegalFooter() {
  return (
    <footer className="mt-16 pt-8 border-t border-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-white" />
          </div>
          <span className="text-slate-700 font-semibold">GroceryIntel™</span>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
          <Link to={createPageUrl('TermsOfUse')} className="text-slate-600 hover:text-emerald-600 transition-colors">
            Terms of Use
          </Link>
          <Link to={createPageUrl('Privacy')} className="text-slate-600 hover:text-emerald-600 transition-colors">
            Privacy Policy
          </Link>
          <Link to={createPageUrl('CookiePolicy')} className="text-slate-600 hover:text-emerald-600 transition-colors">
            Cookie Policy
          </Link>
          <a href="mailto:support@groceryintel.com" className="text-slate-600 hover:text-emerald-600 transition-colors">
            Contact Support
          </a>
        </div>
      </div>
      
      <div className="text-center text-xs text-slate-500 mt-6">
        <p>GroceryIntel Ltd · Registered in England and Wales · Company No. 16838153</p>
        <p className="mt-2">© 2025 GroceryIntel™. All rights reserved.</p>
      </div>
    </footer>
  );
}