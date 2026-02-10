import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Check, Loader2, CreditCard, Clock } from "lucide-react";
import { appClient } from '@/api/appClient';
import { format, addMonths } from 'date-fns';

const PRICE_IDS = {
    standard_monthly: 'price_1SeM6tFuF5yflwgOfADy4HxY',
    standard_yearly: 'price_1SeM6tFuF5yflwgOq3JdTH27',
    plus_monthly: 'price_1SeM6tFuF5yflwgOQWTXbWGU',
    plus_yearly: 'price_1SeM6tFuF5yflwgOO6P5SkVT',
};

const PlanCard = ({ title, price, interval, features, isCurrentPlan, onUpgrade, loading, recommended }) => (
    <Card className={`relative ${recommended ? 'border-emerald-500 border-2' : ''}`}>
        {recommended && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-emerald-500">Recommended</Badge>
            </div>
        )}
        <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            <div className="mt-2">
                <span className="text-3xl font-bold">£{price}</span>
                <span className="text-slate-600">/{interval}</span>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <ul className="space-y-2">
                {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-slate-700">{feature}</span>
                    </li>
                ))}
            </ul>
            {isCurrentPlan ? (
                <Badge variant="outline" className="w-full justify-center py-2">Current Plan</Badge>
            ) : (
                <Button 
                    onClick={onUpgrade} 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Upgrade to {title}
                </Button>
            )}
        </CardContent>
    </Card>
);

export default function SubscriptionManager({ user, onSubscriptionChange }) {
    const [loading, setLoading] = useState(false);
    const [selectedInterval, setSelectedInterval] = useState('yearly');

    const handleUpgrade = async (priceId) => {
        setLoading(true);
        try {
            console.log('Creating checkout session with priceId:', priceId);
            const response = await appClient.functions.invoke('createCheckoutSession', { priceId });
            console.log('Checkout response:', response);
            
            if (response.data?.url) {
                console.log('Redirecting to:', response.data.url);
                window.location.href = response.data.url;
            } else if (response.data?.error) {
                const err = response.data.error;
                const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err) || 'Checkout failed';
                throw new Error(msg);
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
            alert(`Failed to start checkout: ${error.message}`);
            setLoading(false);
        }
    };

    const isTrialing = user?.tier === 'free' && user?.trial_end_date;
    const trialEnded = isTrialing && new Date(user.trial_end_date) < new Date();
    const currentTier = user?.tier || 'free';

    const standardFeatures = [
        '12 receipt scans per month',
        'Full spending analytics',
        'Budget tracking & projections',
        'Nutrition insights',
        'Recipe library access',
        'Meal planning tools',
        'Shopping list generator',
    ];

    const plusFeatures = [
        '30 receipt scans per month',
        'Everything in Standard, plus:',
        'Household sharing (multiple users)',
        'Advanced inflation tracking',
        'Price volatility alerts',
        'Priority support',
    ];

    return (
        <div className="space-y-6">
            {/* Current Status */}
            {isTrialing && !trialEnded && (
                <Alert className="border-emerald-200 bg-emerald-50">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    <AlertDescription className="text-emerald-900">
                        <div className="space-y-1">
                            <p className="font-semibold">Free Trial Active</p>
                            <p className="text-sm">
                                You have {user.trial_scans_left || 0} scans remaining. 
                                Trial ends on {format(new Date(user.trial_end_date), 'MMM d, yyyy')}.
                            </p>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {trialEnded && (
                <Alert className="border-orange-200 bg-orange-50">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <AlertDescription className="text-orange-900">
                        <p className="font-semibold">Your free trial has ended</p>
                        <p className="text-sm">Upgrade to continue using GroceryIntel™</p>
                    </AlertDescription>
                </Alert>
            )}

            {user?.subscription_status === 'active' && (
                <Alert className="border-emerald-200 bg-emerald-50">
                    <CreditCard className="h-5 w-5 text-emerald-600" />
                    <AlertDescription className="text-emerald-900">
                        <div className="space-y-1">
                            <p className="font-semibold">
                                {currentTier === 'standard' ? 'Standard' : 'Plus'} Plan Active
                            </p>
                            <div className="text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                                <span className="inline-flex items-center gap-2">Billing <Badge variant="secondary" className="capitalize">{user.billing_interval || 'monthly'}</Badge></span>
                                <span className="inline-flex items-center gap-2"><Badge variant="outline">{user.monthly_scan_count || 0}</Badge> scans used this month</span>
                            </div>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Billing Interval Toggle */}
            <div className="flex justify-center gap-2 p-1 bg-slate-100 rounded-lg w-fit mx-auto">
                <Button
                    variant={selectedInterval === 'yearly' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedInterval('yearly')}
                    className={selectedInterval === 'yearly' ? 'bg-emerald-600' : ''}
                >
                    Yearly <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-700">Save 17%</Badge>
                </Button>
                <Button
                    variant={selectedInterval === 'monthly' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedInterval('monthly')}
                    className={selectedInterval === 'monthly' ? 'bg-emerald-600' : ''}
                >
                    Monthly
                </Button>
            </div>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                <PlanCard
                    title="Standard"
                    price={selectedInterval === 'yearly' ? '35.99' : '3.59'}
                    interval={selectedInterval === 'yearly' ? 'year' : 'month'}
                    features={standardFeatures}
                    isCurrentPlan={currentTier === 'standard'}
                    onUpgrade={() => handleUpgrade(selectedInterval === 'yearly' ? PRICE_IDS.standard_yearly : PRICE_IDS.standard_monthly)}
                    loading={loading}
                />
                <PlanCard
                    title="Plus"
                    price={selectedInterval === 'yearly' ? '59.99' : '5.99'}
                    interval={selectedInterval === 'yearly' ? 'year' : 'month'}
                    features={plusFeatures}
                    isCurrentPlan={currentTier === 'plus'}
                    onUpgrade={() => handleUpgrade(selectedInterval === 'yearly' ? PRICE_IDS.plus_yearly : PRICE_IDS.plus_monthly)}
                    loading={loading}
                    recommended={true}
                />
            </div>

            <div className="text-center text-xs text-slate-500">
                <p>All plans include a 30-day money-back guarantee</p>
                <p className="mt-1">Securely powered by Stripe</p>
            </div>
        </div>
    );
}