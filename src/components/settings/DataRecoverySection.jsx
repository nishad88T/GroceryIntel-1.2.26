import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, HardDrive, CheckCircle } from 'lucide-react';
import { assignHouseholdToOldReceipts } from '@/functions/assignHouseholdToOldReceipts';

export default function DataRecoverySection() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleRunRecovery = async () => {
        setLoading(true);
        setResult(null);
        setError(null);
        try {
            const response = await assignHouseholdToOldReceipts();
            if (response.data && response.data.status === 'success') {
                setResult(response.data.message);
            } else {
                throw new Error(response.data?.error || 'An unknown error occurred.');
            }
        } catch (err) {
            console.error("Data recovery error:", err);
            setError(err.response?.data?.error || err.message || 'Failed to run data recovery.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-orange-700" />
                    Data Recovery &amp; Re-linking
                </CardTitle>
                <CardDescription className="text-orange-800">
                    If you're having trouble editing old receipts or budgets, it may be due to missing household links. This tool will securely scan and fix your historical data.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-slate-700">
                    This process will find all records you've created and ensure they are correctly linked to your current household. It is safe to run multiple times.
                </p>
                
                <Button onClick={handleRunRecovery} disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : 'Run Data Re-linking Process'}
                </Button>

                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {result && (
                    <Alert variant="default" className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600"/>
                        <AlertTitle className="text-green-800">Success</AlertTitle>
                        <AlertDescription className="text-green-700">{result}</AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}