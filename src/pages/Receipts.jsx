import React, { useState, useEffect, useCallback } from "react";
import { Receipt } from "@/entities/Receipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Receipt as ReceiptIcon,
    Search,
    Filter,
    X,
    ArrowLeft,
    AlertTriangle,
    RefreshCw
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, subYears } from "date-fns";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/components/utils/errorMessage";
import { fetchHouseholdContext } from "@/lib/household";

import ReceiptList from "../components/receipts/ReceiptList";
import ReceiptDetailModal from "../components/receipts/ReceiptDetailModal";
import EditReceiptModal from "../components/receipts/EditReceiptModal";
import FeedbackModal from "../components/scan/FeedbackModal";

export default function ReceiptsPage() {
    const [receipts, setReceipts] = useState([]);
    const [filteredReceipts, setFilteredReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSupermarket, setSelectedSupermarket] = useState("all");
    const [dateRange, setDateRange] = useState("all");
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [editingReceipt, setEditingReceipt] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [householdId, setHouseholdId] = useState(null);
    const [validationFilter, setValidationFilter] = useState("all");
    const [loadError, setLoadError] = useState(null);
    const [savedReceiptForFeedback, setSavedReceiptForFeedback] = useState(null);

    const [refreshFailCount, setRefreshFailCount] = useState(0);
    const MAX_REFRESH_FAILS = 3;

    const location = useLocation();
    const navigate = useNavigate();

    const loadReceipts = useCallback(async (retryCount = 0) => {
        try {
            setLoading(true);
            setLoadError(null);
            const { user, householdId: resolvedHouseholdId } = await fetchHouseholdContext();
            setCurrentUser(user);
            setHouseholdId(resolvedHouseholdId);
            
            console.log("Loading receipts for user:", user);
            
            if (user && resolvedHouseholdId) {
                console.log("Loading receipts for household:", resolvedHouseholdId);
                const data = await Receipt.filter({ household_id: resolvedHouseholdId }, "-purchase_date", 500);
                console.log("Loaded receipts:", data?.length || 0);
                
                // Filter out test data receipts
                const filteredData = (data || []).filter(r => !r.is_test_data);
                console.log("After filtering test data:", filteredData.length);
                
                setReceipts(filteredData);
                setRefreshFailCount(0); // Reset fail count on success
            } else {
                console.log("No household_id, clearing receipts");
                setReceipts([]);
            }
        } catch (error) {
            console.error("Error loading receipts:", error);
            setLoadError(getErrorMessage(error));
            
            if (retryCount < 2 && (error.message?.includes("Network") || error.message?.includes("network"))) {
                console.log(`Retrying... (attempt ${retryCount + 1})`);
                setTimeout(() => {
                    loadReceipts(retryCount + 1);
                }, 1000 * (retryCount + 1));
            } else {
                setReceipts([]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReceipts();
    }, [loadReceipts]);

    // Separate effect for auto-refresh with improved error handling
    useEffect(() => {
        const interval = setInterval(async () => {
            // Stop trying if we've had too many consecutive failures
            if (refreshFailCount >= MAX_REFRESH_FAILS) {
                console.log("Auto-refresh disabled due to repeated failures. Page refresh will re-enable.");
                return;
            }

            try {
                const { householdId: resolvedHouseholdId } = await fetchHouseholdContext();
                const effectiveHouseholdId = resolvedHouseholdId || householdId;
                if (effectiveHouseholdId) {
                    const data = await Receipt.filter({ household_id: effectiveHouseholdId }, "-purchase_date", 500);
                    
                    // Only update if there are changes to avoid unnecessary re-renders
                    const hasProcessingReceipts = data.some(r => 
                        r.validation_status === 'processing_background' || r.validation_status === 'review_insights'
                    );
                    
                    if (hasProcessingReceipts) {
                        console.log("Found processing/review_insights receipts, refreshing data silently");
                        const filteredData = (data || []).filter(r => !r.is_test_data);
                        setReceipts(filteredData || []);
                    }
                    setRefreshFailCount(0); // Reset on successful refresh
                }
            } catch (error) {
                // Silently handle errors, just increment fail count
                setRefreshFailCount(prev => prev + 1);
                // Only log if it's not a network error (to avoid console spam)
                if (!error.message?.includes("Network") && !error.message?.includes("network")) {
                    console.warn("Silent refresh encountered an error:", error.message);
                }
            }
        }, 15000); // Check every 15 seconds (reduced frequency to minimize network load)
        
        return () => clearInterval(interval);
    }, [refreshFailCount, householdId]); // Include refreshFailCount in dependencies

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const filterParam = urlParams.get('filter');
        if (filterParam === 'pending') {
            setValidationFilter('review_insights'); // Changed from pending_validation
        }
        const editId = urlParams.get('edit');
        if (editId && receipts.length > 0) {
            const receiptToEdit = receipts.find(r => r.id === editId);
            if (receiptToEdit) {
                setEditingReceipt(receiptToEdit);
            }
        }
    }, [location.search, receipts]);

    useEffect(() => {
        let filtered = [...receipts];
        console.log("Starting filter with receipts:", filtered.length);

        if (searchTerm) {
            filtered = filtered.filter(receipt => 
                receipt.supermarket?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                receipt.items?.some(item => 
                    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
            console.log("After search filter:", filtered.length);
        }

        if (selectedSupermarket !== "all") {
            filtered = filtered.filter(receipt => receipt.supermarket === selectedSupermarket);
            console.log("After supermarket filter:", filtered.length);
        }

        if (validationFilter !== "all") {
            filtered = filtered.filter(receipt => {
                const status = receipt.validation_status || 'review_insights'; // Default to review_insights if status is missing
                if (validationFilter === 'review_insights') {
                    return status === 'review_insights' || status === 'processing_background';
                }
                return status === validationFilter;
            });
            console.log("After validation filter:", filtered.length);
        }

        if (dateRange !== "all" && dateRange) {
            const now = new Date();
            let startDate, endDate;

            switch (dateRange) {
                case "this_month":
                    startDate = startOfMonth(now);
                    endDate = endOfMonth(now);
                    break;
                case "last_month":
                    startDate = startOfMonth(subMonths(now, 1));
                    endDate = endOfMonth(subMonths(now, 1));
                    break;
                case "last_3_months":
                    startDate = startOfMonth(subMonths(now, 3));
                    endDate = endOfMonth(now);
                    break;
                case "this_year":
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = new Date(now.getFullYear(), 11, 31);
                    break;
                case "last_year":
                    startDate = new Date(now.getFullYear() - 1, 0, 1);
                    endDate = new Date(now.getFullYear() - 1, 11, 31);
                    break;
                default:
                    startDate = null;
                    endDate = null;
            }

            if (startDate && endDate) {
                filtered = filtered.filter(receipt => {
                    const receiptDate = new Date(receipt.purchase_date);
                    return receiptDate >= startDate && receiptDate <= endDate;
                });
                console.log("After date range filter:", filtered.length);
            }
        }

        console.log("Final filtered receipts:", filtered.length);
        setFilteredReceipts(filtered);
    }, [receipts, searchTerm, selectedSupermarket, dateRange, validationFilter]);

    const uniqueSupermarkets = [...new Set(receipts.map(r => r.supermarket).filter(Boolean))];

    const handleReceiptUpdated = async (id, updatedData) => {
        const effectiveHouseholdId = householdId || currentUser?.household_id;
        if (!currentUser || !effectiveHouseholdId) {
            console.error("Cannot update receipt: No current user or household ID.");
            return;
        }

        try {
            let finalData = {
                ...updatedData,
                household_id: effectiveHouseholdId,
                user_email: currentUser.email,
            };

            // Implement receipt-extracted store information overriding user input
            // If the receipt being edited has extracted_data with a supermarket,
            // prioritize it over any user input for the supermarket field.
            if (editingReceipt && editingReceipt.extracted_data?.supermarket) {
                finalData.supermarket = editingReceipt.extracted_data.supermarket;
            }
            
            await Receipt.update(id, finalData);
            
            await loadReceipts();
            
            setEditingReceipt(null);
            
            const urlParams = new URLSearchParams(location.search);
            if (urlParams.get('edit')) {
                urlParams.delete('edit');
                const newUrl = `${location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
                navigate(newUrl, { replace: true });
            }
            
            setSavedReceiptForFeedback({
                id: id,
                totalItems: updatedData.items?.length || 0
            });
        } catch (error) {
            console.error("Error updating receipt:", error);
            alert("Failed to update receipt. Please try again.");
        }
    };

    const handleBackFromAnalytics = () => {
        const urlParams = new URLSearchParams(location.search);
        const returnParam = urlParams.get('return');
        if (returnParam === 'analytics') {
            navigate(createPageUrl('Analytics'));
        }
    };

    const handleReceiptClick = (receipt) => {
        // Only allow editing/validation if AI processing is complete
        if (receipt.validation_status === 'review_insights') {
            setEditingReceipt(receipt);
        } else if (receipt.validation_status === 'processing_background') {
            // Still processing - show a toast instead
            toast.info('Receipt is still processing', {
                description: 'AI is analyzing your receipt. Please wait a moment.'
            });
        } else {
            setSelectedReceipt(receipt);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                           <ReceiptIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">My Receipts</h1>
                            <p className="text-slate-600">
                                {loading ? 'Loading...' : `${filteredReceipts.length} of ${receipts.length} receipts`}
                            </p>
                        </div>
                    </div>
                    
                    {/* Manual Refresh Button */}
                    <Button 
                        variant="outline" 
                        onClick={() => loadReceipts()}
                        disabled={loading}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    
                    {new URLSearchParams(location.search).get('return') === 'analytics' && (
                        <Button variant="outline" onClick={handleBackFromAnalytics}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Analytics
                        </Button>
                    )}
                </motion.div>

                {loadError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <Alert className="border-red-200 bg-red-50">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <AlertDescription className="flex items-center justify-between">
                                <span className="text-red-800 font-medium">
                                    {typeof loadError === 'string' ? loadError : (loadError?.message || JSON.stringify(loadError))}
                                </span>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="border-red-300 text-red-700 hover:bg-red-100"
                                    onClick={() => loadReceipts()}
                                >
                                    Retry
                                </Button>
                            </AlertDescription>
                        </Alert>
                    </motion.div>
                )}

                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <Label htmlFor="search">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <Input
                                        id="search"
                                        placeholder="Search store or item..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <Label>Supermarket</Label>
                                <Select value={selectedSupermarket} onValueChange={setSelectedSupermarket}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All supermarkets" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All supermarkets</SelectItem>
                                        {uniqueSupermarkets.map(supermarket => (
                                            <SelectItem key={supermarket} value={supermarket}>
                                                {supermarket}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Status</Label>
                                <Select value={validationFilter} onValueChange={setValidationFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All statuses</SelectItem>
                                        <SelectItem value="review_insights">Ready to Review</SelectItem>
                                        <SelectItem value="processing_background">Processing</SelectItem>
                                        <SelectItem value="validated">Validated</SelectItem>
                                        <SelectItem value="failed_processing">Failed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div>
                                <Label>Date Range</Label>
                                <Select value={dateRange} onValueChange={setDateRange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All time</SelectItem>
                                        <SelectItem value="this_month">This month</SelectItem>
                                        <SelectItem value="last_month">Last month</SelectItem>
                                        <SelectItem value="last_3_months">Last 3 months</SelectItem>
                                        <SelectItem value="this_year">This year</SelectItem>
                                        <SelectItem value="last_year">Last year</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        {(searchTerm || selectedSupermarket !== "all" || dateRange !== "all" || validationFilter !== "all") && (
                            <div className="mt-4">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                        setSearchTerm("");
                                        setSelectedSupermarket("all");
                                        setDateRange("all");
                                        setValidationFilter("all");
                                    }}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Clear all filters
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <ReceiptList 
                    receipts={filteredReceipts}
                    loading={loading}
                    onReceiptClick={handleReceiptClick}
                    onReceiptEdit={setEditingReceipt}
                />
            </div>

            <ReceiptDetailModal
                receipt={selectedReceipt}
                isOpen={!!selectedReceipt}
                onClose={() => setSelectedReceipt(null)}
                onEdit={setEditingReceipt}
            />

            <EditReceiptModal
                receipt={editingReceipt}
                isOpen={!!editingReceipt}
                onClose={() => {
                    setEditingReceipt(null);
                    const urlParams = new URLSearchParams(location.search);
                    if (urlParams.get('edit')) {
                        urlParams.delete('edit');
                        const newUrl = `${location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
                        navigate(newUrl, { replace: true });
                    }
                }}
                onSave={handleReceiptUpdated}
            />
            
            {savedReceiptForFeedback && (
                <FeedbackModal
                    receiptId={savedReceiptForFeedback.id}
                    totalItems={savedReceiptForFeedback.totalItems}
                    onClose={() => setSavedReceiptForFeedback(null)}
                    onSubmit={() => {
                        setSavedReceiptForFeedback(null);
                        loadReceipts();
                    }}
                />
            )}
        </div>
    );
}
