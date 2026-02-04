import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';


Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { receiptId, imageUrls, storeName, totalAmount, householdId, userEmail } = await req.json();

        if (!receiptId || !imageUrls || !householdId || !userEmail) {
            return Response.json({ 
                error: 'Missing required parameters' 
            }, { status: 400 });
        }

        console.log(`[Background Processing] Starting for receipt ${receiptId}`);
        console.log('[Background Processing] GI_FORCE_TABLES active');

        try {
            // Default to AnalyzeDocument with Tables for better long receipt handling
            const suggestedModel = 'AnalyzeDocumentTables';
            console.log(`[Background Processing] Using model: ${suggestedModel}`);
            
            // Step 2: Invoke OCR (prefer Vercel endpoint if configured)
            let ocrResponse;
            const vercelOcrEndpoint = Deno.env.get('VERCEL_OCR_ENDPOINT');
            if (vercelOcrEndpoint) {
                console.log(`[Background Processing] Invoking Vercel OCR for receipt ${receiptId}`);
                const response = await fetch(vercelOcrEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageUrls,
                        storeName: storeName || '',
                        totalAmount: totalAmount || 0,
                        modelType: suggestedModel
                    })
                });
                ocrResponse = { data: await response.json() };
            } else {
                console.log(`[Background Processing] Invoking textractOCR for receipt ${receiptId} with model: ${suggestedModel}`);
                ocrResponse = await base44.asServiceRole.functions.invoke('textractOCR', {
                    imageUrls: imageUrls,
                    storeName: storeName || '',
                    totalAmount: totalAmount || 0,
                    modelType: suggestedModel
                });
            }

            if (!ocrResponse || !ocrResponse.data || !ocrResponse.data.success) {
                console.error(`[Background Processing] OCR failed for receipt ${receiptId}:`, ocrResponse);
                throw new Error('OCR processing failed');
            }

            const { 
                items, 
                extracted_store_name, 
                extracted_store_location, 
                extracted_purchase_date,
                total_discounts,
                reconciliation,
                parseQuality
            } = ocrResponse.data;
            
            console.log(`[Background Processing] Extracted ${items?.length || 0} items, confidence: ${parseQuality?.confidenceScore || 0}`);

            if (!items || items.length === 0 || (parseQuality && parseQuality.confidenceScore < 50)) {
                console.warn(`[Background Processing] Extraction failed or confidence too low for receipt ${receiptId}`);
                await base44.asServiceRole.entities.Receipt.update(receiptId, {
                    validation_status: 'failed_processing',
                    items: []
                });
                
                return Response.json({ 
                    success: false, 
                    message: 'OCR failed to extract items - marked as failed',
                    receiptId 
                });
            }
            
            // Metadata replacement logic with confidence heuristics
            let finalStoreName = storeName || '';
            let finalStoreLocation = '';
            let finalPurchaseDate = null;
            let finalTotalAmount = totalAmount || 0;
            
            // Store name: prioritize OCR extraction, fallback to provided name
            const storeNameConfident = extracted_store_name && 
                                        extracted_store_name.length >= 3 && 
                                        extracted_store_name !== 'GBP' && 
                                        !/^\d+$/.test(extracted_store_name) &&
                                        /[a-zA-Z]/.test(extracted_store_name);
            
            // Always use OCR-extracted name if confident, or if provided name is blank/Unknown
            if (storeNameConfident) {
                finalStoreName = extracted_store_name;
                console.log(`[Background Processing] Using OCR store name: ${finalStoreName}`);
            } else if (!finalStoreName || finalStoreName === 'Unknown Store') {
                // Fallback: use OCR even if not confident, or keep Unknown Store
                finalStoreName = extracted_store_name || finalStoreName || 'Unknown Store';
                console.log(`[Background Processing] Using fallback store name: ${finalStoreName}`);
            }
            
            // Store location: fill if blank, replace if confident
            const locationConfident = extracted_store_location && 
                                       extracted_store_location.length >= 3 && 
                                       /[a-zA-Z]/.test(extracted_store_location);
            if (locationConfident) {
                finalStoreLocation = extracted_store_location;
            }
            
            // Purchase date: fill if blank, replace if confident
            if (extracted_purchase_date && /\d{2}\/\d{2}\/\d{2,4}/.test(extracted_purchase_date)) {
                const parts = extracted_purchase_date.split('/');
                if (parts.length === 3) {
                    const day = parts[0];
                    const month = parts[1];
                    let year = parts[2];
                    if (year.length === 2) {
                        year = '20' + year;
                    }
                    finalPurchaseDate = `${year}-${month}-${day}`;
                }
            }
            
            // Total amount: fill if blank with OCR extracted total
            if (reconciliation && reconciliation.extracted_receipt_total && 
                reconciliation.extracted_receipt_total > 0 && 
                reconciliation.extracted_receipt_total < 2000) {
                if (!finalTotalAmount || finalTotalAmount === 0) {
                    finalTotalAmount = reconciliation.extracted_receipt_total;
                    console.log(`[Background Processing] Filled total amount with OCR: £${finalTotalAmount}`);
                }
            }

            // Step 3: Update receipt with extracted items and reconciliation data
            console.log(`[Background Processing] Updating receipt ${receiptId} with ${items.length} items`);
            
            const updateData = {
                items: items,
                supermarket: finalStoreName,
                total_discounts: total_discounts || 0,
                validation_status: 'processing_background',
                total_amount: finalTotalAmount
            };
            
            if (finalStoreLocation) {
                updateData.store_location = finalStoreLocation;
            }
            if (finalPurchaseDate) {
                updateData.purchase_date = finalPurchaseDate;
            }
            
            // Add reconciliation fields
            if (reconciliation) {
                if (reconciliation.extracted_receipt_total !== null && reconciliation.extracted_receipt_total !== undefined) {
                    updateData.ocr_receipt_total = reconciliation.extracted_receipt_total;
                }
                if (reconciliation.extracted_receipt_item_count !== null && reconciliation.extracted_receipt_item_count !== undefined) {
                    updateData.ocr_receipt_item_count = reconciliation.extracted_receipt_item_count;
                }
                if (reconciliation.computed_items_total_excl_discounts !== null && reconciliation.computed_items_total_excl_discounts !== undefined) {
                    updateData.computed_total_excl_discounts = reconciliation.computed_items_total_excl_discounts;
                }
                if (reconciliation.computed_items_count_excl_discounts !== null && reconciliation.computed_items_count_excl_discounts !== undefined) {
                    updateData.computed_count_excl_discounts = reconciliation.computed_items_count_excl_discounts;
                }
                if (reconciliation.total_delta !== null && reconciliation.total_delta !== undefined) {
                    updateData.ocr_total_delta = reconciliation.total_delta;
                }
                updateData.ocr_total_mismatch = reconciliation.total_mismatch || false;
                
                if (reconciliation.count_delta !== null && reconciliation.count_delta !== undefined) {
                    updateData.ocr_count_delta = reconciliation.count_delta;
                }
                updateData.ocr_count_mismatch = reconciliation.count_mismatch || false;
                
                console.log(`[Background Processing] Mismatch flags - Total: ${updateData.ocr_total_mismatch}, Count: ${updateData.ocr_count_mismatch}`);
            }
            
            await base44.asServiceRole.entities.Receipt.update(receiptId, updateData);

            console.log(`[Background Processing] OCR complete for receipt ${receiptId}. Starting LLM enhancement...`);

            // Step 4: Invoke LLM enhancement
            try {
                const enhancementResponse = await base44.asServiceRole.functions.invoke('generateReceiptInsightsInBackground', {
                    receiptId: receiptId
                });

                console.log(`[Background Processing] Enhancement response for receipt ${receiptId}:`, enhancementResponse?.data);
                
                if (enhancementResponse && enhancementResponse.data && enhancementResponse.data.success) {
                    console.log(`[Background Processing] Successfully enhanced receipt ${receiptId} - status now review_insights`);
                } else {
                    console.warn(`[Background Processing] Enhancement may have failed for receipt ${receiptId}:`, enhancementResponse);
                    // If enhancement fails, mark as failed_processing
                    await base44.asServiceRole.entities.Receipt.update(receiptId, {
                        validation_status: 'failed_processing'
                    });
                }
            } catch (enhancementError) {
                console.error(`[Background Processing] Enhancement error for receipt ${receiptId}:`, enhancementError);
                // Mark as failed_processing if LLM enhancement fails
                await base44.asServiceRole.entities.Receipt.update(receiptId, {
                    validation_status: 'failed_processing'
                });
            }

            // Update household's monthly scan count
            try {
                const households = await base44.asServiceRole.entities.Household.filter({ id: householdId });
                if (households && households.length > 0) {
                    const household = households[0];
                    const currentHouseholdCount = household.household_monthly_scan_count || 0;
                    const newCount = currentHouseholdCount + 1;
                    await base44.asServiceRole.entities.Household.update(householdId, {
                        household_monthly_scan_count: newCount
                    });
                    console.log(`[Background Processing] Updated household scan count to ${newCount}`);

                    // Tag user in Brevo if first scan completed
                    if (currentHouseholdCount === 0) {
                        try {
                            await base44.asServiceRole.functions.invoke('updateBrevoContact', {
                                email: userEmail,
                                tags: ['first_scan_completed']
                            });
                            console.log(`[Background Processing] User ${userEmail} tagged in Brevo: first_scan_completed`);
                        } catch (brevoError) {
                            console.warn("[Background Processing] Brevo tagging failed (non-critical):", brevoError);
                        }
                    }
                }
            } catch (countError) {
                console.warn(`[Background Processing] Failed to update household scan count:`, countError);
            }

            return Response.json({ 
                success: true, 
                message: 'Receipt processed and enhanced',
                receiptId,
                itemsExtracted: items.length
            });

        } catch (processingError) {
            console.error(`[Background Processing] Error for receipt ${receiptId}:`, processingError);
            
            // Update receipt to failed status
            await base44.asServiceRole.entities.Receipt.update(receiptId, {
                validation_status: 'failed_processing'
            });

            return Response.json({ 
                success: false, 
                error: processingError.message,
                receiptId 
            }, { status: 500 });
        }

    } catch (error) {
        console.error('[Background Processing] Function error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});
