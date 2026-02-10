import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChefHat,
  Receipt,
  Smartphone,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ImportPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking, processing, success, error, manual
  const [message, setMessage] = useState('Checking for shared content...');
  const [error, setError] = useState(null);
  const [parsedRecipe, setParsedRecipe] = useState(null);

  useEffect(() => {
    handleSharedContent();
  }, []);

  const handleSharedContent = async () => {
    // Check for shared content in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    let sharedUrl = urlParams.get('url') || urlParams.get('text');
    
    // Debug: log what we received
    console.log('Import page - Full URL:', window.location.href);
    console.log('Import page - Search params:', window.location.search);
    console.log('Import page - Detected URL:', sharedUrl);
    
    // Handle case where URL might be double-encoded or have extra characters
    if (sharedUrl) {
      try {
        // If URL starts with encoded characters, decode it
        if (sharedUrl.includes('%')) {
          sharedUrl = decodeURIComponent(sharedUrl);
        }
        // Trim any whitespace
        sharedUrl = sharedUrl.trim();
      } catch (e) {
        console.log('URL decode error:', e);
      }
    }

    // If no shared content, show manual options
    if (!sharedUrl) {
      console.log('Import page - No URL detected, showing manual options');
      setStatus('manual');
      return;
    }
    
    console.log('Import page - Processing URL:', sharedUrl);

    // Check authentication
    try {
      const currentUser = await appClient.auth.me();
      if (!currentUser) {
        // Not logged in - redirect to login, then back here with URL preserved
        appClient.auth.redirectToLogin(window.location.href);
        return;
      }
    } catch (err) {
      // Not logged in - redirect to login
      appClient.auth.redirectToLogin(window.location.href);
      return;
    }

    // We have a URL - auto-process it
    setStatus('processing');
    setMessage('Importing recipe...');

    try {
      const response = await appClient.functions.invoke('parseRecipe', {
        recipe_url: sharedUrl
      });

      if (response.data.error) {
        setStatus('error');
        setError(response.data.error);
      } else {
        setParsedRecipe(response.data.recipe);
        setStatus('success');
        
        // Auto-redirect to the recipe after a short delay
        setTimeout(() => {
          navigate(createPageUrl(`Recipes?recipe=${response.data.recipe.id}`));
        }, 2000);
      }
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Failed to import recipe. Please try again.');
    }
  };

  // Loading/checking state
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-8 text-center">
            <Loader2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-spin" />
            <p className="text-slate-600">{message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Processing state
  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-8 text-center">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <ChefHat className="w-16 h-16 text-emerald-500" />
              <Loader2 className="w-6 h-6 text-emerald-600 absolute -bottom-1 -right-1 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Importing Recipe</h2>
            <p className="text-slate-600">Extracting ingredients, instructions, and more...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === 'success' && parsedRecipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Recipe Imported!</h2>
            <p className="text-slate-600 mb-4">{parsedRecipe.title}</p>
            <p className="text-sm text-slate-500 mb-6">Redirecting to your recipe...</p>
            <Button
              onClick={() => navigate(createPageUrl(`Recipes?recipe=${parsedRecipe.id}`))}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              View Recipe Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Import Failed</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => navigate(createPageUrl('ParseRecipe'))}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Try Manual Import
              </Button>
              <Button
                onClick={() => {
                  setStatus('manual');
                  setError(null);
                }}
                variant="outline"
              >
                Back to Import Options
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Manual mode - show options and setup instructions
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-block p-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg mb-4">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Quick Import</h1>
          <p className="text-slate-600 mt-2">Import recipes or receipts into GroceryIntel™</p>
        </motion.div>

        {/* Quick Actions */}
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">What would you like to import?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => navigate(createPageUrl('ParseRecipe'))}
              className="w-full justify-start gap-3 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              <ChefHat className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Import a Recipe</div>
                <div className="text-xs opacity-80">Paste a URL from any recipe website</div>
              </div>
            </Button>
            
            <Button
              onClick={() => navigate(createPageUrl('ScanReceipt'))}
              variant="outline"
              className="w-full justify-start gap-3 h-14 border-emerald-200 hover:bg-emerald-50"
            >
              <Receipt className="w-5 h-5 text-emerald-600" />
              <div className="text-left">
                <div className="font-semibold text-slate-900">Scan a Receipt</div>
                <div className="text-xs text-slate-500">Take a photo or upload from gallery</div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* iOS Shortcut Setup */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              iOS Quick Share Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                <strong>One-time setup:</strong> Create an iOS Shortcut to share recipes directly from Safari to GroceryIntel™.
              </AlertDescription>
            </Alert>
            
            {/* Section A */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">A</span>
                Create the Shortcut
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 ml-8">
                <li>Open the <strong>Shortcuts</strong> app (pre-installed on iPhone/iPad)</li>
                <li>Tap <strong>+</strong> in the top right corner</li>
                <li>Tap <strong>Add Action</strong></li>
                <li>Search for <strong>"Get URLs from Input"</strong> and add it</li>
                <li>Tap <strong>Add Action</strong> again</li>
                <li>Search for <strong>"Open URLs"</strong> and add it</li>
              </ol>
            </div>

            {/* Section B */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">B</span>
                Build the Import URL
              </h4>
              <div className="ml-8 space-y-2 text-slate-700">
                <p>In the <strong>"Open URLs"</strong> action:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the URL text field</li>
                  <li>Type exactly: <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">https://app.groceryintel.com/Import?url=</code></li>
                  <li>Tap the <strong>variable button</strong> (magic wand icon)</li>
                  <li>Select <strong>"Shortcut Input"</strong> (or "Provided Input")</li>
                </ol>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-3">
                  <p className="text-xs text-slate-500 mb-1">The final URL should look like:</p>
                  <code className="text-xs text-slate-700 break-all">https://app.groceryintel.com/Import?url=[Shortcut Input]</code>
                </div>
              </div>
            </div>

            {/* Section C */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">C</span>
                Enable Share Sheet
              </h4>
              <div className="ml-8 space-y-2 text-slate-700">
                <p>Tap the <strong>ⓘ</strong> (info) button at the bottom:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Rename to <strong>"Add to GroceryIntel"</strong></li>
                  <li>Enable <strong>"Show in Share Sheet"</strong></li>
                  <li>Tap <strong>"Images and 18 more"</strong> → Select <strong>URLs only</strong></li>
                  <li>Disable <strong>"Run in Background"</strong></li>
                  <li>Enable <strong>"Show When Run"</strong></li>
                </ul>
                <p className="mt-2">Tap <strong>Done</strong> to save.</p>
              </div>
            </div>

            {/* How to Use */}
            <div className="pt-4 border-t border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                How to Use
              </h4>
              <p className="text-slate-600">
                When viewing a recipe in Safari, tap <strong>Share</strong> → <strong>"Add to GroceryIntel"</strong>. 
                The recipe will be automatically imported to your library!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Android Note */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-xl">🤖</span>
              Android Users
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <p>
              Android doesn't support iOS-style shortcuts. To import recipes on Android:
            </p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Copy the recipe URL from your browser</li>
              <li>Open GroceryIntel™ and go to <strong>Parse Recipe</strong></li>
              <li>Paste the URL and tap Import</li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              💡 Tip: Add GroceryIntel™ to your home screen for quick access!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}