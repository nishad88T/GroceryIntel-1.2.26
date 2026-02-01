import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallAppButton() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if app is already installed
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Listen for the beforeinstallprompt event
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallBanner(true);
        };

        // Listen for app installed event
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowInstallBanner(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setShowInstallBanner(false);
        }
        
        setDeferredPrompt(null);
    };

    // Don't show if already installed or no install prompt available
    if (isInstalled || !showInstallBanner) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-4 left-4 right-4 z-50"
            >
                <Alert className="bg-gradient-to-r from-emerald-500 to-teal-600 border-none text-white shadow-2xl">
                    <Smartphone className="w-5 h-5 text-white" />
                    <AlertDescription className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-semibold">Install GroceryTrack</p>
                            <p className="text-sm opacity-90">Add to your home screen for quick access</p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={handleInstallClick}
                                className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold"
                            >
                                <Download className="w-4 h-4 mr-1" />
                                Install
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowInstallBanner(false)}
                                className="text-white hover:bg-white/20"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            </motion.div>
        </AnimatePresence>
    );
}