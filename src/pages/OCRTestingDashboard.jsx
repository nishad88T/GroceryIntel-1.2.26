
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Play,
    Upload,
    ChevronLeft,
    ChevronRight,
    Save,
    BarChart3,
    AlertCircle,
    CheckCircle,
    FileText,
    Loader2,
    ZoomIn,
    ZoomOut,
    Info,
    Eye,
    RefreshCw,
    X // Added X icon for delete
} from "lucide-react";
import { formatCurrency } from '@/components/utils/currency';
import { toast } from "sonner";

const ERROR_TYPES = [
    { value: "incorrect_name", label: "Incorrect Name" },
    { value: "incorrect_price", label: "Incorrect Price" },
    { value: "incorrect_quantity", label: "Incorrect Quantity" },
    { value: "wrong_category", label: "Wrong Category" },
    { value: "missed_line", label: "Missed Line" },
    { value: "incorrect_store_name", label: "Incorrect Store" },
    { value: "incorrect_date", label: "Incorrect Date" },
    { value: "total_amount_mismatch", label: "Total Mismatch" },
    { value: "incorrect_location", label: "Incorrect Location" },
    { value: "wrong_discount", label: "Wrong Discount" },
    { value: "duplicate_item", label: "Duplicate Item" },
    { value: "total_as_item", label: "Total as Item" },
    { value: "other", label: "Other" }
];

const ERROR_ORIGINS = [
    { value: "textract_raw", label: "Textract Raw" },
    { value: "llm_canonicalization", label: "LLM Processing" },
    { value: "missed_item", label: "Missed Completely" },
    { value: "overall_metadata", label: "Receipt Metadata" }
];

