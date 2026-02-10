
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from '@/components/utils/currency';
import { appClient } from '@/api/appClient';
import { InvokeLLM } from '@/integrations/Core';
import { Skeleton } from '@/components/ui/skeleton';
import {
    X,
    Trash2,
    Calendar,
    FileText,
    ExternalLink,
    Store,
    Edit,
    AlertTriangle,
    Info,
    Loader2,
    CheckCircle,
    Clock
} from "lucide-react";
import { format } from "date-fns";

const categoryColors = {
    meat_fish: "border-red-500/50 bg-red-50 text-red-700",
    vegetables_fruits: "border-green-500/50 bg-green-50 text-green-700",
    dairy_eggs: "border-blue-500/50 bg-blue-50 text-blue-700",
    bakery: "border-yellow-500/50 bg-yellow-50 text-yellow-700",
    snacks_sweets: "border-pink-500/50 bg-pink-50 text-pink-700",
    beverages: "border-purple-500/50 bg-purple-50 text-purple-700",
    household_cleaning: "border-gray-500/50 bg-gray-50 text-gray-700",
    personal_care: "border-indigo-500/50 bg-indigo-50 text-indigo-700",
    frozen_foods: "border-cyan-500/50 bg-cyan-50 text-cyan-700",
    pantry_staples: "border-orange-500/50 bg-orange-50 text-orange-700",
    other: "border-slate-500/50 bg-slate-50 text-slate-700"
};

const NOTE_SUMMARY_CHAR_LIMIT = 150;

const NoteDisplay = ({ notes }) => {
    const [summary, setSummary] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [showFull, setShowFull] = useState(false);

    useEffect(() => {
        if (notes && notes.length > NOTE_SUMMARY_CHAR_LIMIT) {
            setIsSummarizing(true);
            InvokeLLM({ prompt: `Please provide a one-sentence summary of the following note: "${notes}"` })
                .then(setSummary)
                .catch(err => {
                    console.error("Note summarization failed:", err);
                    setSummary(notes.substring(0, NOTE_SUMMARY_CHAR_LIMIT) + '...');
                })
                .finally(() => setIsSummarizing(false));
        } else {
            setSummary('');
            setIsSummarizing(false);
            setShowFull(true);
        }
    }, [notes]);
    
    if (!notes) return null;
    
    const isLongNote = notes.length > NOTE_SUMMARY_CHAR_LIMIT;

    return (
        <div>
            <h4 className="font-semibold text-slate-800 mb-1 flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4" /> Notes
            </h4>
            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md">
                {isSummarizing ? (
                    <Skeleton className="h-4 w-full" />
                ) : (
                    <p>{showFull || !isLongNote ? notes : summary || notes}</p>
                )}
            </div>
            {isLongNote && !isSummarizing && (
                <Button variant="link" size="sm" onClick={() => setShowFull(!showFull)} className="px-0 h-auto text-emerald-600 mt-1">
                    {showFull ? 'Show less' : 'Show more'}
                </Button>
            )}
        </div>
    );
};

