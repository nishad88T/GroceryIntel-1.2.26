import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Copy, Check, Share2 } from 'lucide-react';
import { appClient } from '@/api/appClient';

const InviteForm = ({ householdId, householdName }) => {
    const [inviteCode, setInviteCode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [codeCopied, setCodeCopied] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    useEffect(() => {
        loadOrGenerateCode();
    }, [householdId]);

    const loadOrGenerateCode = async () => {
        if (!householdId) return;
        
        setLoading(true);
        try {
            const response = await appClient.functions.invoke('generateHouseholdCode', {
                household_id: householdId
            });
            
            if (response.data.success) {
                setInviteCode(response.data.invite_code);
            }
        } catch (error) {
            console.error('Failed to load/generate invite code:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text, type) => {
        try {
            await navigator.clipboard.writeText(text);
            if (type === 'code') {
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
            } else {
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
            }
        } catch (error) {
            alert('Failed to copy to clipboard');
        }
    };

    const appUrl = "https://app.groceryintel.com";
    const inviteMessage = `Join my household "${householdName}" on GroceryIntel!\n\n1. Visit: ${appUrl}\n2. Sign up or log in\n3. Go to Household page\n4. Enter code: ${inviteCode}\n\nLet's track groceries together!`;

    if (loading) {
        return (
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle>Invite New Members</CardTitle>
                <CardDescription>
                    Share this code with family or household members to let them join
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {inviteCode && (
                    <>
                        {/* Invite Code Display */}
                        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border-2 border-emerald-200">
                            <p className="text-sm text-slate-600 mb-2 font-medium">Your Household Invite Code:</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-grow">
                                    <code className="text-3xl font-bold text-emerald-700 tracking-wider">
                                        {inviteCode}
                                    </code>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => copyToClipboard(inviteCode, 'code')}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {codeCopied ? (
                                        <>
                                            <Check className="w-4 h-4 mr-1" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4 mr-1" />
                                            Copy Code
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Instructions */}
                        <Alert className="border-blue-200 bg-blue-50">
                            <AlertDescription>
                                <div className="space-y-2 text-sm text-blue-900">
                                    <p className="font-semibold">How they can join:</p>
                                    <ol className="list-decimal ml-4 space-y-1">
                                        <li>Visit <strong>{appUrl}</strong></li>
                                        <li>Sign up or log in to GroceryIntel</li>
                                        <li>Go to the Household page</li>
                                        <li>Enter the code: <strong>{inviteCode}</strong></li>
                                    </ol>
                                </div>
                            </AlertDescription>
                        </Alert>

                        {/* Share Button */}
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => copyToClipboard(inviteMessage, 'link')}
                        >
                            {linkCopied ? (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Copied Instructions!
                                </>
                            ) : (
                                <>
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Copy Full Instructions
                                </>
                            )}
                        </Button>

                        <p className="text-xs text-slate-500 text-center">
                            This code never expires and can be used by multiple people
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default InviteForm;