import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, PlusCircle, Trash2, BarChart, CheckCircle, AlertTriangle } from 'lucide-react';
import { generateModeledData } from "@/functions/generateModeledData";
import { Receipt, Budget } from "@/entities/all";
import { toast } from "sonner";


export default function DataModeler() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [testDataStats, setTestDataStats] = useState({ receipts: 0, budgets: 0, loading: true });
    const [realReceiptStats, setRealReceiptStats] = useState({ count: 0, loading: true });

    const MIN_REAL_RECEIPTS_REQUIRED = 5;

    useEffect(() => {
        loadAllDataStats();
    }, []);

    const loadAllDataStats = async () => {
        setTestDataStats(prev => ({ ...prev, loading: true }));
        setRealReceiptStats(prev => ({ ...prev, loading: true }));
        try {
            const [testReceipts, testBudgets, realReceipts] = await Promise.all([
                Receipt.filter({ is_test_data: true }),
                Budget.filter({ is_test_data: true }),
                Receipt.filter({ is_test_data: { '$ne': true } })
            ]);
            setTestDataStats({ receipts: testReceipts.length, budgets: testBudgets.length, loading: false });
            setRealReceiptStats({ count: realReceipts.length, loading: false });
        } catch (error) {
            console.error("Error loading data stats:", error);
            toast.error("Could not load data statistics.");
            setTestDataStats({ receipts: 0, budgets: 0, loading: false });
            setRealReceiptStats({ count: 0, loading: false });
        }
    };

    const handleGenerateData = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const response = await generateModeledData({ action: 'generate' });
            if (response.data && response.status === 200) {
                setResult({ type: 'success', message: response.data.message });
                toast.success("Test data generated!", {
                    description: response.data.message,
                });
                await loadAllDataStats(); // Refresh stats from DB
            } else {
                 const errorMessage = response.data?.error || "An unexpected error occurred.";
                setResult({ type: 'error', message: errorMessage });
                toast.error("Data generation failed", {
                    description: errorMessage,
                });
            }
        } catch (error) {
            const errorMessage = error.response?.data?.error || error.message || "A network or server error occurred.";
            setResult({ type: 'error', message: errorMessage });
             toast.error("Data generation failed", {
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveTestData = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const response = await generateModeledData({ action: 'remove' });
            if (response.data && response.status === 200) {
                setResult({ type: 'success', message: response.data.message });
                toast.success("Test data removed successfully!", {
                    description: response.data.message,
                });
                await loadAllDataStats(); // Refresh stats from DB
            } else {
                const errorMessage = response.data?.error || "An unexpected error occurred during data removal.";
                setResult({ type: 'error', message: errorMessage });
                toast.error("Data removal failed", {
                    description: errorMessage,
                });
            }
        } catch (error) {
            console.error("Caught error in component:", error);
            const errorMessage = error.response?.data?.error || error.message || "A network or server error occurred.";
            setResult({ type: 'error', message: errorMessage });
            toast.error("Data removal failed", {
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const canGenerate = realReceiptStats.count >= MIN_REAL_RECEIPTS_REQUIRED;
    const testDataExists = testDataStats.receipts > 0 || testDataStats.budgets > 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Test Data Modeler</CardTitle>
                <CardDescription>
                    Generate realistic historical data based on your own shopping habits to explore the app's features.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                            <BarChart className="w-4 h-4 text-slate-500" />
                            Your Real Data
                        </h4>
                        {realReceiptStats.loading ? (
                            <Loader2 className="w-4 h-4 animate-spin mt-1" />
                        ) : (
                            <p className="text-sm text-slate-600">{realReceiptStats.count} receipts uploaded.</p>
                        )}
                    </div>
                     <div>
                        <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                           <BarChart className="w-4 h-4 text-slate-500" />
                           Test Data Active
                        </h4>
                         {testDataStats.loading ? (
                            <Loader2 className="w-4 h-4 animate-spin mt-1" />
                        ) : (
                             <p className="text-sm text-slate-600">{testDataStats.receipts} receipts, {testDataStats.budgets} budgets.</p>
                        )}
                    </div>
                </div>

                {result && (
                    <div className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
                        result.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                        {result.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        <p>{result.message}</p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row items-center gap-4">
                 <Button onClick={handleGenerateData} disabled={isLoading || !canGenerate || testDataExists} className="w-full sm:w-auto">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Generate Data
                </Button>
                <Button variant="destructive" onClick={handleRemoveTestData} disabled={isLoading || !testDataExists} className="w-full sm:w-auto">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Remove Test Data
                </Button>
                 {!testDataStats.loading && !canGenerate && (
                     <p className="text-xs text-slate-500 text-center sm:text-left">
                        You need to upload at least {MIN_REAL_RECEIPTS_REQUIRED} more receipts before you can generate test data.
                    </p>
                )}
            </CardFooter>
        </Card>
    );
}