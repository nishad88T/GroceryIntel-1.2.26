import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Receipt, ChefHat, Share2, Home } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ShareTarget() {
    const [status, setStatus] = useState('processing'); // processing, success, error, login_required
    const [message, setMessage] = useState('Processing your shared content...');
    const [contentType, setContentType] = useState(null); // 'recipe' or 'receipt'
    const [result, setResult] = useState(null);

    useEffect(() => {
        handleSharedContent();
    }, []);

    const handleSharedContent = async () => {
        try {
            // Check if user is logged in
            const user = await base44.auth.me();
            if (!user) {
                setStatus('login_required');
                setMessage('Please log in to save shared content to your account.');
                return;
            }

            // Get shared data from URL parameters (for GET method)
            const urlParams = new URLSearchParams(window.location.search);
            const sharedUrl = urlParams.get('url') || urlParams.get('shared_url') || urlParams.get('text');
            const sharedTitle = urlParams.get('title') || '';

            // Check for files in sessionStorage (set by service worker for POST method)
            const pendingFiles = sessionStorage.getItem('pendingSharedFiles');
            let sharedFiles = [];
            if (pendingFiles) {
                sharedFiles = JSON.parse(pendingFiles);
                sessionStorage.removeItem('pendingSharedFiles');
            }

            // Determine content type
            if (sharedFiles && sharedFiles.length > 0) {
                // Files shared - likely receipt images
                setContentType('receipt');
                setMessage('Processing your receipt...');
                await processReceiptFiles(sharedFiles, user);
            } else if (sharedUrl) {
                // URL shared - likely recipe
                const isRecipeUrl = isLikelyRecipeUrl(sharedUrl);
                if (isRecipeUrl) {
                    setContentType('recipe');
                    setMessage('Parsing your recipe...');
                    await processRecipeUrl(sharedUrl, user);
                } else {
                    // Could be a receipt image URL or general content
                    setContentType('recipe');
                    setMessage('Processing shared URL...');
                    await processRecipeUrl(sharedUrl, user);
                }
            } else {
                setStatus('error');
                setMessage('No content was shared. Please try again.');
            }
        } catch (error) {
            console.error('Share target error:', error);
            setStatus('error');
            setMessage(error.message || 'Failed to process shared content.');
        }
    };

    const isLikelyRecipeUrl = (url) => {
        const recipeKeywords = ['recipe', 'cooking', 'food', 'kitchen', 'chef', 'meal', 'dish', 'bbc', 'allrecipes', 'delicious', 'tasty'];
        const lowerUrl = url.toLowerCase();
        return recipeKeywords.some(keyword => lowerUrl.includes(keyword));
    };

    const processRecipeUrl = async (url, user) => {
        try {
            const response = await base44.functions.invoke('handleSharedContent', {
                type: 'recipe',
                url: url,
                user_id: user.id,
                user_email: user.email,
                household_id: user.household_id
            });

            if (response.data?.success) {
                setStatus('success');
                setMessage('Recipe saved to your library!');
                setResult(response.data);
            } else {
                throw new Error(response.data?.error || 'Failed to parse recipe');
            }
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'Failed to parse recipe. Please try again.');
        }
    };

    const processReceiptFiles = async (fileDataArray, user) => {
        try {
            // Upload files to Base44 storage first
            const uploadedUrls = [];
            for (const fileData of fileDataArray) {
                // Convert base64 back to file
                const response = await fetch(fileData.data);
                const blob = await response.blob();
                const file = new File([blob], fileData.name, { type: fileData.type });
                
                const uploadResult = await base44.integrations.Core.UploadFile({ file });
                if (uploadResult?.file_url) {
                    uploadedUrls.push(uploadResult.file_url);
                }
            }

            if (uploadedUrls.length === 0) {
                throw new Error('Failed to upload receipt images');
            }

            // Call backend to process receipts
            const response = await base44.functions.invoke('handleSharedContent', {
                type: 'receipt',
                file_urls: uploadedUrls,
                user_id: user.id,
                user_email: user.email,
                household_id: user.household_id
            });

            if (response.data?.success) {
                setStatus('success');
                setMessage('Receipt uploaded and processing! Check your receipts page for results.');
                setResult(response.data);
            } else {
                throw new Error(response.data?.error || 'Failed to process receipt');
            }
        } catch (error) {
            setStatus('error');
            setMessage(error.message || 'Failed to process receipt. Please try again.');
        }
    };

    const handleLogin = () => {
        base44.auth.redirectToLogin(window.location.href);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-none shadow-xl bg-white/90 backdrop-blur-sm">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <Share2 className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">Share to GroceryIntel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {status === 'processing' && (
                        <div className="text-center space-y-4">
                            <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto" />
                            <p className="text-slate-600">{message}</p>
                            {contentType && (
                                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                                    {contentType === 'recipe' ? (
                                        <><ChefHat className="w-4 h-4" /> Processing recipe</>
                                    ) : (
                                        <><Receipt className="w-4 h-4" /> Processing receipt</>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-emerald-900">{message}</h3>
                                {result?.recipe && (
                                    <p className="text-slate-600 mt-2">"{result.recipe.title}" has been added.</p>
                                )}
                                {result?.receiptId && (
                                    <p className="text-slate-600 mt-2">Your receipt is being processed in the background.</p>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 pt-4">
                                {contentType === 'recipe' ? (
                                    <Button asChild className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                                        <Link to={createPageUrl('Recipes')}>
                                            <ChefHat className="w-4 h-4 mr-2" />
                                            View My Recipes
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button asChild className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                                        <Link to={createPageUrl('Receipts')}>
                                            <Receipt className="w-4 h-4 mr-2" />
                                            View My Receipts
                                        </Link>
                                    </Button>
                                )}
                                <Button variant="outline" asChild>
                                    <Link to={createPageUrl('Dashboard')}>
                                        <Home className="w-4 h-4 mr-2" />
                                        Go to Dashboard
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                <XCircle className="w-10 h-10 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-red-900">Something went wrong</h3>
                                <p className="text-slate-600 mt-2">{message}</p>
                            </div>
                            <div className="flex flex-col gap-2 pt-4">
                                <Button onClick={() => window.location.reload()} variant="outline">
                                    Try Again
                                </Button>
                                <Button variant="ghost" asChild>
                                    <Link to={createPageUrl('Dashboard')}>
                                        <Home className="w-4 h-4 mr-2" />
                                        Go to Dashboard
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )}

                    {status === 'login_required' && (
                        <div className="text-center space-y-4">
                            <Alert className="border-orange-200 bg-orange-50">
                                <AlertDescription className="text-orange-800">
                                    {message}
                                </AlertDescription>
                            </Alert>
                            <Button onClick={handleLogin} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                                Log In to Continue
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}