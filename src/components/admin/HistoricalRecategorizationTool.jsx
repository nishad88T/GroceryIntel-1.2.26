import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, Loader2, Play, RefreshCw, StopCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function HistoricalRecategorizationTool() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(null);
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);
    const [completed, setCompleted] = useState(false);

    const addLog = (message, type = 'info') => {
        setLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
    };

    const processAllBatches = async () => {
        setIsProcessing(true);
        setError(null);
        setCompleted(false);
        setLogs([]);
        setProgress(null);

        let skip = 0;
        let hasMore = true;
        let totalProcessedUnique = 0;
        let totalItems = 0;
        let totalReceiptsGlobal = 0;
        let errorCount = 0;
        const processedReceiptIds = new Set(); // Track which receipts we've actually processed

        addLog('Starting recategorization of ALL receipts...', 'info');

        try {
            while (hasMore) {
                addLog(`Processing batch starting at skip=${skip}...`, 'info');

                try {
                    const response = await base44.functions.invoke('recategorizeAllReceipts', {
                        skip: skip,
                        limit: 5
                    });

                    if (response.data.success) {
                        const batchInfo = response.data.batch_info;
                        
                        // Set total only once
                        if (totalReceiptsGlobal === 0) {
                            totalReceiptsGlobal = batchInfo.total_receipts;
                            addLog(`Total receipts to process: ${totalReceiptsGlobal}`, 'info');
                        }

                        // Track actual progress
                        totalProcessedUnique = skip + batchInfo.processed;
                        totalItems += response.data.total_items_processed;

                        const progressPercent = Math.min(100, (totalProcessedUnique / totalReceiptsGlobal) * 100);
                        setProgress({
                            current: totalProcessedUnique,
                            total: totalReceiptsGlobal,
                            percent: progressPercent,
                            totalItems: totalItems
                        });

                        addLog(`✓ Batch complete: ${batchInfo.processed} receipts, ${response.data.total_items_processed} items processed`, 'success');

                        if (response.data.errors && response.data.errors.length > 0) {
                            errorCount += response.data.errors.length;
                            addLog(`⚠ ${response.data.errors.length} errors in this batch`, 'warning');
                        }

                        // Check if we have more to process
                        if (batchInfo.has_more && batchInfo.next_skip !== null) {
                            skip = batchInfo.next_skip;
                            addLog(`Moving to next batch (skip=${skip})...`, 'info');
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        } else {
                            hasMore = false;
                            addLog(`All batches processed successfully! ${errorCount > 0 ? `(${errorCount} errors encountered)` : ''}`, 'success');
                            setCompleted(true);
                        }
                    } else {
                        throw new Error(response.data.error || 'Unknown error occurred');
                    }
                } catch (batchError) {
                    addLog(`✗ Batch error at skip=${skip}: ${batchError.message}`, 'error');
                    
                    // Don't retry indefinitely - move to next batch after 1 retry
                    if (batchError.message.includes('503') || batchError.message.includes('timeout')) {
                        addLog(`Skipping problematic batch and moving forward...`, 'warning');
                        skip += 5; // Move forward to avoid infinite loop
                        if (skip >= totalReceiptsGlobal) {
                            hasMore = false;
                            addLog('Reached end of receipts.', 'info');
                            setCompleted(true);
                        } else {
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }
                    } else {
                        throw batchError; // Fatal error, stop processing
                    }
                }
            }
        } catch (err) {
            console.error('Error during batch processing:', err);
            setError(err.message);
            addLog(`✗ Fatal error: ${err.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        setProgress(null);
        setLogs([]);
        setError(null);
        setCompleted(false);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                    Recategorize All Receipts
                </CardTitle>
                <CardDescription>
                    Automatically process ALL receipts in the database and update their item categories to the new 14-category system. Processing in batches of 5 receipts.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!isProcessing && !completed && (
                    <Button
                        onClick={processAllBatches}
                        disabled={isProcessing}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        <Play className="w-4 h-4 mr-2" />
                        Start Recategorization
                    </Button>
                )}

                {completed && (
                    <Button
                        onClick={reset}
                        variant="outline"
                        className="w-full"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset
                    </Button>
                )}

                {progress && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Progress: {progress.current} / {progress.total} receipts</span>
                            <span>{Math.round(progress.percent)}%</span>
                        </div>
                        <Progress value={progress.percent} className="h-2" />
                        <p className="text-xs text-slate-500">
                            {progress.totalItems} items processed
                        </p>
                    </div>
                )}

                {isProcessing && (
                    <Alert className="bg-blue-50 border-blue-200">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <AlertDescription className="ml-2 text-blue-800">
                            Processing receipts in batches of 5... This may take several minutes. Please keep this page open.
                        </AlertDescription>
                    </Alert>
                )}

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription className="ml-2">
                            {error}
                        </AlertDescription>
                    </Alert>
                )}

                {completed && (
                    <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <AlertDescription className="ml-2 text-green-800">
                            All receipts have been successfully recategorized!
                        </AlertDescription>
                    </Alert>
                )}

                {logs.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700">Process Log</h4>
                        <div className="bg-slate-50 rounded-lg p-3 max-h-64 overflow-y-auto space-y-1">
                            {logs.map((log, idx) => (
                                <div
                                    key={idx}
                                    className={`text-xs font-mono flex gap-2 ${
                                        log.type === 'success' ? 'text-green-700' :
                                        log.type === 'error' ? 'text-red-700' :
                                        log.type === 'warning' ? 'text-orange-700' :
                                        'text-slate-600'
                                    }`}
                                >
                                    <span className="text-slate-400">{log.timestamp}</span>
                                    <span>{log.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}