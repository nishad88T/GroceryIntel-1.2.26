
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
    AlertCircle, Plus, Trash2, Save, X, Edit3, Loader2, AlertTriangle, CheckCircle, Edit, Clock, ChevronUp, ChevronDown
} from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from '@/components/utils/currency';
import { calculateReceiptVAT, distributeVATAcrossItems, VAT_RATES } from '@/components/utils/vatCalculations';

const CATEGORIES = [
    { value: "meat_fish", label: "Meat & Fish", color: "bg-red-100 text-red-800" },
    { value: "vegetables_fruits", label: "Vegetables & Fruits", color: "bg-green-100 text-green-800" },
    { value: "dairy_eggs", label: "Dairy & Eggs", color: "bg-blue-100 text-blue-800" },
    { value: "bakery", label: "Bakery", color: "bg-yellow-100 text-yellow-800" },
    { value: "snacks_sweets", label: "Snacks & Sweets", color: "bg-pink-100 text-pink-800" },
    { value: "beverages", label: "Beverages", color: "bg-purple-100 text-purple-800" },
    { value: "household_cleaning", label: "Household & Cleaning", color: "bg-gray-100 text-gray-800" },
    { value: "personal_care", label: "Personal Care", color: "bg-indigo-100 text-indigo-800" },
    { value: "frozen_foods", label: "Frozen Foods", color: "bg-cyan-100 text-cyan-800" },
    { value: "pantry_staples", label: "Pantry Staples", color: "bg-orange-100 text-orange-800" },
    { value: "other", label: "Other", color: "bg-slate-100 text-slate-800" }
];

const safeParseFloat = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
};

const calculateTotalDiscounts = (items) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + safeParseFloat(item.discount_applied, 0), 0);
};