export default function OCRTestingDashboard() {
    const [view, setView] = useState('home'); // 'home', 'create', 'review', 'results'
    const [testRuns, setTestRuns] = useState([]);
    const [currentTestRun, setCurrentTestRun] = useState(null);
    const [currentReceiptIndex, setCurrentReceiptIndex] = useState(0);
    const [receipts, setReceipts] = useState([]);
    const [currentReceipt, setCurrentReceipt] = useState(null);
    const [imageZoom, setImageZoom] = useState(1);
    
    // Feedback state
    const [receiptQuality, setReceiptQuality] = useState('crisp');
    const [receiptLength, setReceiptLength] = useState('medium');
    const [itemFeedback, setItemFeedback] = useState([]);
    
    // Create test run state
    const [newTestName, setNewTestName] = useState('');
    const [newTestDescription, setNewTestDescription] = useState('');
    const [uploadingReceipts, setUploadingReceipts] = useState(false);
    
    // Analysis state
    const [analysisResults, setAnalysisResults] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const startRerunTest = async (testRun) => {
        if (!confirm(`Are you sure you want to rerun "${testRun.name}"? This will create a new test run version with the same receipts.`)) {
            return;
        }

        try {
            const response = await base44.functions.invoke('rerunTestRun', {
                original_test_run_id: testRun.id
            });

            if (response.data.success) {
                toast.success(`Rerun created: ${response.data.new_test_run.name}`);
                await loadData();
            }
        } catch (error) {
            console.error("Error rerunning test:", error);
            toast.error("Failed to rerun test");
        }
    };

    const deleteTestRun = async (testRun) => {
        if (!confirm(`Are you sure you want to permanently delete "${testRun.name}"? This will delete all associated receipts and feedback logs. This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await base44.functions.invoke('deleteTestRun', {
                test_run_id: testRun.id
            });

            if (response.data.success) {
                toast.success(`Test run "${testRun.name}" deleted successfully`);
                await loadData();
            }
        } catch (error) {
            console.error("Error deleting test run:", error);
            toast.error("Failed to delete test run");
        }
    };

    const loadData = async () => {
        try {
            const userData = await base44.auth.me();
            setUser(userData);
            
            if (userData.role !== 'admin') {
                toast.error("Admin access required");
                return;
            }

            const runs = await base44.entities.TestRun.list('-created_date', 50);
            setTestRuns(runs || []);
        } catch (error) {
            console.error("Error loading test runs:", error);
            toast.error("Failed to load test runs");
        }
        setLoading(false);
    };

    const startNewTestRun = async () => {
        if (!newTestName.trim()) {
            toast.error("Please provide a test run name");
            return;
        }

        try {
            const response = await base44.functions.invoke('createTestRun', {
                name: newTestName,
                description: newTestDescription
            });

            if (response.data.success) {
                setCurrentTestRun(response.data.test_run);
                setView('create');
                toast.success(response.data.message);
            }
        } catch (error) {
            console.error("Error creating test run:", error);
            toast.error("Failed to create test run");
        }
    };

    const handleReceiptUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0 || !currentTestRun) return;

        setUploadingReceipts(true);
        try {
            const uploadedReceipts = [];
            let totalItems = 0;

            for (const file of files) {
                // Upload file
                const uploadResult = await base44.integrations.Core.UploadFile({ file });
                const file_url = uploadResult.file_url;

                // Create receipt with is_test_data flag
                const receipt = await base44.entities.Receipt.create({
                    supermarket: "Test Receipt",
                    store_location: "Test Location",
                    purchase_date: new Date().toISOString().split('T')[0],
                    total_amount: 0,
                    receipt_image_urls: [file_url],
                    currency: user.currency || 'GBP',
                    validation_status: 'processing_background',
                    household_id: user.household_id,
                    user_email: user.email,
                    is_test_data: true,
                    items: []
                });

                uploadedReceipts.push(receipt.id);

                // Trigger background processing
                base44.functions.invoke('processReceiptInBackground', {
                    receiptId: receipt.id,
                    imageUrls: [file_url],
                    storeName: "Test Receipt",
                    totalAmount: 0,
                    householdId: user.household_id,
                    userEmail: user.email
                }).catch(err => console.log("Background processing started"));
            }

            // Update test run with receipt IDs
            const updatedReceiptIds = [...(currentTestRun.receipt_ids || []), ...uploadedReceipts];
            await base44.entities.TestRun.update(currentTestRun.id, {
                receipt_ids: updatedReceiptIds,
                total_receipts: updatedReceiptIds.length
            });

            toast.success(`${files.length} receipt(s) uploaded and processing`);
            setTimeout(() => loadTestRunReceipts(currentTestRun.id), 2000);

        } catch (error) {
            console.error("Error uploading receipts:", error);
            toast.error("Failed to upload receipts");
        }
        setUploadingReceipts(false);
    };

    const loadTestRunReceipts = async (testRunId) => {
        try {
            const testRun = await base44.entities.TestRun.get(testRunId);
            if (!testRun || !testRun.receipt_ids || testRun.receipt_ids.length === 0) {
                setReceipts([]);
                return;
            }

            const receiptPromises = testRun.receipt_ids.map(id => 
                base44.entities.Receipt.get(id).catch(() => null)
            );
            const loadedReceipts = (await Promise.all(receiptPromises)).filter(r => r !== null);
            
            // Calculate total items
            const totalItems = loadedReceipts.reduce((sum, r) => sum + (r.items?.length || 0), 0);
            await base44.entities.TestRun.update(testRunId, { total_items: totalItems });

            setReceipts(loadedReceipts);
            setCurrentTestRun({ ...testRun, total_items: totalItems });
        } catch (error) {
            console.error("Error loading receipts:", error);
        }
    };

    const startReviewing = async (testRun) => {
        setCurrentTestRun(testRun);
        await loadTestRunReceipts(testRun.id);
        setCurrentReceiptIndex(0);
        setView('review');
    };

    useEffect(() => {
        if (view === 'review' && receipts.length > 0) {
            const receipt = receipts[currentReceiptIndex];
            setCurrentReceipt(receipt);
            
            // Auto-categorize receipt length
            const itemCount = receipt.items?.length || 0;
            let length = 'medium';
            if (itemCount <= 10) length = 'short';
            else if (itemCount >= 21) length = 'long';
            setReceiptLength(length);
            
            // Initialize feedback array for items
            setItemFeedback(receipt.items?.map(() => ({
                error_type: null,
                error_origin: null,
                original_value: '',
                corrected_value: '',
                comment: '',
                is_critical_error: false // Changed from is_critical to is_critical_error
            })) || []);
        }
    }, [currentReceiptIndex, receipts, view]);

    const updateItemFeedback = (index, field, value) => {
        const updated = [...itemFeedback];
        updated[index] = { ...updated[index], [field]: value };
        setItemFeedback(updated);
    };

    const submitReceiptFeedback = async () => {
        if (!currentReceipt || !currentTestRun) return;

        // Filter only items with feedback
        const feedbackItems = itemFeedback
            .map((feedback, index) => ({
                ...feedback,
                item_index: index,
                original_value: feedback.original_value || currentReceipt.items[index]?.name || '',
                is_critical_error: feedback.is_critical_error || false, // Map is_critical to is_critical_error
            }))
            .filter(f => f.error_type);

        if (feedbackItems.length === 0) {
            toast.info("No errors marked for this receipt");
        }

        try {
            await base44.functions.invoke('submitOCRQualityFeedback', {
                test_run_id: currentTestRun.id,
                receipt_id: currentReceipt.id,
                feedback_items: feedbackItems,
                receipt_quality: receiptQuality,
                receipt_length_category: receiptLength,
                store_name: currentReceipt.supermarket
            });

            toast.success("Feedback saved");
            
            // Move to next receipt
            if (currentReceiptIndex < receipts.length - 1) {
                setCurrentReceiptIndex(currentReceiptIndex + 1);
            } else {
                toast.success("All receipts reviewed!");
                setView('home');
                loadData();
            }
        } catch (error) {
            console.error("Error submitting feedback:", error);
            toast.error(`Failed to save feedback: ${error.message || 'Unknown error'}`);
        }
    };

    const analyzeBatch = async (testRun) => {
        setCurrentTestRun(testRun);
        setAnalyzing(true);
        try {
            const response = await base44.functions.invoke('analyzeOCRFeedbackBatch', {
                test_run_id: testRun.id
            });

            if (response.data.success) {
                setAnalysisResults(response.data);
                setView('results');
                toast.success("Batch analysis complete");
            }
        } catch (error) {
            console.error("Error analyzing batch:", error);
            toast.error("Failed to analyze batch");
        }
        setAnalyzing(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!user || user.role !== 'admin') {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Admin access required to use OCR Testing Dashboard
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">OCR Testing Dashboard</h1>
                    <p className="text-slate-600">Systematic quality assurance for receipt scanning accuracy</p>
                </div>

                {/* Home View - Test Run List */}
                {view === 'home' && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Test Runs</CardTitle>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button className="bg-emerald-600 hover:bg-emerald-700">
                                                <Play className="w-4 h-4 mr-2" />
                                                New Test Run
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Create New Test Run</DialogTitle>
                                                <DialogDescription>
                                                    Start a new batch of test receipts for quality assurance
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label>Test Run Name *</Label>
                                                    <Input
                                                        placeholder="e.g., Aldi Batch 1"
                                                        value={newTestName}
                                                        onChange={(e) => setNewTestName(e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Description</Label>
                                                    <Textarea
                                                        placeholder="e.g., Testing faded receipts from Aldi"
                                                        value={newTestDescription}
                                                        onChange={(e) => setNewTestDescription(e.target.value)}
                                                    />
                                                </div>
                                                <Button onClick={startNewTestRun} className="w-full">
                                                    Create Test Run
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {testRuns.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                        <p>No test runs yet. Create your first test run to begin quality assurance.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {testRuns.map(run => (
                                            <div key={run.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-semibold text-slate-900">{run.name}</h3>
                                                            <Badge variant="outline">v{run.version}</Badge>
                                                            <Badge className={
                                                                run.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                                                run.status === 'analyzed' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-yellow-100 text-yellow-800'
                                                            }>
                                                                {run.status}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-slate-600">{run.description}</p>
                                                        <div className="flex gap-4 mt-2 text-xs text-slate-500">
                                                            <span>{run.total_receipts || 0} receipts</span>
                                                            <span>{run.total_items || 0} items</span>
                                                            <span>{run.reviewed_receipts || 0} reviewed</span>
                                                            {run.batch_analysis_summary?.error_rate && (
                                                                <span className="font-semibold text-red-600">
                                                                    {run.batch_analysis_summary.error_rate}% error rate
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {run.status === 'in_progress' && (
                                                            <Button size="sm" variant="outline" onClick={() => startReviewing(run)}>
                                                                <Eye className="w-4 h-4 mr-1" />
                                                                Review
                                                            </Button>
                                                        )}
                                                        {run.status === 'completed' && (
                                                            <Button size="sm" onClick={() => analyzeBatch(run)} disabled={analyzing}>
                                                                {analyzing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-1" />}
                                                                Analyze
                                                            </Button>
                                                        )}
                                                        {run.status === 'analyzed' && (
                                                            <>
                                                                <Button size="sm" variant="outline" onClick={() => {
                                                                    setCurrentTestRun(run);
                                                                    setAnalysisResults({ analysis: run.batch_analysis_summary, stats: { total_errors: run.batch_analysis_summary?.total_errors || 0 }, error_rate: run.batch_analysis_summary?.error_rate || 0 });
                                                                    setView('results');
                                                                }}>
                                                                    <BarChart3 className="w-4 h-4 mr-1" />
                                                                    View Results
                                                                </Button>
                                                                <Button size="sm" variant="outline" onClick={() => startRerunTest(run)}>
                                                                    <RefreshCw className="w-4 h-4 mr-1" />
                                                                    Rerun
                                                                </Button>
                                                            </>
                                                        )}
                                                        <Button size="sm" variant="destructive" onClick={() => deleteTestRun(run)}>
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Create View - Upload Receipts */}
                {view === 'create' && currentTestRun && (
                    <div className="space-y-6">
                        <Button variant="outline" onClick={() => setView('home')}>
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back to Test Runs
                        </Button>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Upload Test Receipts: {currentTestRun.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        Upload 5-10 test receipts. They will be processed automatically.
                                    </AlertDescription>
                                </Alert>

                                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleReceiptUpload}
                                        className="hidden"
                                        id="receipt-upload"
                                        disabled={uploadingReceipts}
                                    />
                                    <label htmlFor="receipt-upload" className="cursor-pointer">
                                        <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                                        <p className="text-slate-600 mb-2">
                                            {uploadingReceipts ? 'Uploading and processing...' : 'Click to upload receipts'}
                                        </p>
                                        <p className="text-sm text-slate-500">Up to 10 receipts per batch</p>
                                    </label>
                                </div>

                                {receipts.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-3">Uploaded Receipts ({receipts.length})</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {receipts.map((receipt, idx) => (
                                                <div key={receipt.id} className="border rounded-lg p-3">
                                                    <img 
                                                        src={receipt.receipt_image_urls[0]} 
                                                        alt={`Receipt ${idx + 1}`}
                                                        className="w-full h-32 object-cover rounded mb-2"
                                                    />
                                                    <div className="text-xs">
                                                        <Badge variant="outline" className={
                                                            receipt.validation_status === 'review_insights' ? 'bg-emerald-100 text-emerald-800' :
                                                            'bg-blue-100 text-blue-800'
                                                        }>
                                                            {receipt.validation_status === 'review_insights' ? 'Ready' : 'Processing'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {receipts.length > 0 && receipts.every(r => r.validation_status === 'review_insights') && (
                                    <Button onClick={() => startReviewing(currentTestRun)} className="w-full">
                                        <Eye className="w-4 h-4 mr-2" />
                                        Start Reviewing Receipts
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Review View - Three Panel Layout */}
                {view === 'review' && currentReceipt && (
                    <div className="space-y-4">
                        {/* Navigation Header */}
                        <div className="flex justify-between items-center">
                            <Button variant="outline" onClick={() => setView('home')}>
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                Exit Review
                            </Button>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-slate-600">
                                    Receipt {currentReceiptIndex + 1} of {receipts.length}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setCurrentReceiptIndex(Math.max(0, currentReceiptIndex - 1))}
                                        disabled={currentReceiptIndex === 0}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setCurrentReceiptIndex(Math.min(receipts.length - 1, currentReceiptIndex + 1))}
                                        disabled={currentReceiptIndex === receipts.length - 1}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Three Panel Layout */}
                        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
                            {/* Left Panel - Receipt Image */}
                            <Card className="col-span-3 overflow-hidden flex flex-col">
                                <CardHeader className="flex-shrink-0 pb-3">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-sm">Receipt Image</CardTitle>
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" onClick={() => setImageZoom(Math.max(0.5, imageZoom - 0.25))}>
                                                <ZoomOut className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={() => setImageZoom(Math.min(3, imageZoom + 0.25))}>
                                                <ZoomIn className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-auto p-2">
                                    <img
                                        src={currentReceipt.receipt_image_urls[0]}
                                        alt="Receipt"
                                        style={{ transform: `scale(${imageZoom})`, transformOrigin: 'top left' }}
                                        className="w-full"
                                    />
                                </CardContent>
                            </Card>

                            {/* Middle Panel - Textract Raw Output */}
                            <Card className="col-span-4 overflow-hidden flex flex-col">
                                <CardHeader className="flex-shrink-0 pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        Textract Raw Output
                                        <Badge variant="outline">Pre-LLM</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-auto p-2">
                                    <div className="text-xs">
                                        {/* Store Metadata Box */}
                                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                                            <div className="font-semibold text-blue-900 mb-2">Extracted Metadata</div>
                                            <div className="space-y-1">
                                                <div><strong>Store:</strong> {currentReceipt.supermarket || 'N/A'}</div>
                                                <div><strong>Location:</strong> {currentReceipt.store_location || 'N/A'}</div>
                                            </div>
                                        </div>

                                        {/* Items Table */}
                                        <div className="mb-2 p-2 bg-slate-50 rounded">
                                            <div><strong>Date:</strong> {currentReceipt.purchase_date}</div>
                                            <div><strong>Total:</strong> {formatCurrency(currentReceipt.total_amount, user.currency)}</div>
                                        </div>
                                        <table className="w-full border text-xs">
                                            <thead className="bg-slate-100">
                                                <tr>
                                                    <th className="border p-1">Item</th>
                                                    <th className="border p-1">Qty</th>
                                                    <th className="border p-1">Price</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentReceipt.items?.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="border p-1">{item.name}</td>
                                                        <td className="border p-1">{item.quantity}</td>
                                                        <td className="border p-1">{formatCurrency(item.total_price, user.currency)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Right Panel - LLM Output with Feedback */}
                            <Card className="col-span-5 overflow-hidden flex flex-col">
                                <CardHeader className="flex-shrink-0 pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        LLM Canonicalized Output
                                        <Badge variant="outline" className="bg-blue-100">Post-LLM</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <ScrollArea className="flex-1">
                                    <CardContent className="space-y-3">
                                        {currentReceipt.items?.map((item, idx) => (
                                            <div key={idx} className="border rounded-lg p-3 space-y-2 bg-white">
                                                <div className="flex justify-between">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-sm">{item.canonical_name || item.name}</div>
                                                        <div className="text-xs text-slate-600">
                                                            {item.quantity} × {formatCurrency(item.unit_price, user.currency)} = {formatCurrency(item.total_price, user.currency)}
                                                        </div>
                                                        <Badge variant="outline" className="text-xs mt-1">{item.category}</Badge>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                                                    <div>
                                                        <Label className="text-xs">Error Origin</Label>
                                                        <Select
                                                            value={itemFeedback[idx]?.error_origin || ''}
                                                            onValueChange={(val) => updateItemFeedback(idx, 'error_origin', val)}
                                                        >
                                                            <SelectTrigger className="h-8 text-xs">
                                                                <SelectValue placeholder="None" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {ERROR_ORIGINS.map(opt => (
                                                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                                        {opt.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Error Type</Label>
                                                        <Select
                                                            value={itemFeedback[idx]?.error_type || ''}
                                                            onValueChange={(val) => updateItemFeedback(idx, 'error_type', val)}
                                                        >
                                                            <SelectTrigger className="h-8 text-xs">
                                                                <SelectValue placeholder="None" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {ERROR_TYPES.map(opt => (
                                                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                                        {opt.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                
                                                {itemFeedback[idx]?.error_type && (
                                                    <div className="space-y-2">
                                                        <Input
                                                            placeholder="Corrected value"
                                                            value={itemFeedback[idx]?.corrected_value || ''}
                                                            onChange={(e) => updateItemFeedback(idx, 'corrected_value', e.target.value)}
                                                            className="h-8 text-xs"
                                                        />
                                                        <Textarea
                                                            placeholder="Comment (optional)"
                                                            value={itemFeedback[idx]?.comment || ''}
                                                            onChange={(e) => updateItemFeedback(idx, 'comment', e.target.value)}
                                                            className="h-16 text-xs"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </CardContent>
                                </ScrollArea>
                            </Card>
                        </div>

                        {/* Bottom Metadata & Submit */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex justify-between items-end">
                                    <div className="flex gap-4">
                                        <div>
                                            <Label className="text-xs">Receipt Quality</Label>
                                            <Select value={receiptQuality} onValueChange={setReceiptQuality}>
                                                <SelectTrigger className="w-32 h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="crisp">Crisp</SelectItem>
                                                    <SelectItem value="faded">Faded</SelectItem>
                                                    <SelectItem value="crumpled">Crumpled</SelectItem>
                                                    <SelectItem value="torn">Torn</SelectItem>
                                                    <SelectItem value="stained">Stained</SelectItem>
                                                    <SelectItem value="poor_scan">Poor Scan</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Receipt Length</Label>
                                            <Select value={receiptLength} onValueChange={setReceiptLength}>
                                                <SelectTrigger className="w-32 h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="short">Short (1-10)</SelectItem>
                                                    <SelectItem value="medium">Medium (11-20)</SelectItem>
                                                    <SelectItem value="long">Long (21+)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="text-xs text-slate-600 pt-5">
                                            <div>{currentReceipt.items?.length || 0} items total</div>
                                            <div>{itemFeedback.filter(f => f.error_type).length} errors marked</div>
                                        </div>
                                    </div>
                                    <Button onClick={submitReceiptFeedback} className="bg-emerald-600 hover:bg-emerald-700">
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Feedback & Next
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Results View - Batch Analysis */}
                {view === 'results' && analysisResults && currentTestRun && (
                    <div className="space-y-6">
                        <Button variant="outline" onClick={() => setView('home')}>
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back to Test Runs
                        </Button>

                        <Card>
                            <CardHeader>
                                <CardTitle>Batch Analysis: {currentTestRun.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* KPIs Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 bg-blue-50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-900">
                                            {currentTestRun.total_receipts || 0}
                                        </div>
                                        <div className="text-sm text-blue-700">Receipts Reviewed</div>
                                    </div>
                                    <div className="p-4 bg-purple-50 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-900">
                                            {currentTestRun.total_items || 0}
                                        </div>
                                        <div className="text-sm text-purple-700">Items Processed</div>
                                    </div>
                                    <div className="p-4 bg-red-50 rounded-lg">
                                        <div className="text-2xl font-bold text-red-900">
                                            {analysisResults.stats?.total_errors || 0}
                                        </div>
                                        <div className="text-sm text-red-700">Errors Flagged</div>
                                    </div>
                                    <div className="p-4 bg-orange-50 rounded-lg">
                                        <div className="text-2xl font-bold text-orange-900">
                                            {analysisResults.error_rate?.toFixed(2) || 0}%
                                        </div>
                                        <div className="text-sm text-orange-700">Error Rate</div>
                                    </div>
                                </div>

                                {/* LLM Analysis Summary */}
                                {analysisResults.analysis && (
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg">AI Analysis Summary</h3>
                                        <p className="text-slate-700">{analysisResults.analysis.summary}</p>

                                        {/* Prevalent Issues */}
                                        {analysisResults.analysis.prevalent_issues?.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold mb-3">Identified Issues</h4>
                                                <div className="space-y-3">
                                                    {analysisResults.analysis.prevalent_issues.map((issue, idx) => (
                                                        <Card key={idx} className="border-l-4 border-l-orange-500">
                                                            <CardContent className="p-4">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <h5 className="font-semibold">{issue.pattern}</h5>
                                                                    <Badge variant={
                                                                        issue.severity === 'high' ? 'destructive' :
                                                                        issue.severity === 'medium' ? 'default' :
                                                                        'secondary'
                                                                    }>
                                                                        {issue.severity}
                                                                    </Badge>
                                                                </div>
                                                                <div className="text-sm space-y-2">
                                                                    <p><strong>Count:</strong> {issue.count} occurrences</p>
                                                                    <p><strong>Root Cause:</strong> {issue.root_cause}</p>
                                                                    <p><strong>Affected Conditions:</strong> {issue.affected_conditions}</p>
                                                                    <div className="mt-3 p-3 bg-blue-50 rounded">
                                                                        <p className="font-semibold text-blue-900 mb-1">Suggested Fix:</p>
                                                                        <p className="text-blue-800">{issue.suggested_fix}</p>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Priority Recommendations */}
                                        {analysisResults.analysis.priority_recommendations?.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold mb-3">Priority Recommendations</h4>
                                                <ul className="space-y-2">
                                                    {analysisResults.analysis.priority_recommendations.map((rec, idx) => (
                                                        <li key={idx} className="flex items-start gap-2">
                                                            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                                            <span className="text-sm">{rec}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Correlations */}
                                        {analysisResults.analysis.correlations?.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold mb-3">Pattern Correlations</h4>
                                                <div className="space-y-2">
                                                    {analysisResults.analysis.correlations.map((corr, idx) => (
                                                        <div key={idx} className="p-3 bg-slate-50 rounded text-sm">
                                                            {corr}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Re-run and Back Actions */}
                                <div className="pt-6 border-t flex gap-3">
                                    <Button variant="outline" className="flex-1" onClick={() => startRerunTest(currentTestRun)}>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Rerun Test (Version {parseFloat(currentTestRun.version || "1.0") + 0.1})
                                    </Button>
                                    <Button variant="outline" onClick={() => setView('home')}>
                                        Done
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
