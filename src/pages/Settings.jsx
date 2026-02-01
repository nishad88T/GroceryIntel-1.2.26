import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { CURRENCY_SYMBOLS } from '../components/utils/currency';
import {
    CreditCard,
    DollarSign,
    LogOut,
    User as UserIcon,
    Palette,
    Zap,
    HeartPulse,
    ShieldCheck,
    Star,
    Save,
    Trash2,
    Bell,
    Settings,
    Sparkles,
    Percent
} from 'lucide-react';
import MobileAppInstructions from '../components/settings/MobileAppInstructions';
import DataRecoverySection from '@/components/settings/DataRecoverySection';
import { useUserFeatures } from '@/components/shared/FeatureGuard';
import SubscriptionManager from '../components/settings/SubscriptionManager';
import NotificationManager from '../components/pwa/NotificationManager';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { base44 } from "@/api/base44Client";


export default function SettingsPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState('GBP');
    const [weekStartsOn, setWeekStartsOn] = useState(1); // Default to Monday (1)
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const features = useUserFeatures();


    useEffect(() => {
        const fetchUser = async () => {
            try {
                const currentUser = await base44.auth.me();
                setUser(currentUser);
                setCurrency(currentUser.currency || 'GBP');
                setWeekStartsOn(currentUser.week_starts_on ?? 1); // Set from user data, default to Monday
            } catch (error) {
                console.error("Failed to fetch user:", error);
                toast.error("Could not load your settings. Please refresh the page.");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await base44.auth.updateMe({ 
                currency,
                week_starts_on: weekStartsOn
            });
            toast.success("Settings saved successfully!");
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast.error("Failed to save settings. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleLogout = async () => {
        try {
            await base44.auth.logout();
            window.location.reload();
        } catch(error) {
            toast.error("Logout failed. Please try again.");
        }
    }
    
    const loadUserData = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
            setCurrency(currentUser.currency || 'GBP');
            setWeekStartsOn(currentUser.week_starts_on ?? 1);
        } catch (error) {
            console.error("Failed to refresh user:", error);
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            const response = await base44.functions.invoke('deleteUserAccount');
            if (response.data && response.data.message) {
                toast.success(response.data.message);
                setTimeout(async () => {
                    await base44.auth.logout();
                    window.location.href = '/';
                }, 2000);
            }
        } catch (error) {
            console.error("Account deletion failed:", error);
            toast.error(error.response?.data?.error || "Failed to delete account. Please try again or contact support.");
            setIsDeleting(false);
        }
    };

    if (loading) {
        return <div className="p-8">Loading settings...</div>;
    }

    return (
        <div className="p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <UserIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Settings</h1>
                        <p className="text-slate-600">Manage your account and preferences.</p>
                    </div>
                </div>

                {/* Profile Settings */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserIcon className="w-5 h-5 text-slate-600" />
                            My Profile
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="block text-sm font-medium text-slate-700">Full Name</Label>
                            <Input value={user?.full_name || ''} disabled className="mt-1 bg-slate-100" />
                        </div>
                        <div>
                            <Label className="block text-sm font-medium text-slate-700">Email</Label>
                            <Input value={user?.email || ''} disabled className="mt-1 bg-slate-100" />
                        </div>
                            <div>
                            <Label className="block text-sm font-medium text-slate-700">Preferred Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger className="w-full mt-1">
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
                                        <SelectItem key={code} value={code}>{symbol} - {code}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="block text-sm font-medium text-slate-700">Week Starts On</Label>
                            <Select value={weekStartsOn.toString()} onValueChange={(v) => setWeekStartsOn(parseInt(v))}>
                                <SelectTrigger className="w-full mt-1">
                                    <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Sunday</SelectItem>
                                    <SelectItem value="1">Monday</SelectItem>
                                    <SelectItem value="2">Tuesday</SelectItem>
                                    <SelectItem value="3">Wednesday</SelectItem>
                                    <SelectItem value="4">Thursday</SelectItem>
                                    <SelectItem value="5">Friday</SelectItem>
                                    <SelectItem value="6">Saturday</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500 mt-1">
                                This affects your meal planning calendar and weekly views
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? "Saving..." : "Save Preferences"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Beta Discount Banner */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 shadow-xl border-2 border-orange-400"
                >
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
                    
                    <div className="relative p-6">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                                <Percent className="w-8 h-8 text-white" />
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-2xl font-bold text-white">🎉 Beta Launch Offer</h3>
                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
                                        Limited Time
                                    </span>
                                </div>
                                
                                <p className="text-white/90 text-lg mb-4 leading-relaxed">
                                    Get <span className="font-bold text-white text-xl">50% off</span> your first year of any subscription plan! 
                                    Help us perfect GroceryIntel™ and save big.
                                </p>
                                
                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 mb-4 border border-white/20">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="flex-1">
                                            <Label className="text-white/80 text-xs font-medium mb-1 block">Promotion Code</Label>
                                            <code className="text-white font-mono text-lg font-bold tracking-wide">GI-BETA50</code>
                                        </div>
                                        <Button
                                            onClick={() => {
                                                navigator.clipboard.writeText('GI-BETA50');
                                                toast.success('Promo code copied to clipboard!');
                                            }}
                                            className="bg-white text-orange-600 hover:bg-orange-50 font-semibold shadow-lg"
                                        >
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Copy Code
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-4 text-sm text-white/80">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                        <span>Valid until March 31, 2026</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                        <span>Limited to 500 redemptions</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                        <span>One per customer</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Subscription Management */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-emerald-600" />
                            Subscription Management
                        </CardTitle>
                        <CardDescription>Manage your GroceryIntel™ subscription and billing</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SubscriptionManager user={user} onSubscriptionChange={loadUserData} />
                    </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-purple-600" />
                            Notifications
                        </CardTitle>
                        <CardDescription>Manage how GroceryIntel™ keeps you informed</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <NotificationManager />
                    </CardContent>
                </Card>

                {/* Mobile App Instructions */}
                <MobileAppInstructions />
                
                {/* Data Recovery Section - Admin Only */}
                {user?.role === 'admin' && <DataRecoverySection />}

                {/* Account Information - Only show if user is admin */}
                {user?.role === 'admin' && (
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-indigo-600" />
                                Account Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <Label className="text-xs text-slate-600">User ID</Label>
                                <p className="text-sm font-mono text-slate-800">{user.id}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <Label className="text-xs text-slate-600">Household ID</Label>
                                <p className="text-sm font-mono text-slate-800">{user.household_id || 'Not assigned'}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Danger Zone */}
                <Card className="border-red-200 bg-red-50 shadow-lg backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-red-700 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription className="text-red-600">
                            Irreversible actions that will permanently affect your account and data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-white rounded-lg border border-red-200">
                            <h4 className="font-semibold text-slate-900 mb-2">Delete My Account</h4>
                            <p className="text-sm text-slate-700 mb-4">
                                Permanently delete your GroceryIntel account and all associated data. This action cannot be undone.
                            </p>
                            <ul className="text-sm text-slate-600 space-y-1 mb-4 ml-4 list-disc">
                                <li>All receipts and purchase history will be permanently deleted</li>
                                <li>All budgets and financial tracking data will be removed</li>
                                <li>All analytics and insights will be lost</li>
                                <li>Your account will be immediately logged out</li>
                                <li>This action is required by UK GDPR and cannot be reversed</li>
                            </ul>

                            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                                <AlertDialogTrigger asChild>
                                    <Button 
                                        variant="destructive" 
                                        disabled={isDeleting}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        {isDeleting ? "Deleting Account..." : "Delete My Account"}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-red-700">Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription className="space-y-3">
                                            <p className="font-semibold text-slate-900">
                                                This will permanently delete your account and remove all your data from our servers.
                                            </p>
                                            <p className="text-slate-700">
                                                This action cannot be undone. All your receipts, budgets, analytics, and insights will be permanently lost.
                                            </p>
                                            <p className="text-slate-700">
                                                If you're experiencing issues, please consider contacting support at{' '}
                                                <a href="mailto:support@groceryintel.com" className="text-red-600 hover:underline font-medium">
                                                    support@groceryintel.com
                                                </a>
                                                {' '}before deleting your account.
                                            </p>
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => {
                                                setShowDeleteDialog(false);
                                                handleDeleteAccount();
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white"
                                            disabled={isDeleting}
                                        >
                                            {isDeleting ? "Deleting..." : "Yes, Delete My Account"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>

                {/* Logout Button */}
                <div className="text-center mt-8">
                    <Button variant="ghost" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </div>
        </div>
    );
}