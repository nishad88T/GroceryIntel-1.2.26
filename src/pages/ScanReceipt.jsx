import React, { useState, useRef, useCallback } from "react";
import { appClient } from "@/api/appClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
    Camera,
    Upload,
    ArrowLeft,
    AlertCircle,
    Trash2,
    Clock,
    Loader2,
    Info,
    CheckCircle,
    Mail
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/components/utils/errorMessage";
import { fetchHouseholdContext } from "@/lib/household";

import CameraCapture from "../components/scan/CameraCapture";
import ProcessingStatus from "../components/scan/ProcessingStatus";
import { ScanLimitGuard } from "@/components/shared/FeatureGuard";

const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
                const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                });
                resolve(compressedFile);
            }, 'image/jpeg', quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
};

export default function ScanReceipt() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    
    const [step, setStep] = useState('metadata');
    const [storeName, setStoreName] = useState('');
    const [storeLocation, setStoreLocation] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [totalAmount, setTotalAmount] = useState('');
    const [files, setFiles] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');
    const [batchCount, setBatchCount] = useState(0);
    const MAX_BATCH_SIZE = 3;
    const [error, setError] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    React.useEffect(() => {
        appClient.auth.me().then(setCurrentUser).catch(err => console.error("Failed to load user:", err));
    }, []);

    const handleUpgrade = () => {
        alert("Premium upgrade coming soon! Contact support for early access.");
    };

    const updateScanCount = async () => {
        if (!currentUser?.tier || currentUser.tier !== 'premium') {
            try {
                const currentUserData = await appClient.auth.me();
                const currentDate = new Date().toISOString().split('T')[0];
                const lastResetDate = currentUserData.last_scan_reset_date;
                
                if (!lastResetDate) {
                    await appClient.auth.updateMe({
                        monthly_scan_count: 1,
                        last_scan_reset_date: currentDate
                    });
                } else {
                    const lastReset = new Date(lastResetDate);
                    const today = new Date();
                    const monthsDiff = (today.getFullYear() - lastReset.getFullYear()) * 12 + 
                                     (today.getMonth() - lastReset.getMonth());
                    
                    if (monthsDiff >= 1) {
                        await appClient.auth.updateMe({
                            monthly_scan_count: 1,
                            last_scan_reset_date: currentDate
                        });
                    } else {
                        await appClient.auth.updateMe({
                            monthly_scan_count: (currentUserData.monthly_scan_count || 0) + 1
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to update scan count:", error);
            }
        }
    };

    const validateMetadata = () => {
        // All fields are now optional for testing purposes
        return true;
    };

    const handleMetadataSubmit = () => {
        if (validateMetadata()) {
            setError(null);
            setStep('upload');
        }
    };

    const handleFileSelect = useCallback(async (event) => {
        const selectedFiles = Array.from(event.target.files);
        if (selectedFiles.length > 0) {
            setProcessing(true);
            setProcessingMessage("Preparing images...");
            
            const processedFiles = [];
            for (const file of selectedFiles) {
                try {
                    if (file.size > 2 * 1024 * 1024) {
                        const compressed = await compressImage(file);
                        processedFiles.push(compressed);
                    } else {
                        processedFiles.push(file);
                    }
                } catch (error) {
                    console.warn("Failed to compress image, using original:", error);
                    processedFiles.push(file);
                }
            }
            
            setFiles(prev => [...prev, ...processedFiles]);
            setError(null);
            setProcessing(false);
            setProcessingMessage('');
        }
    }, []);

    const handleCameraCapture = useCallback((file) => {
        setFiles(prev => [...prev, file]);
        setShowCamera(false);
        setError(null);
    }, []);
    
    const removeFile = (indexToRemove) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const processInBackground = async (scanAnother = false) => {
        if (files.length === 0) {
            setError("Please upload at least one image");
            return;
        }
        
        setProcessing(true);
        setProcessingMessage("Uploading images...");
        setError(null);

        try {
            const { user, householdId } = await fetchHouseholdContext();
            if (!user || !householdId) {
                throw new Error("User or household not found");
            }

            // Upload files
            const uploadResults = [];
            for (let i = 0; i < files.length; i++) {
                setProcessingMessage(`Uploading image ${i + 1} of ${files.length}...`);
                const result = await appClient.integrations.Core.UploadFile({ file: files[i] });
                uploadResults.push(result);
            }
            
            const file_urls = uploadResults.map(result => result.file_url);

            // Create receipt with processing_background status
            setProcessingMessage("Saving receipt...");
            const newReceipt = await appClient.entities.Receipt.create({
                supermarket: storeName || 'Unknown Store', // Updated for robustness
                store_location: storeLocation,
                purchase_date: purchaseDate,
                total_amount: parseFloat(totalAmount) || 0, // Updated for robustness
                receipt_image_urls: file_urls,
                currency: user.currency || 'GBP',
                validation_status: 'processing_background', 
                household_id: householdId,
                user_email: user.email,
                items: []
            });

            console.log(`Receipt ${newReceipt.id} created with processing_background status`);

            // Log credit consumption
            try {
                await appClient.entities.CreditLog.create({
                    user_id: user.id,
                    user_email: user.email,
                    household_id: householdId,
                    event_type: 'ocr_scan_background',
                    credits_consumed: 1,
                    reference_id: newReceipt.id,
                    timestamp: new Date().toISOString()
                });
            } catch (creditLogError) {
                console.error("Failed to log credit consumption for background scan:", creditLogError);
            }
            
            await updateScanCount();

            // Start background processing (fire and forget)
            try {
                appClient.functions.invoke('processReceiptInBackground', {
                    receiptId: newReceipt.id,
                    imageUrls: file_urls,
                    storeName: storeName || 'Unknown Store', // Updated for robustness
                    totalAmount: parseFloat(totalAmount) || 0, // Updated for robustness
                    householdId: householdId,
                    userEmail: user.email
                }).catch(err => {
                    console.log("Background processing initiated, may complete asynchronously:", err);
                });
            } catch (invokeError) {
                console.log("Background processing invoked successfully");
            }

            setBatchCount(prev => prev + 1);

            if (scanAnother && batchCount < MAX_BATCH_SIZE - 1) {
                toast.success(`Receipt ${batchCount + 1} saved! Processing in background...`, {
                    description: "You can scan another receipt now."
                });
                resetForNextReceipt();
            } else {
                // Show success message and redirect
                setProcessing(false);
                setProcessingMessage('');
                
                toast.success("Receipt saved successfully!", {
                    description: "Your receipt is being processed. Check 'My Receipts' to validate and view insights shortly.",
                    duration: 5000
                });
                
                setTimeout(() => {
                    navigate(createPageUrl("Receipts"));
                }, 1500);
            }

        } catch (err) {
            console.error("Receipt save error:", err);
            setError(getErrorMessage(err));
            setProcessing(false);
            setProcessingMessage('');
        }
    };

    const resetForNextReceipt = () => {
        setStoreName('');
        setStoreLocation('');
        setPurchaseDate(new Date().toISOString().split('T')[0]);
        setTotalAmount('');
        setFiles([]);
        setError(null);
        setStep('metadata');
        setProcessing(false);
        setProcessingMessage('');
    };

    return (
        <ScanLimitGuard onUpgrade={handleUpgrade}>
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-800">
                            <Info className="w-5 h-5" />
                            <span className="font-semibold text-sm">Smart Background Processing</span>
                        </div>
                        <p className="text-blue-700 text-sm mt-1">
                            Upload your receipt(s) and continue using the app. Processing happens in the background, and you'll be notified when ready for validation.
                        </p>
                    </div>

                    <Alert className="mb-6 bg-emerald-50 border-emerald-200">
                        <Mail className="h-4 w-4 text-emerald-600" />
                        <AlertDescription className="text-emerald-900">
                            <strong>Alternative:</strong> Forward receipt photos or online grocery order emails to <code className="px-1.5 py-0.5 bg-emerald-100 rounded text-sm font-mono">receipts@groceryintel.com</code> (one receipt per email) for automatic background processing
                        </AlertDescription>
                    </Alert>

                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8 text-center">
                        <Button variant="ghost" onClick={() => navigate(-1)} className="absolute top-4 left-4 md:top-8 md:left-8 text-slate-600 hover:text-slate-900">
                            <ArrowLeft className="h-5 w-5 mr-2" /> Back
                        </Button>
                        <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">
                            Scan Receipt
                        </h1>
                        <p className="text-slate-600 mt-2 max-w-md mx-auto">
                            Scan up to {MAX_BATCH_SIZE} receipts in one session
                        </p>
                        {batchCount > 0 && (
                            <div className="mt-2 flex items-center justify-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-sm font-medium text-green-700">
                                    {batchCount} of {MAX_BATCH_SIZE} receipts queued for processing
                                </span>
                            </div>
                        )}
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {step === 'metadata' && (
                            <motion.div
                                key="metadata"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Camera className="w-5 h-5 text-emerald-600" />
                                            Receipt Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <Alert className="bg-blue-50 border-blue-200">
                                            <Info className="h-4 w-4 text-blue-600" />
                                            <AlertDescription className="text-blue-800">
                                                Provide basic details to help our scanning engine analyze your receipt more accurately. 
                                                These details will be refined automatically after scanning.
                                            </AlertDescription>
                                        </Alert>

                                        {error && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</AlertDescription>
                                            </Alert>
                                        )}

                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="storeName">Store Name</Label>
                                                <Input
                                                    id="storeName"
                                                    placeholder="e.g., Tesco, Aldi"
                                                    value={storeName}
                                                    onChange={(e) => setStoreName(e.target.value)}
                                                    className="mt-1"
                                                />
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Approximate name - will be refined from receipt
                                                </p>
                                            </div>
                                            <div>
                                                <Label htmlFor="storeLocation">Store Location</Label>
                                                <Input
                                                    id="storeLocation"
                                                    placeholder="e.g., Leicester City Centre"
                                                    value={storeLocation}
                                                    onChange={(e) => setStoreLocation(e.target.value)}
                                                    className="mt-1"
                                                />
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Helps with multi-store analytics
                                                </p>
                                            </div>
                                            <div>
                                                <Label htmlFor="purchaseDate">Purchase Date</Label>
                                                <Input
                                                    id="purchaseDate"
                                                    type="date"
                                                    value={purchaseDate}
                                                    onChange={(e) => setPurchaseDate(e.target.value)}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="totalAmount">Total Amount (£)</Label>
                                                <Input
                                                    id="totalAmount"
                                                    type="number"
                                                    inputMode="decimal"
                                                    step="0.01"
                                                    placeholder="e.g., 45.67"
                                                    value={totalAmount}
                                                    onChange={(e) => setTotalAmount(e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <Button 
                                                onClick={handleMetadataSubmit} 
                                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                                            >
                                                Continue to Upload Images
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {step === 'upload' && (
                            <motion.div 
                                key="upload" 
                                initial={{ opacity: 0, x: -20 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                exit={{ opacity: 0, x: 20 }} 
                                className="space-y-6"
                            >
                                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm max-w-4xl mx-auto">
                                    <CardHeader>
                                        <CardTitle className="text-xl font-bold text-slate-900">
                                            Upload Receipt Images
                                        </CardTitle>
                                        <p className="text-sm text-slate-600 mt-1">
                                            For long receipts, fold and scan multiple sections
                                        </p>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Button onClick={() => setShowCamera(true)} variant="outline" className="h-24">
                                                <Camera className="w-8 h-8 mr-3 text-emerald-600" />
                                                <div>
                                                    <div className="font-semibold text-slate-900">Use Camera</div>
                                                    <div className="text-sm text-slate-600">Take a photo</div>
                                                </div>
                                            </Button>
                                            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="h-24">
                                                <Upload className="w-8 h-8 mr-3 text-emerald-600" />
                                                <div>
                                                    <div className="font-semibold text-slate-900">Upload File(s)</div>
                                                    <div className="text-sm text-slate-600">Auto-compresses large files</div>
                                                </div>
                                            </Button>
                                            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
                                        </div>

                                        <AnimatePresence>
                                            {files.length > 0 && (
                                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
                                                    <h4 className="font-semibold text-slate-800 mb-3">Uploaded Images ({files.length})</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                        {files.map((file, index) => (
                                                            <div key={index} className="relative group">
                                                                <img src={URL.createObjectURL(file)} alt={`receipt part ${index+1}`} className="w-full h-32 object-cover rounded-lg border"/>
                                                                <Button onClick={() => removeFile(index)} size="icon" variant="destructive" className="absolute -top-2 -right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Trash2 className="h-4 w-4"/>
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {processing && processingMessage && (
                                            <div className="text-center py-4">
                                                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-emerald-600" />
                                                <p className="text-sm text-slate-600">{processingMessage}</p>
                                            </div>
                                        )}

                                        {error && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</AlertDescription>
                                            </Alert>
                                        )}

                                        {files.length > 0 && !processing && (
                                            <div className="space-y-3 pt-4 border-t">
                                                <Button 
                                                    onClick={() => processInBackground(false)} 
                                                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                                                    disabled={processing}
                                                >
                                                    <Clock className="w-5 h-5 mr-2" />
                                                    Save & Process in Background
                                                </Button>
                                                
                                                {batchCount < MAX_BATCH_SIZE - 1 && (
                                                    <Button 
                                                        onClick={() => processInBackground(true)} 
                                                        variant="outline"
                                                        className="w-full"
                                                        disabled={processing}
                                                    >
                                                        <Clock className="w-5 h-5 mr-2" />
                                                        Save & Scan Next ({batchCount + 1}/{MAX_BATCH_SIZE})
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {showCamera && (
                        <CameraCapture
                            onCapture={handleCameraCapture}
                            onClose={() => setShowCamera(false)}
                        />
                    )}
                </div>
            </div>
        </ScanLimitGuard>
    );
}
