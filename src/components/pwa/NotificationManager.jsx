import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, Check, X } from "lucide-react";
import { appClient } from '@/api/appClient';

export default function NotificationManager({ onPermissionChange }) {
    const [permission, setPermission] = useState('default');
    const [supported, setSupported] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if notifications are supported
        const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
        setSupported(isSupported);

        if (isSupported) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if (!supported) return;

        setLoading(true);
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            
            if (result === 'granted') {
                // Register for push notifications
                await subscribeToPush();
                onPermissionChange?.(true);
            } else {
                onPermissionChange?.(false);
            }
        } catch (error) {
            console.error('Notification permission error:', error);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToPush = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Check if already subscribed
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription) {
                console.log('Already subscribed to push notifications');
                return;
            }

            // Subscribe to push notifications
            // Note: In production, you'd get this from your server
            const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY'; // Placeholder
            
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            // Send subscription to your server
            const user = await appClient.auth.me();
            if (user) {
                await appClient.auth.updateMe({
                    push_subscription: JSON.stringify(subscription)
                });
            }

            console.log('Push subscription successful');
        } catch (error) {
            console.error('Push subscription error:', error);
        }
    };

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    // Send a local notification (for testing/demo)
    const sendLocalNotification = async (title, body, options = {}) => {
        if (permission !== 'granted') return;

        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                vibrate: [200, 100, 200],
                ...options
            });
        } catch (error) {
            console.error('Local notification error:', error);
        }
    };

    if (!supported) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                    {permission === 'granted' ? (
                        <Bell className="w-5 h-5 text-emerald-600" />
                    ) : (
                        <BellOff className="w-5 h-5 text-slate-400" />
                    )}
                    <div>
                        <p className="font-medium text-slate-900">Push Notifications</p>
                        <p className="text-sm text-slate-600">
                            {permission === 'granted' 
                                ? 'Notifications are enabled' 
                                : permission === 'denied'
                                ? 'Notifications are blocked'
                                : 'Get alerts for processed receipts and insights'}
                        </p>
                    </div>
                </div>
                {permission === 'default' && (
                    <Button 
                        onClick={requestPermission}
                        disabled={loading}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {loading ? 'Enabling...' : 'Enable'}
                    </Button>
                )}
                {permission === 'granted' && (
                    <div className="flex items-center gap-1 text-emerald-600">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Enabled</span>
                    </div>
                )}
                {permission === 'denied' && (
                    <div className="flex items-center gap-1 text-red-500">
                        <X className="w-4 h-4" />
                        <span className="text-sm">Blocked</span>
                    </div>
                )}
            </div>

            {permission === 'denied' && (
                <p className="text-xs text-slate-500 px-4">
                    To enable notifications, please update your browser settings for this site.
                </p>
            )}
        </div>
    );
}

// Utility function to trigger local notifications from anywhere
export const triggerLocalNotification = async (title, body, options = {}) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return false;
    }

    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                vibrate: [200, 100, 200],
                tag: options.tag || 'groceryintel',
                ...options
            });
            return true;
        }
    } catch (error) {
        console.error('Notification error:', error);
    }
    return false;
};

// Schedule a local reminder notification
export const scheduleReminder = (title, body, delayMs) => {
    setTimeout(() => {
        triggerLocalNotification(title, body);
    }, delayMs);
};