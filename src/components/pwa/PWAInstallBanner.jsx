import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Download, Share, Plus, Smartphone } from "lucide-react";

export default function PWAInstallBanner() {
    const [showBanner, setShowBanner] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed (standalone mode)
        const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone === true;
        setIsStandalone(standalone);

        if (standalone) {
            return; // Don't show banner if already installed
        }

        // Detect iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(iOS);

        // Check visit count for iOS prompt
        const visitCount = parseInt(localStorage.getItem('pwa_visit_count') || '0', 10);
        localStorage.setItem('pwa_visit_count', (visitCount + 1).toString());

        // Check if user dismissed the banner
        const dismissed = localStorage.getItem('pwa_banner_dismissed');
        const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
        const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

        // Show banner for iOS after 2 visits, or if dismissed more than 7 days ago
        if (iOS && (visitCount >= 2 || daysSinceDismissed > 7) && !dismissed) {
            setShowBanner(true);
        }

        // Listen for beforeinstallprompt (Chrome/Android)
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            
            // Only show if not dismissed recently
            if (!dismissed || daysSinceDismissed > 7) {
                setShowBanner(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            // Chrome/Android install
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                setShowBanner(false);
                localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
            }
            setDeferredPrompt(null);
        }
        // For iOS, the banner already shows instructions
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
    };

    if (!showBanner || isStandalone) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
            <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-xl">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Smartphone className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-slate-900">Install GroceryIntel</h3>
                                <button 
                                    onClick={handleDismiss}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            {isIOS ? (
                                <div className="mt-2 space-y-2">
                                    <p className="text-sm text-slate-600">
                                        Add to your Home Screen for the best experience + notifications!
                                    </p>
                                    <div className="bg-white/80 rounded-lg p-3 space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                                                <Share className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <span className="text-slate-700">Tap the <strong>Share</strong> button</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center">
                                                <Plus className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <span className="text-slate-700">Select <strong>Add to Home Screen</strong></span>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleDismiss}
                                        variant="ghost" 
                                        size="sm"
                                        className="w-full text-slate-500"
                                    >
                                        Maybe Later
                                    </Button>
                                </div>
                            ) : (
                                <div className="mt-2 space-y-3">
                                    <p className="text-sm text-slate-600">
                                        Get quick access from your home screen and stay on top of your grocery spending!
                                    </p>
                                    <div className="flex gap-2">
                                        <Button 
                                            onClick={handleInstallClick}
                                            size="sm"
                                            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Install App
                                        </Button>
                                        <Button 
                                            onClick={handleDismiss}
                                            variant="ghost" 
                                            size="sm"
                                        >
                                            Later
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}