export default function ReceiptPreview({ data, onSave, onCancel, currency = 'GBP' }) {
    console.log("ReceiptPreview rendering with data:", data);

    // All hooks must be declared unconditionally at the top level of the component
    const [editedData, setEditedData] = useState(() => {
        try {
            console.log("ReceiptPreview: Initializing state with data:", data);

            // Handle invalid data gracefully in initializer
            if (!data || typeof data !== 'object') {
                console.error("ReceiptPreview: Invalid data prop provided at initialization", data);
                // Return a minimal, valid default state to prevent app crash
                return {
                    supermarket: 'Unknown Store',
                    store_location: '',
                    purchase_date: new Date().toISOString().split('T')[0],
                    total_amount: 0,
                    total_discounts: 0,
                    currency: currency,
                    notes: '',
                    items: [],
                    total_vat: 0,
                    vat_breakdown: { zero_rate: 0, reduced_rate: 0, standard_rate: 0 },
                    receipt_image_urls: []
                };
            }

            // Ensure items is an array
            const initialItems = Array.isArray(data.items) ? data.items : [];
            console.log(`ReceiptPreview: Processing ${initialItems.length} items for state initialization`);

            // Sanitize each item with safe defaults
            const processedItems = initialItems.map((item, idx) => {
                try {
                    const quantity = safeParseFloat(item.quantity, 1);
                    const unit_price = safeParseFloat(item.unit_price, 0);
                    const discount_applied = safeParseFloat(item.discount_applied, 0);

                    // Re-calculate total_price as primary source of truth, fallback to extracted if invalid.
                    let total_price = Math.max(0, (quantity * unit_price) - discount_applied);
                    // If calculated total_price is 0 but extracted total_price was valid and non-zero, use extracted.
                    if (total_price === 0 && safeParseFloat(item.total_price, 0) > 0) {
                        total_price = safeParseFloat(item.total_price, 0);
                    }

                    return {
                        name: String(item.name || `Item ${idx + 1}`).trim(),
                        canonical_name: String(item.canonical_name || item.name || `Item ${idx + 1}`).trim(),
                        brand: String(item.brand || '').trim(),
                        category: item.category || 'other',
                        quantity: quantity,
                        unit_price: unit_price,
                        total_price: total_price,
                        discount_applied: discount_applied,
                        offer_description: String(item.offer_description || '').trim(),
                        pack_size_value: item.pack_size_value !== undefined && item.pack_size_value !== null ? safeParseFloat(item.pack_size_value, null) : null,
                        pack_size_unit: item.pack_size_unit || null,
                        price_per_unit: safeParseFloat(item.price_per_unit, 0),
                        is_own_brand: Boolean(item.is_own_brand),
                        vat_rate: item.vat_rate !== undefined && item.vat_rate !== null ? safeParseFloat(item.vat_rate, 0) : 0,
                        vat_amount: safeParseFloat(item.vat_amount, 0),
                        confidence_score: safeParseFloat(item.confidence_score, 3),
                        approval_state: item.approval_state || 'pending',
                        original_extracted: { ...item } // Store original for potential debug/comparison
                    };
                } catch (itemError) {
                    console.error(`Error sanitizing item at index ${idx}:`, itemError, "Original item:", item);
                    // Return a minimal valid item to prevent crash
                    return {
                        name: `Error Item ${idx + 1}`,
                        canonical_name: `Error Item ${idx + 1}`,
                        brand: '',
                        category: 'other',
                        quantity: 1,
                        unit_price: 0,
                        total_price: 0,
                        discount_applied: 0,
                        offer_description: '',
                        pack_size_value: null,
                        pack_size_unit: null,
                        price_per_unit: 0,
                        is_own_brand: false,
                        vat_rate: 0,
                        vat_amount: 0,
                        confidence_score: 1, // Low confidence due to error
                        approval_state: 'corrected', // Mark as needing review
                        original_extracted: { ...item }
                    };
                }
            });

            console.log("ReceiptPreview: Items sanitized, calculating VAT...");

            let vatCalculation;
            try {
                vatCalculation = calculateReceiptVAT(processedItems);
            } catch (vatError) {
                console.error("Error calculating VAT during initialization:", vatError);
                // Fallback to items without VAT calculation results
                vatCalculation = {
                    itemsWithVAT: processedItems,
                    totalVAT: 0,
                    vatBreakdown: { zero: { amount: 0 }, reduced: { amount: 0 }, standard: { amount: 0 } }
                };
            }

            const itemsWithVAT = vatCalculation.itemsWithVAT;
            const initialTotalAmount = itemsWithVAT.reduce((sum, item) => sum + safeParseFloat(item.total_price, 0), 0);
            const initialTotalDiscounts = calculateTotalDiscounts(itemsWithVAT);

            const result = {
                ...data,
                items: itemsWithVAT,
                supermarket: String(data.supermarket || 'Unknown Store').trim(),
                store_location: String(data.store_location || '').trim(),
                purchase_date: data.purchase_date || new Date().toISOString().split('T')[0],
                total_amount: safeParseFloat(data.total_amount, initialTotalAmount),
                total_discounts: initialTotalDiscounts,
                currency: currency,
                notes: String(data.notes || '').trim(),
                total_vat: vatCalculation.totalVAT,
                vat_breakdown: {
                    zero_rate: vatCalculation.vatBreakdown.zero.amount,
                    reduced_rate: vatCalculation.vatBreakdown.reduced.amount,
                    standard_rate: vatCalculation.vatBreakdown.standard.amount
                },
                receipt_image_urls: Array.isArray(data.receipt_image_urls) ? data.receipt_image_urls : []
            };

            console.log("ReceiptPreview: State initialized successfully.", result);
            return result;

        } catch (error) {
            console.error("CRITICAL: Error in ReceiptPreview useState initializer:", error);
            console.error("Error stack:", error.stack);
            console.error("Data that caused error:", data);

            // Return minimal safe state to prevent white screen crash
            return {
                supermarket: 'Unknown Store (Initialization Error)',
                store_location: '',
                purchase_date: new Date().toISOString().split('T')[0],
                total_amount: 0,
                total_discounts: 0,
                currency: currency,
                notes: 'Error initializing receipt data. Please contact support.',
                items: [],
                total_vat: 0,
                vat_breakdown: { zero_rate: 0, reduced_rate: 0, standard_rate: 0 },
                receipt_image_urls: []
            };
        }
    });

    const [totalMismatchShown, setTotalMismatchShown] = useState(false);
    const [manualTotalOverride, setManualTotalOverride] = useState(null);
    const [showTotalDebug, setShowTotalDebug] = useState(false);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [showVATDetails, setShowVATDetails] = useState(false);
    const [processing, setProcessing] = useState(false);

    const newItemRef = useRef(null);

    const calculateTotal = useCallback(() => {
        if (!editedData.items || editedData.items.length === 0) return 0;

        const total = editedData.items.reduce((sum, item) => {
            const price = safeParseFloat(item.total_price, 0);
            return sum + price;
        }, 0);

        return Math.round(total * 100) / 100;
    }, [editedData.items]);

    const calculatedTotal = calculateTotal();

    useEffect(() => {
        if (manualTotalOverride === null) {
            setEditedData(prev => ({
                ...prev,
                total_amount: calculatedTotal
            }));
        }
    }, [calculatedTotal, manualTotalOverride]);

    useEffect(() => {
        const itemsTotal = calculatedTotal;
        const receiptTotal = safeParseFloat(editedData.total_amount, 0);
        const difference = Math.abs(itemsTotal - receiptTotal);

        // Only show mismatch if both totals are > 0 to avoid false positives for empty receipts
        if (difference > 1.00 && itemsTotal > 0 && receiptTotal > 0 && !totalMismatchShown) {
            setTotalMismatchShown(true);
        } else if (difference <= 1.00 && totalMismatchShown) {
            setTotalMismatchShown(false);
        }
    }, [calculatedTotal, editedData.total_amount, totalMismatchShown]);

    // Conditional return for invalid data, placed AFTER all hooks have been declared
    if (!data || typeof data !== 'object') {
        return (
            <Card className="border-red-500 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-red-600">
                        <AlertCircle className="w-5 h-5" />
                        Error Loading Receipt
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-4">
                    <p className="text-red-600">Invalid or corrupted receipt data received. Please try scanning again.</p>
                    <Button onClick={onCancel} className="mt-4">Go Back</Button>
                </CardContent>
            </Card>
        );
    }

    const updateReceiptField = (field, value) => {
        setEditedData(prev => ({ ...prev, [field]: value }));
    };

    const handleFieldChange = (e) => {
        const { name, value } = e.target;
        updateReceiptField(name, value);
    };

    const setItemApprovalState = (index, state) => {
        setEditedData(prev => {
            const newItems = [...prev.items];
            if (!newItems[index]) return prev; // Safety check
            newItems[index] = {
                ...newItems[index],
                approval_state: state,
                approved_at: new Date().toISOString()
            };
            const vatCalculation = calculateReceiptVAT(newItems); // Recalculate VAT if state changes, as it might affect other items indirectly (e.g. if an item is now considered valid for VAT)
            return {
                ...prev,
                items: vatCalculation.itemsWithVAT,
                total_discounts: calculateTotalDiscounts(vatCalculation.itemsWithVAT),
                total_vat: vatCalculation.totalVAT,
                vat_breakdown: {
                    zero_rate: vatCalculation.vatBreakdown.zero.amount,
                    reduced_rate: vatCalculation.vatBreakdown.reduced.amount,
                    standard_rate: vatCalculation.vatBreakdown.standard.amount
                }
            };
        });
    };

    const updateItem = (index, field, value) => {
        setEditedData(prev => {
            const newItems = [...prev.items];
            if (!newItems[index]) return prev; // Safety check

            const oldValue = newItems[index][field];

            if (field === 'quantity') {
                const numValue = safeParseFloat(value, '');
                newItems[index] = {
                    ...newItems[index],
                    [field]: numValue,
                    isNew: false
                };
            } else if (field === 'unit_price' || field === 'total_price' || field === 'discount_applied') {
                newItems[index] = {
                    ...newItems[index],
                    [field]: safeParseFloat(value, ''),
                    isNew: false
                };
            } else {
                newItems[index] = {
                    ...newItems[index],
                    [field]: value,
                    isNew: false
                };
            }

            const isValueChanged = (typeof oldValue === 'number' && typeof value === 'string')
                ? (oldValue !== safeParseFloat(value))
                : (oldValue !== value);

            if (isValueChanged && newItems[index].approval_state !== 'manual_add') {
                newItems[index].approval_state = 'corrected';
                newItems[index].corrected_at = new Date().toISOString();
            }

            const finalQuantityForCalc = safeParseFloat(newItems[index].quantity, 0);
            const finalUnitPriceForCalc = safeParseFloat(newItems[index].unit_price, 0);
            const finalDiscountAppliedForCalc = safeParseFloat(newItems[index].discount_applied, 0);

            newItems[index].total_price = Math.round(Math.max(0, (finalQuantityForCalc * finalUnitPriceForCalc) - finalDiscountAppliedForCalc) * 100) / 100;

            const vatCalculation = calculateReceiptVAT(newItems);

            return {
                ...prev,
                items: vatCalculation.itemsWithVAT,
                total_discounts: calculateTotalDiscounts(vatCalculation.itemsWithVAT),
                total_vat: vatCalculation.totalVAT,
                vat_breakdown: {
                    zero_rate: vatCalculation.vatBreakdown.zero.amount,
                    reduced_rate: vatCalculation.vatBreakdown.reduced.amount,
                    standard_rate: vatCalculation.vatBreakdown.standard.amount
                }
            };
        });
    };

    const handleQuantityBlur = (index) => {
        setEditedData(prev => {
            const newItems = [...prev.items];
            if (!newItems[index]) return prev; // Safety check
            let currentItem = { ...newItems[index] };

            const currentQuantity = safeParseFloat(currentItem.quantity);

            if (isNaN(currentQuantity) || currentQuantity <= 0) {
                currentItem.quantity = 1;

                const totalPrice = safeParseFloat(currentItem.total_price, 0);
                currentItem.unit_price = Math.round((totalPrice / 1) * 100) / 100;
            }

            newItems[index] = currentItem;

            if (newItems[index].approval_state !== 'manual_add' && (isNaN(currentQuantity) || currentQuantity <= 0)) {
                newItems[index].approval_state = 'corrected';
                newItems[index].corrected_at = new Date().toISOString();
            }

            const vatCalculation = calculateReceiptVAT(newItems);

            return {
                ...prev,
                items: vatCalculation.itemsWithVAT,
                total_discounts: calculateTotalDiscounts(vatCalculation.itemsWithVAT),
                total_vat: vatCalculation.totalVAT,
                vat_breakdown: {
                    zero_rate: vatCalculation.vatBreakdown.zero.amount,
                    reduced_rate: vatCalculation.vatBreakdown.reduced.amount,
                    standard_rate: vatCalculation.vatBreakdown.standard.amount
                }
            };
        });
    };

    const addItem = () => {
        const newItem = {
            name: '',
            category: 'other',
            quantity: 1,
            unit_price: 0,
            total_price: 0,
            canonical_name: '',
            brand: '',
            pack_size_value: null,
            pack_size_unit: null,
            price_per_unit: 0,
            discount_applied: 0,
            offer_description: '',
            is_own_brand: false,
            confidence_score: 5,
            isNew: true,
            approval_state: 'manual_add',
            added_at: new Date().toISOString(),
            vat_rate: 0, // Default to 0% for new items
            vat_amount: 0
        };

        setEditedData(prev => {
            const updatedItems = [...(prev.items || []), newItem];
            const vatCalculation = calculateReceiptVAT(updatedItems);

            return {
                ...prev,
                items: vatCalculation.itemsWithVAT,
                total_discounts: calculateTotalDiscounts(vatCalculation.itemsWithVAT),
                total_vat: vatCalculation.totalVAT,
                vat_breakdown: {
                    zero_rate: vatCalculation.vatBreakdown.zero.amount,
                    reduced_rate: vatCalculation.vatBreakdown.reduced.amount,
                    standard_rate: vatCalculation.vatBreakdown.standard.amount
                }
            };
        });

        setTimeout(() => {
            if (newItemRef.current) {
                newItemRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                const firstInput = newItemRef.current.querySelector('input');
                if (firstInput) {
                    firstInput.focus();
                }
            }
        }, 100);
    };

    const removeItem = (index) => {
        setEditedData(prev => {
            const newItems = prev.items.filter((_, i) => i !== index);
            const vatCalculation = calculateReceiptVAT(newItems);

            return {
                ...prev,
                items: vatCalculation.itemsWithVAT,
                total_discounts: calculateTotalDiscounts(vatCalculation.itemsWithVAT),
                total_vat: vatCalculation.totalVAT,
                vat_breakdown: {
                    zero_rate: vatCalculation.vatBreakdown.zero.amount,
                    reduced_rate: vatCalculation.vatBreakdown.reduced.amount,
                    standard_rate: vatCalculation.vatBreakdown.standard.amount
                }
            };
        });
    };

    const handleManualTotalChange = (value) => {
        const newTotal = safeParseFloat(value, NaN);
        if (!isNaN(newTotal)) {
            setManualTotalOverride(newTotal);
            setEditedData(prev => ({
                ...prev,
                total_amount: newTotal
            }));
        } else {
            setManualTotalOverride(null);
            setEditedData(prev => ({
                ...prev,
                total_amount: ''
            }));
        }
    };

    const resetToCalculatedTotal = () => {
        setManualTotalOverride(null);
        setEditedData(prev => ({
            ...prev,
            total_amount: calculatedTotal
        }));
    };

    const handleVATRateChange = (index, newRate) => {
        setEditedData(prev => {
            const updatedItems = [...prev.items];
            if (!updatedItems[index]) return prev; // Safety check
            updatedItems[index] = {
                ...updatedItems[index],
                vat_rate: safeParseFloat(newRate, 0)
            };

            const vatCalculation = calculateReceiptVAT(updatedItems);
            return {
                ...prev,
                items: vatCalculation.itemsWithVAT,
                total_vat: vatCalculation.totalVAT,
                vat_breakdown: {
                    zero_rate: vatCalculation.vatBreakdown.zero.amount,
                    reduced_rate: vatCalculation.vatBreakdown.reduced.amount,
                    standard_rate: vatCalculation.vatBreakdown.standard.amount
                }
            };
        });
    };

    const getDebugInfo = () => {
        const itemBreakdown = editedData.items?.map((item, i) => ({
            index: i,
            name: item.name,
            total_price: safeParseFloat(item.total_price, 0),
            vat_amount: safeParseFloat(item.vat_amount, 0),
            vat_rate: item.vat_rate,
            isValid: !isNaN(safeParseFloat(item.total_price)) && isFinite(safeParseFloat(item.total_price))
        })) || [];

        return {
            totalItems: editedData.items?.length || 0,
            calculatedTotalOfItems: calculatedTotal,
            receiptTotalFromState: safeParseFloat(editedData.total_amount, 0),
            differenceBetweenCalculatedAndReceipt: Math.abs(calculatedTotal - safeParseFloat(editedData.total_amount, 0)),
            itemBreakdown: itemBreakdown,
            totalVAT: editedData.total_vat,
            vatBreakdown: editedData.vat_breakdown
        };
    };

    const bulkApproveVisible = () => {
        setEditedData(prev => {
            const newItems = [...prev.items];
            newItems.forEach((item, index) => {
                if (item.approval_state === 'pending') {
                    newItems[index] = {
                        ...item,
                        approval_state: 'approved',
                        approved_at: new Date().toISOString()
                    };
                }
            });
            const vatCalculation = calculateReceiptVAT(newItems);
            return {
                ...prev,
                items: vatCalculation.itemsWithVAT,
                total_discounts: calculateTotalDiscounts(vatCalculation.itemsWithVAT),
                total_vat: vatCalculation.totalVAT,
                vat_breakdown: {
                    zero_rate: vatCalculation.vatBreakdown.zero.amount,
                    reduced_rate: vatCalculation.vatBreakdown.reduced.amount,
                    standard_rate: vatCalculation.vatBreakdown.standard.amount
                }
            };
        });
    };

    const getApprovalIcon = (state) => {
        switch (state) {
            case 'approved':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'corrected':
                return <Edit className="w-5 h-5 text-orange-600" />;
            case 'manual_add':
                return <Plus className="w-5 h-5 text-blue-600" />;
            default:
                return <Clock className="w-5 h-5 text-slate-400" />;
        }
    };

    const getApprovalStats = () => {
        const items = editedData.items || [];
        const stats = {
            total: items.length,
            approved: items.filter(item => item.approval_state === 'approved').length,
            corrected: items.filter(item => item.approval_state === 'corrected').length,
            manual_add: items.filter(item => item.approval_state === 'manual_add').length,
            pending: items.filter(item => item.approval_state === 'pending').length
        };
        return stats;
    };

    const handleApprove = async () => {
        try {
            console.log("ReceiptPreview: Starting save process...");

            if (!editedData.supermarket?.trim()) {
                alert("Please enter a supermarket name");
                return;
            }

            const parsedTotalAmount = safeParseFloat(editedData.total_amount);
            if (isNaN(parsedTotalAmount) || parsedTotalAmount <= 0) {
                alert("Please enter a valid total amount greater than zero.");
                return;
            }

            const savableItems = (editedData.items || []).filter(item => item.name && item.name.trim().length > 0);

            if (savableItems.length === 0) {
                const confirmEmptySave = window.confirm("No named items in this receipt. Save anyway?");
                if (!confirmEmptySave) {
                    return;
                }
            }

            const finalData = {
                ...editedData,
                total_amount: parsedTotalAmount,
                approval_stats: getApprovalStats(),
                review_duration: data.extraction_start_time ? (Date.now() - new Date(data.extraction_start_time).getTime()) / 1000 : undefined,
                items: savableItems.map(item => {
                    const processedItem = {
                        ...item,
                        quantity: safeParseFloat(item.quantity, 1),
                        unit_price: safeParseFloat(item.unit_price, 0),
                        total_price: safeParseFloat(item.total_price, 0),
                        discount_applied: safeParseFloat(item.discount_applied, 0),
                        pack_size_value: safeParseFloat(item.pack_size_value, null),
                        price_per_unit: safeParseFloat(item.price_per_unit, 0),
                        confidence_score: safeParseFloat(item.confidence_score, 3),
                        is_own_brand: item.is_own_brand ?? false,
                        vat_rate: safeParseFloat(item.vat_rate, 0),
                        vat_amount: safeParseFloat(item.vat_amount, 0),
                        canonical_name: item.canonical_name || item.name || 'Unknown Item',
                        brand: item.brand || '',
                        pack_size_unit: item.pack_size_unit || 'each',
                        category: item.category || 'other',
                        offer_description: item.offer_description || '',
                        approval_state: item.approval_state === 'pending' ? 'approved' : item.approval_state
                    };

                    delete processedItem.isNew;
                    delete processedItem.original_extracted;

                    return processedItem;
                })
            };

            console.log("ReceiptPreview: Cleaned data ready for save:", finalData);
            setProcessing(true); // Indicate processing started
            await onSave(finalData);

            console.log("ReceiptPreview: Save completed successfully");

        } catch (error) {
            console.error("ReceiptPreview: Save failed:", error);
            alert(`Failed to save receipt: ${error.message}`);
        } finally {
            setProcessing(false); // Always reset processing state
        }
    };

    const getCategoryColor = (categoryValue) => {
        const category = CATEGORIES.find(cat => cat.value === categoryValue);
        return category ? category.color : "bg-slate-100 text-slate-800";
    };

    const stats = getApprovalStats();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pb-24 md:pb-6"
        >
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Edit3 className="w-5 h-5 text-emerald-600" />
                        Review & Validate Receipt
                    </CardTitle>
                    <CardDescription>
                        Verify the extracted information and make any corrections needed. VAT is automatically calculated based on item categories.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                    {totalMismatchShown && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Total Mismatch Detected</AlertTitle>
                            <AlertDescription className="space-y-2">
                                <p>Items add up to: {formatCurrency(calculatedTotal, currency)}</p>
                                <p>Receipt total: {formatCurrency(safeParseFloat(editedData.total_amount, 0), currency)}</p>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    <Button size="sm" onClick={resetToCalculatedTotal} variant="outline" className="text-emerald-600 border-emerald-600 hover:bg-emerald-50">
                                        <Plus className="w-4 h-4 mr-1" /> Use Items Total
                                    </Button>
                                    <Button size="sm" onClick={() => setShowTotalDebug(!showTotalDebug)} variant="outline">
                                        {showTotalDebug ? 'Hide' : 'Show'} Debug Info
                                    </Button>
                                </div>
                                {showTotalDebug && (
                                    <div className="mt-2 p-2 bg-slate-100 rounded text-xs overflow-auto max-h-40">
                                        <pre className="whitespace-pre-wrap">{JSON.stringify(getDebugInfo(), null, 2)}</pre>
                                    </div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <Label htmlFor="supermarket" className="text-xs sm:text-sm">Supermarket</Label>
                            <Input
                                id="supermarket"
                                name="supermarket"
                                value={editedData.supermarket || ''}
                                onChange={handleFieldChange}
                                placeholder="e.g. Lidl, Tesco, Sainsbury's"
                                className="mt-1 text-sm"
                            />
                        </div>
                        <div>
                            <Label htmlFor="store_location" className="text-xs sm:text-sm">Store Location</Label>
                            <Input
                                id="store_location"
                                name="store_location"
                                value={editedData.store_location || ''}
                                onChange={handleFieldChange}
                                placeholder="e.g. Manchester City Centre"
                                className="mt-1 text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="purchase_date" className="text-sm font-medium">Purchase Date</Label>
                            <Input
                                id="purchase_date"
                                name="purchase_date"
                                type="date"
                                value={editedData.purchase_date || ''}
                                onChange={handleFieldChange}
                                className="mt-1 text-base"
                            />
                        </div>
                        <div>
                            <Label htmlFor="receipt-total" className="text-sm font-medium">Receipt Total</Label>
                            <Input
                                id="receipt-total"
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                value={editedData.total_amount || ''}
                                onChange={(e) => handleManualTotalChange(e.target.value)}
                                className="font-semibold mt-1 text-base"
                                placeholder="0.00"
                                onFocus={(e) => e.target.select()}
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</Label>
                        <Input
                            id="notes"
                            name="notes"
                            value={editedData.notes || ''}
                            onChange={handleFieldChange}
                            placeholder="Add any notes about this purchase..."
                            className="mt-1 text-base"
                        />
                    </div>

                    {/* Shrinkflation Disclaimer */}
                    <Alert variant="warning" className="bg-yellow-50 border border-yellow-200 text-yellow-800">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Heads Up on Pricing!</AlertTitle>
                        <AlertDescription>
                            Be mindful of pack sizes and prices. Sometimes prices stay the same but product quantity decreases (shrinkflation). Double-check the unit price where possible.
                        </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-600">
                                {formatCurrency(calculatedTotal, currency)}
                            </div>
                            <div className="text-sm text-slate-600">Items Total</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-slate-800">
                                {editedData.items?.length || 0}
                            </div>
                            <div className="text-sm text-slate-600">Items</div>
                        </div>
                    </div>

                    {editedData.total_vat > 0 && (
                        <div className="border-t pt-4">
                            <Button
                                variant="ghost"
                                onClick={() => setShowVATDetails(!showVATDetails)}
                                className="w-full flex items-center justify-between px-0 py-2 h-auto"
                            >
                                <span className="font-semibold">VAT Summary</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-emerald-600">{formatCurrency(editedData.total_vat, currency)}</span>
                                    {showVATDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                            </Button>

                            {showVATDetails && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-4 space-y-2 text-sm overflow-hidden"
                                >
                                    {editedData.vat_breakdown?.zero_rate > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Zero Rate (0%):</span>
                                            <span className="font-medium">{formatCurrency(editedData.vat_breakdown.zero_rate, currency)}</span>
                                        </div>
                                    )}
                                    {editedData.vat_breakdown?.reduced_rate > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Reduced Rate (5%):</span>
                                            <span className="font-medium">{formatCurrency(editedData.vat_breakdown.reduced_rate, currency)}</span>
                                        </div>
                                    )}
                                    {editedData.vat_breakdown?.standard_rate > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Standard Rate (20%):</span>
                                            <span className="font-medium">{formatCurrency(editedData.vat_breakdown.standard_rate, currency)}</span>
                                        </div>
                                    )}
                                    <div className="pt-2 border-t">
                                        <p className="text-xs text-slate-500">
                                            VAT is automatically calculated based on UK tax rates. Most basic foods are zero-rated,
                                            while confectionery, soft drinks, and household items are standard-rated (20%).
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    )}

                    <div>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Items ({stats.total})</h3>
                                <div className="flex flex-wrap gap-2 text-sm">
                                    <Badge variant="outline" className="text-green-700 border-green-300">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        {stats.approved} Approved
                                    </Badge>
                                    <Badge variant="outline" className="text-orange-700 border-orange-300">
                                        <Edit className="w-3 h-3 mr-1" />
                                        {stats.corrected} Corrected
                                    </Badge>
                                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                                        <Plus className="w-3 h-3 mr-1" />
                                        {stats.manual_add} Added
                                    </Badge>
                                    {stats.pending > 0 && (
                                        <Badge variant="outline" className="text-slate-700 border-slate-300">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {stats.pending} Pending
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {stats.pending > 0 && (
                                    <Button
                                        onClick={bulkApproveVisible}
                                        size="sm"
                                        variant="outline"
                                        className="text-green-600 border-green-600 hover:bg-green-50"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Approve All Pending
                                    </Button>
                                )}
                                <Button
                                    onClick={addItem}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Item
                                </Button>
                            </div>
                        </div>

                        {editedData.items?.length > 0 ? (
                            <>
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                    {editedData.items?.map((item, index) => (
                                        <motion.div
                                            key={index}
                                            ref={item.isNew ? newItemRef : null}
                                            className={`p-4 rounded-lg border transition-all duration-200 ${
                                                item.approval_state === 'approved' ? 'bg-green-50 border-green-200' :
                                                    item.approval_state === 'corrected' ? 'bg-orange-50 border-orange-200' :
                                                        item.approval_state === 'manual_add' ? 'bg-blue-50 border-blue-200' :
                                                            item.isNew ? 'bg-blue-50 border-blue-200' :
                                                                'bg-slate-50 border-slate-200'
                                            }`}
                                            initial={item.isNew ? { backgroundColor: '#eff6ff', scale: 1.02 } : false}
                                            animate={item.isNew ? { backgroundColor: '#f8fafc', scale: 1 } : false}
                                            transition={{ duration: 1 }}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    {getApprovalIcon(item.approval_state)}
                                                    <div className="text-sm font-medium text-slate-600">
                                                        {item.approval_state === 'approved' && 'Approved'}
                                                        {item.approval_state === 'corrected' && 'Corrected'}
                                                        {item.approval_state === 'manual_add' && 'Added'}
                                                        {item.approval_state === 'pending' && 'Needs Review'}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {item.approval_state === 'pending' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setItemApprovalState(index, 'approved')}
                                                            className="text-green-600 hover:bg-green-100 h-8 px-2"
                                                            title="Approve as correct"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </Button>
                                                    )}

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeItem(index)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                                                        title="Remove item"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <Label className="text-sm font-medium text-slate-700">Item Name</Label>
                                                    <Input
                                                        value={item.name || ''}
                                                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                        className={`mt-1 font-medium text-base ${
                                                            item.price_warning ? 'border-orange-300 bg-orange-50' : ''
                                                        }`}
                                                        placeholder="Item name"
                                                        onFocus={(e) => {
                                                            if (item.approval_state === 'pending') {
                                                                e.target.select();
                                                            }
                                                        }}
                                                    />
                                                    {item.price_warning && (
                                                        <p className="text-xs text-orange-600 mt-1">{item.price_warning}</p>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    <div>
                                                        <Label className="text-sm font-medium text-slate-700">Qty</Label>
                                                        <Input
                                                            type="number"
                                                            inputMode="numeric"
                                                            min="0"
                                                            step="1"
                                                            value={item.quantity === '' ? '' : (item.quantity || '')}
                                                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                            onBlur={() => handleQuantityBlur(index)}
                                                            className="text-center mt-1 text-base"
                                                            placeholder="1"
                                                            onFocus={(e) => e.target.select()}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm font-medium text-slate-700">Unit £</Label>
                                                        <Input
                                                            type="number"
                                                            inputMode="decimal"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.unit_price || ''}
                                                            onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                                            placeholder="0.00"
                                                            className="mt-1 text-base"
                                                            onFocus={(e) => e.target.select()}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm font-medium text-slate-700">Total £</Label>
                                                        <Input
                                                            type="number"
                                                            inputMode="decimal"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.total_price || ''}
                                                            onChange={(e) => updateItem(index, 'total_price', e.target.value)}
                                                            className="font-semibold mt-1 text-base"
                                                            placeholder="0.00"
                                                            onFocus={(e) => e.target.select()}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3">
                                                    <div>
                                                        <Label className="text-sm font-medium text-slate-700">Category</Label>
                                                        <Select
                                                            value={item.category || 'other'}
                                                            onValueChange={(value) => updateItem(index, 'category', value)}
                                                        >
                                                            <SelectTrigger className="mt-1">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {CATEGORIES.map((category) => (
                                                                    <SelectItem key={category.value} value={category.value}>
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge variant="outline" className={`${category.color} text-xs`}>
                                                                                {category.label}
                                                                            </Badge>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-100 rounded-lg gap-2">
                                                        <div>
                                                            <Label className="text-sm font-medium text-slate-700">Brand Type</Label>
                                                            <p className="text-xs text-slate-500 mt-1">
                                                                {item.is_own_brand ? "Store's own-brand product" : "National/international brand"}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant={!item.is_own_brand ? "default" : "outline"}
                                                                onClick={() => updateItem(index, 'is_own_brand', false)}
                                                                className="text-xs"
                                                            >
                                                                National Brand
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant={item.is_own_brand ? "default" : "outline"}
                                                                onClick={() => updateItem(index, 'is_own_brand', true)}
                                                                className={`${item.is_own_brand ? "bg-slate-600 hover:bg-slate-700 text-white" : ""} text-xs`}
                                                            >
                                                                Own Brand
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-2 mt-3 text-xs">
                                                    <div>
                                                        <Label className="font-medium text-slate-700">Discount Amount</Label>
                                                        <Input
                                                            type="number"
                                                            inputMode="decimal"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.discount_applied || 0}
                                                            onChange={(e) => updateItem(index, 'discount_applied', safeParseFloat(e.target.value, 0))}
                                                            placeholder="0.00"
                                                            onFocus={(e) => e.target.select()}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="font-medium text-slate-700">Offer Description</Label>
                                                        <Input
                                                            value={item.offer_description || ''}
                                                            onChange={(e) => updateItem(index, 'offer_description', e.target.value)}
                                                            placeholder="e.g. 3 for 2"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <Label className="text-sm font-medium text-slate-700">VAT Rate</Label>
                                                        <Select
                                                            value={String(item.vat_rate || 0)}
                                                            onValueChange={(value) => handleVATRateChange(index, value)}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="0">0% (Zero-rated)</SelectItem>
                                                                <SelectItem value="5">5% (Reduced)</SelectItem>
                                                                <SelectItem value="20">20% (Standard)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm font-medium text-slate-700">VAT Amount</Label>
                                                        <div className="h-8 flex items-center px-3 border rounded-md bg-slate-50 text-sm">
                                                            {formatCurrency(item.vat_amount || 0, currency)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {(item.canonical_name || item.brand) && (
                                                    <div className="space-y-3 mt-3">
                                                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
                                                            <div className="font-medium text-blue-800 mb-1">Product Data:</div>
                                                            {item.canonical_name && (<p className="text-blue-700">Product: {item.canonical_name}</p>)}
                                                            {item.brand && (<p className="text-blue-700">Brand: {item.brand}</p>)}
                                                            {item.pack_size_value !== null && item.pack_size_unit && (
                                                                <p className="text-blue-700">
                                                                    Size: {item.pack_size_value}{item.pack_size_unit}
                                                                    {item.price_per_unit !== undefined && item.price_per_unit !== null && (
                                                                        <span className="ml-1">({formatCurrency(item.price_per_unit, currency)}/
                                                                            {item.pack_size_unit === 'g' ? 'kg' : item.pack_size_unit === 'ml' ? 'l' : item.pack_size_unit})</span>
                                                                    )}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {item.confidence_score && item.confidence_score < 3 && (
                                                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm mt-3">
                                                        <div className="font-medium text-yellow-800 mb-1">⚠️ Low Confidence Price Match</div>
                                                        <p className="text-yellow-700">Please verify this price is correct for this item</p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="pt-6 border-t mt-6 space-y-4">
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-emerald-800 font-semibold text-lg">Final Total:</span>
                                            <span className="text-emerald-900 font-bold text-2xl">
                                                {formatCurrency(editedData.total_amount, currency)}
                                            </span>
                                        </div>
                                        <p className="text-emerald-700 text-sm mt-1">
                                            This is the amount that will be saved to your records
                                        </p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-slate-500">
                                <p className="mb-4">No items detected</p>
                                <Button onClick={addItem} variant="outline" size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add First Item
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t p-4 shadow-lg md:relative md:bg-transparent md:border-0 md:shadow-none md:p-0 z-50">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={processing}
                        className="w-full sm:w-auto order-2 sm:order-1"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    <Button
                        onClick={handleApprove}
                        disabled={processing}
                        className="w-full sm:w-auto order-1 sm:order-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3 text-lg font-semibold"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                Saving Receipt...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5 mr-3" />
                                Save Receipt
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