// Utility function for validation status badges
const getValidationStatusBadge = (status) => {
    switch (status) {
        case 'processing_background':
            return { text: 'Processing...', color: 'bg-blue-100 text-blue-800', icon: Loader2, spin: true };
        case 'review_insights':
            return { text: 'Ready to Review', color: 'bg-emerald-100 text-emerald-800', icon: Clock };
        case 'validated':
            return { text: 'Validated', color: 'bg-green-100 text-green-800', icon: CheckCircle };
        case 'failed_processing':
            return { text: 'Failed', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
        default:
            return { text: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: AlertTriangle };
    }
};

export default function ReceiptDetailModal({ receipt, onClose, onEdit }) {
    const [userCurrency, setUserCurrency] = useState('GBP');
    const [insights, setInsights] = useState(null);
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const user = await appClient.auth.me();
                if (user && user.currency) {
                    setUserCurrency(user.currency);
                }
            } catch (error) {
                console.error("Error loading user:", error);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        if (receipt) {
            console.log("ReceiptDetailModal: Receipt data:", receipt);
            console.log("ReceiptDetailModal: Receipt insights:", receipt.receipt_insights);
            console.log("ReceiptDetailModal: Validation status:", receipt.validation_status);
            
            // Check if insights exist
            if (receipt.receipt_insights) {
                setInsights(receipt.receipt_insights);
                setIsLoadingInsights(false);
            } else if (receipt.validation_status === 'processing_background') {
                // Still processing
                setIsLoadingInsights(true);
                setInsights(null);
            } else if (receipt.validation_status === 'failed_processing') {
                // Failed - insights unavailable
                setIsLoadingInsights(false);
                setInsights(null);
            } else {
                // review_insights but no insights object (rare edge case where insights might not have been generated yet
                // or are missing for other reasons even if the status is not 'processing_background' or 'failed_processing')
                setInsights(null);
                setIsLoadingInsights(false);
            }
        }
    }, [receipt]);

    const handleDelete = async () => {
        if (!receipt || !receipt.id) {
            console.error("Cannot delete: No receipt or receipt ID");
            alert("Error: No receipt ID found");
            return;
        }
        
        // Use browser's native confirm for better mobile compatibility
        const confirmed = window.confirm("Are you sure you want to delete this receipt? This action cannot be undone.");
        
        if (!confirmed) {
            return;
        }
        
        setIsDeleting(true);
        console.log("Starting delete for receipt:", receipt.id);
        
        try {
            await appClient.entities.Receipt.delete(receipt.id);
            console.log("Receipt deleted successfully");
            alert("Receipt deleted successfully!");
            onClose();
            setTimeout(() => {
                window.location.reload();
            }, 100);
        } catch (error) {
            console.error("Failed to delete receipt:", error);
            alert(`Failed to delete receipt: ${error.message}`);
            setIsDeleting(false);
        }
    };

    if (!receipt) {
        return null;
    }

    const formatReceiptDate = (dateString) => {
        if (!dateString) return "No date available";
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return "Invalid date - please edit to correct";
            }
            return format(date, "EEEE, MMMM d, yyyy");
        } catch (error) {
            console.error("Date formatting error:", error);
            return "Invalid date - please edit to correct";
        }
    };

    const isDateValid = receipt.purchase_date && !isNaN(new Date(receipt.purchase_date).getTime());
    const validationStatus = receipt.validation_status || 'validated';
    const statusBadge = getValidationStatusBadge(validationStatus);
    const StatusIcon = statusBadge.icon;

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-4xl h-[95vh] flex flex-col p-0">
                <DialogHeader className="flex-shrink-0 p-4 md:p-6 border-b bg-white">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <DialogTitle className="text-lg md:text-2xl font-bold text-slate-900 truncate">
                                    {receipt.supermarket}
                                </DialogTitle>
                                <Badge className={`${statusBadge.color} flex items-center gap-1`}>
                                    <StatusIcon className={`w-3 h-3 ${statusBadge.spin ? 'animate-spin' : ''}`} />
                                    {statusBadge.text}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                {isDateValid ? (
                                    <>
                                        <Calendar className="w-4 h-4 text-slate-500" />
                                        <span className="text-sm text-slate-600">{formatReceiptDate(receipt.purchase_date)}</span>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-1 text-red-600">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="text-sm">{formatReceiptDate(receipt.purchase_date)}</span>
                                    </div>
                                )}
                            </div>
                            {receipt.store_location && (
                                <div className="flex items-center gap-2 mt-1">
                                    <Store className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm text-slate-600">{receipt.store_location}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="hidden md:flex items-center gap-2">
                            {onEdit && (
                                <Button variant="outline" size="sm" onClick={() => onEdit(receipt)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                </Button>
                            )}
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="text-red-600 hover:bg-red-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </>
                                )}
                            </Button>
                            <Button variant="outline" size="sm" onClick={onClose}>
                                <X className="w-4 h-4 mr-2" />
                                Close
                            </Button>
                        </div>

                        <div className="flex md:hidden items-center gap-2">
                            {onEdit && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => onEdit(receipt)}
                                >
                                    <Edit className="w-4 h-4" />
                                </Button>
                            )}
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="text-red-600 hover:bg-red-50"
                            >
                                {isDeleting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                            </Button>
                            <Button variant="outline" size="sm" onClick={onClose}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 p-4 md:p-6">
                        <div className="lg:col-span-2 flex flex-col min-h-0 order-2 lg:order-1">
                            <h4 className="font-semibold text-slate-800 mb-3 flex-shrink-0">Items ({receipt.items?.length || 0})</h4>
                            <div className="space-y-2">
                                {receipt.items?.map((item, index) => (
                                    <div key={index} className="flex justify-between items-start p-3 rounded-lg bg-slate-50 border gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-800 text-sm md:text-base">{item.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className={`text-xs ${categoryColors[item.category]}`}>
                                                    {item.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-semibold text-slate-800 text-sm md:text-base">{formatCurrency(item.total_price, userCurrency)}</p>
                                            <p className="text-xs text-slate-500">
                                                {item.quantity} x {formatCurrency(item.unit_price, userCurrency)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {(!receipt.items || receipt.items.length === 0) && (
                                    <div className="text-center py-8 text-slate-500">
                                        <p>No items found in this receipt.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-4 flex-shrink-0 order-1 lg:order-2">
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center">
                                <p className="text-sm text-emerald-800 font-medium">Total Amount</p>
                                <p className="text-lg md:text-xl font-bold text-emerald-600">{formatCurrency(receipt.total_amount, userCurrency)}</p>
                            </div>

                            {isLoadingInsights ? (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-blue-900 mb-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <h4 className="font-semibold">Generating Insights...</h4>
                                    </div>
                                    <p className="text-sm text-blue-800">
                                        AI is analyzing your receipt. This usually takes 10-20 seconds.
                                    </p>
                                </div>
                            ) : validationStatus === 'failed_processing' && !insights ? (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-red-900 mb-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        <h4 className="font-semibold">Processing Failed</h4>
                                    </div>
                                    <p className="text-sm text-red-800">
                                        AI processing encountered an error and could not extract receipt data. This receipt cannot be analyzed.
                                    </p>
                                </div>
                            ) : insights ? (
                                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                    <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                                        <Info className="w-4 h-4" />
                                        AI Receipt Insights
                                    </h4>
                                    <div className="space-y-2 text-sm text-purple-800">
                                        {insights.summary && <p className="font-medium">{insights.summary}</p>}
                                        {insights.highlights && insights.highlights.length > 0 && (
                                            <ul className="list-disc list-inside space-y-1">
                                                {insights.highlights.slice(0, 3).map((highlight, idx) => (
                                                    <li key={idx}>{highlight}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-purple-200">
                                        <p className="text-xs text-purple-700 italic">
                                            💡 AI-generated insights. Review and validate items for improved accuracy in overall analytics.
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                            
                            <div className="space-y-3">
                                {(receipt.receipt_image_urls && receipt.receipt_image_urls.length > 0) && (
                                    <div>
                                        <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2 text-sm">
                                            <FileText className="w-4 h-4" /> Receipt Images
                                        </h4>
                                        <div className="space-y-2">
                                            {receipt.receipt_image_urls.map((url, index) => (
                                                <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="outline" size="sm" className="w-full text-left justify-start">
                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                        View Image {receipt.receipt_image_urls.length > 1 ? ` ${index + 1}` : ''}
                                                    </Button>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <NoteDisplay notes={receipt.notes} />
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
