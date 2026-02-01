import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { 
    TextractClient, 
    AnalyzeDocumentCommand 
} from 'npm:@aws-sdk/client-textract@3.525.0';

// Helper function to parse price values with improved decimal handling
function parsePriceValue(valueText) {
    if (!valueText) return 0;
    
    // Preserve leading minus sign
    const isNegative = valueText.trim().startsWith('-');
    let cleaned = valueText.replace(/[£$€\s]/g, '');
    
    if (/^-?\d+$/.test(cleaned) && cleaned.replace('-', '').length >= 3) {
        const absValue = cleaned.replace('-', '');
        const intPart = absValue.slice(0, -2);
        const decPart = absValue.slice(-2);
        cleaned = `${isNegative ? '-' : ''}${intPart || '0'}.${decPart}`;
    } else if (/^-?\d+[,]\d+$/.test(cleaned)) {
        cleaned = cleaned.replace(',', '.');
    } else {
        // Don't strip minus sign
        cleaned = cleaned.replace(/[^\d.-]/g, '');
    }
    
    const parsed = parseFloat(cleaned);
    
    if (!isNaN(parsed) && Math.abs(parsed) > 1000 && !isNegative) {
        return parsed / 100;
    }
    
    return isNaN(parsed) ? 0 : parsed;
}

// Helper to check if item is discount-only line
function isDiscountOnly(item) {
    if (item.total_price < 0) return true;
    const lowerName = (item.name || '').toLowerCase();
    return /discount|saving|offer|clubcard|nectar|more points|voucher|promo/i.test(lowerName);
}

// Helper to check if line is a discount candidate
function isDiscountCandidate(name, price) {
    if (price < 0) return true;
    const lowerName = (name || '').toLowerCase();
    return /discount|saving|offer|clubcard|nectar|more points|voucher|promo/i.test(lowerName);
}

// Helper to round to 2 decimals
function round2(num) {
    return Math.round(num * 100) / 100;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { imageUrls, storeName, totalAmount } = await req.json();

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'No image URLs provided' 
            }, { status: 400 });
        }
        
        console.log('[textractOCR] Using AnalyzeDocument with TABLES');

        const textractClient = new TextractClient({
            region: Deno.env.get('AWS_REGION'),
            credentials: {
                accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
                secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
            },
        });

        const allItems = [];
        let extractedStoreName = '';
        let extractedLocation = '';
        let extractedTotalDiscounts = 0;
        let extractedPurchaseDate = null;
        let extractedReceiptTotal = null;
        let extractedReceiptItemCount = null;
        
        let totalTableItems = 0;
        let totalLineItems = 0;
        let totalRejectedLines = 0;

        for (const imageUrl of imageUrls) {
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                console.error(`Failed to fetch image: ${imageUrl}`);
                continue;
            }

            const imageBuffer = await imageResponse.arrayBuffer();
            const imageBytes = new Uint8Array(imageBuffer);

            // Always use AnalyzeDocument with TABLES
            const command = new AnalyzeDocumentCommand({
                Document: { Bytes: imageBytes },
                FeatureTypes: ['TABLES']
            });
            const textractResponse = await textractClient.send(command);

            if (!textractResponse.Blocks) continue;
            
            const blocks = textractResponse.Blocks;
            const lineBlocks = blocks.filter(b => b.BlockType === 'LINE' && b.Text);
            
            // ===== 1) Identify footer start for sectioning =====
            let footerStartIndex = lineBlocks.length;
            for (let i = 0; i < lineBlocks.length; i++) {
                const text = (lineBlocks[i].Text || '').toLowerCase();
                if (/total\b|goods:|subtotal|vat|card number|authorisation|approved|contactless|merchant id|terminal id|eft no|change|debit|mastercard|visa|amount due/.test(text)) {
                    footerStartIndex = i;
                    break;
                }
            }
            
            const headerLines = lineBlocks.slice(0, Math.min(5, lineBlocks.length));
            const bodyLines = lineBlocks.slice(0, footerStartIndex);
            const footerLines = lineBlocks.slice(footerStartIndex);
            
            // ===== 2) Extract metadata from ALL lines =====
            // Store name from header (always try to extract, prioritize OCR)
            if (!extractedStoreName) {
                for (const line of headerLines) {
                    const text = (line.Text || '').trim();
                    if (text.length > 2 && text !== 'GBP' && /[a-zA-Z]/.test(text) && !/^\d+$/.test(text) &&
                        !text.toLowerCase().includes('receipt') && !text.toLowerCase().includes('tel')) {
                        extractedStoreName = text;
                        break;
                    }
                }
            }
            
            // Fallback to provided storeName if OCR found nothing
            if (!extractedStoreName && storeName && storeName !== 'Unknown Store') {
                extractedStoreName = storeName;
            }
            
            // Store location from header (1-2 lines after store name)
            if (!extractedLocation && headerLines.length > 1) {
                for (let i = 1; i < Math.min(3, headerLines.length); i++) {
                    const text = (headerLines[i].Text || '').trim();
                    if (text.length > 3 && text !== 'GBP' && /[a-zA-Z]/.test(text) && !/^\d+$/.test(text)) {
                        extractedLocation = text;
                        break;
                    }
                }
            }
            
            // Purchase date from all lines
            if (!extractedPurchaseDate) {
                for (const line of lineBlocks) {
                    const match = (line.Text || '').match(/\b(\d{2}\/\d{2}\/\d{2,4})\b/);
                    if (match) {
                        extractedPurchaseDate = match[1];
                        break;
                    }
                }
            }
            
            // Item count from footer
            if (!extractedReceiptItemCount) {
                for (const line of footerLines) {
                    const match = (line.Text || '').match(/\b(\d+)\s+items?\b/i);
                    if (match) {
                        extractedReceiptItemCount = parseInt(match[1], 10);
                        break;
                    }
                }
            }
            
            // Receipt total from footer (scan bottom-up)
            if (!extractedReceiptTotal) {
                for (let i = footerLines.length - 1; i >= 0; i--) {
                    const text = footerLines[i].Text || '';
                    const match1 = text.match(/(total)\s*:?\s*(gbp|£)?\s*(\d+[.,]\d{2})/i);
                    const match2 = text.match(/\btotal\b.*\b(\d+[.,]\d{2})\b/i);
                    if (match1) {
                        extractedReceiptTotal = parsePriceValue(match1[3]);
                        break;
                    } else if (match2) {
                        extractedReceiptTotal = parsePriceValue(match2[1]);
                        break;
                    }
                }
            }

            // ===== 3) TABLE parsing =====
            const tables = blocks.filter(block => block.BlockType === 'TABLE');
            if (tables.length > 0) {
                const rows = blocks.filter(
                    block => block.BlockType === 'CELL' && block.RowIndex !== undefined
                );

                const rowMap = {};
                rows.forEach(cell => {
                    const rowIndex = cell.RowIndex;
                    if (!rowMap[rowIndex]) rowMap[rowIndex] = [];
                    rowMap[rowIndex].push(cell);
                });

                const getText = (cell) => {
                    if (!cell.Relationships) return '';
                    const wordRelationship = cell.Relationships.find(r => r.Type === 'CHILD');
                    if (!wordRelationship) return '';
                    const words = wordRelationship.Ids.map(id => {
                        const wordBlock = blocks.find(b => b.Id === id);
                        return wordBlock?.Text || '';
                    });
                    return words.join(' ').trim();
                };

                Object.keys(rowMap).sort((a, b) => parseInt(a) - parseInt(b)).forEach(rowIndex => {
                    const cells = rowMap[rowIndex].sort((a, b) => a.ColumnIndex - b.ColumnIndex);
                    if (cells.length < 2) return;
                    
                    const cellTexts = cells.map(getText);
                    
                    // Find price column (rightmost with price, skip single letters)
                    let priceIdx = -1;
                    let priceValue = 0;
                    for (let i = cellTexts.length - 1; i >= 0; i--) {
                        const text = cellTexts[i];
                        if (/^[A-Z]$/.test(text)) continue;
                        if (/-?\d+[.,]\d{2}/.test(text)) {
                            const parsed = parsePriceValue(text);
                            if (parsed !== 0 && Math.abs(parsed) < 500) {
                                priceValue = parsed;
                                priceIdx = i;
                                break;
                            }
                        }
                    }
                    
                    if (priceIdx === -1 || priceValue === 0) return;
                    
                    // Find description column (longest non-price text)
                    let description = '';
                    let maxLength = 0;
                    
                    for (let i = 0; i < priceIdx; i++) {
                        const text = cellTexts[i];
                        if (!text || /^\d+$/.test(text) || text.length < 2 || /^[A-Z]$/.test(text)) continue;
                        if (text.length > maxLength) {
                            maxLength = text.length;
                            description = text;
                        }
                    }
                    
                    if (description) {
                        description = description
                            .replace(/^\d{5,}\s*/, '')
                            .replace(/\s+[A-Z]$/, '')
                            .trim();
                    }
                    
                    const lowerDesc = description.toLowerCase();
                    if (!description || 
                        lowerDesc.includes('more points') ||
                        lowerDesc.includes('balance before') ||
                        lowerDesc.includes('card payment') ||
                        lowerDesc.includes('number of items') ||
                        lowerDesc.includes('total') ||
                        lowerDesc.includes('subtotal') ||
                        lowerDesc.includes('change') ||
                        description.length < 3) {
                        return;
                    }

                    // Mark discount candidates
                    const isDiscount = isDiscountCandidate(description, priceValue);

                    allItems.push({
                        name: description,
                        quantity: 1,
                        unit_price: round2(priceValue),
                        total_price: round2(priceValue),
                        discount_applied: 0,
                        offer_description: '',
                        category: 'other',
                        _source: 'table',
                        _geometry: cells[0].Geometry,
                        _is_discount_candidate: isDiscount
                    });
                    totalTableItems++;
                });
            }

            // ===== 4) LINE parsing with multiplier state machine =====
            let pendingMultiplier = null; // {qty, unitPrice}
            
            for (const line of bodyLines) {
                const text = (line.Text || '').trim();
                if (!text || text.length < 2) continue;

                // Skip timestamps/dates
                if (/^\d{2}:\d{2}:\d{2}|^\d{2}\/\d{2}\/\d{4}/.test(text)) continue;
                
                // Check for multiplier patterns
                const fullMultiplier = text.match(/^\s*(\d+)\s*x\s*(\d+[.,]\d{2})\s*$/);
                const qtyOnly = text.match(/^\s*(\d+)\s*x\s*$/);
                const priceOnly = text.match(/^\s*(\d+[.,]\d{2})\s*$/);
                
                if (fullMultiplier) {
                    // Full multiplier line: "3 x 1.50"
                    const qty = parseInt(fullMultiplier[1], 10);
                    const unitPrice = parsePriceValue(fullMultiplier[2]);
                    pendingMultiplier = { qty, unitPrice };
                    continue;
                } else if (qtyOnly) {
                    // Qty-only: "3 x"
                    const qty = parseInt(qtyOnly[1], 10);
                    pendingMultiplier = { qty, unitPrice: null };
                    continue;
                } else if (priceOnly && pendingMultiplier && pendingMultiplier.unitPrice === null) {
                    // Price continuation after "3 x"
                    pendingMultiplier.unitPrice = parsePriceValue(priceOnly[1]);
                    continue;
                }
                
                // Standard item line with price at end (including negatives)
                const priceMatch = text.match(/(-?\d+[.,]\d{2})\s*[A-Z]?\s*$/);
                if (!priceMatch) {
                    pendingMultiplier = null;
                    continue;
                }

                const priceText = priceMatch[1];
                let totalPrice = parsePriceValue(priceText);
                
                if (totalPrice === 0 || Math.abs(totalPrice) > 500) {
                    pendingMultiplier = null;
                    continue;
                }

                let name = text
                    .replace(/^\d+\s+/, '')
                    .replace(/^\d{5,}\s*/, '')
                    .replace(/\s+\d+[.,]\d{2}\s*[A-Z]?\s*$/, '')
                    .replace(/\s+[A-Z]$/, '')
                    .trim();
                
                if (!name || name.length < 2) {
                    pendingMultiplier = null;
                    continue;
                }
                
                const lowerName = name.toLowerCase();
                if (lowerName.includes('store manager') ||
                    lowerName.includes('customer services') ||
                    lowerName.includes('number of items') ||
                    lowerName.includes('balance before') ||
                    lowerName.includes('more card') ||
                    lowerName === 'card' ||
                    /^(tesco|sainsbury|morrisons|aldi|asda|lidl|waitrose|co-op|store|branch)/i.test(lowerName)) {
                    pendingMultiplier = null;
                    totalRejectedLines++;
                    continue;
                }
                
                // Apply pending multiplier if exists
                let qty = 1;
                let unitPrice = totalPrice;
                if (pendingMultiplier && pendingMultiplier.unitPrice) {
                    qty = pendingMultiplier.qty;
                    unitPrice = pendingMultiplier.unitPrice;
                    totalPrice = round2(qty * unitPrice);
                }
                
                // Mark discount candidates
                const isDiscount = isDiscountCandidate(name, totalPrice);

                allItems.push({
                    name,
                    quantity: qty,
                    unit_price: round2(unitPrice),
                    total_price: round2(totalPrice),
                    discount_applied: 0,
                    offer_description: '',
                    category: 'other',
                    _source: 'line',
                    _geometry: line.Geometry,
                    _is_discount_candidate: isDiscount
                });
                totalLineItems++;

                // Reset multiplier after use
                pendingMultiplier = null;
            }
        }

        // ===== 5) Conservative deduplication (TABLE vs LINE overlap only) =====
        const tableItems = allItems.filter(i => i._source === 'table');
        const lineItems = allItems.filter(i => i._source === 'line');
        const finalItems = [...tableItems];
        
        for (const lineItem of lineItems) {
            let isDuplicate = false;
            
            for (const tableItem of tableItems) {
                // Check geometry overlap if available
                if (lineItem._geometry && tableItem._geometry) {
                    const lineTop = lineItem._geometry.BoundingBox?.Top || 0;
                    const tableTop = tableItem._geometry.BoundingBox?.Top || 0;
                    if (Math.abs(lineTop - tableTop) < 0.01) {
                        isDuplicate = true;
                        break;
                    }
                }
                
                // Fallback: name+price match (conservative)
                if (lineItem.name.toLowerCase() === tableItem.name.toLowerCase() &&
                    Math.abs(lineItem.total_price - tableItem.total_price) < 0.01) {
                    isDuplicate = true;
                    break;
                }
            }
            
            if (!isDuplicate) {
                finalItems.push(lineItem);
            }
        }
        
        // ===== 6) Post-processing: Attach discount lines to previous items =====
        const processedItems = [];

        for (let i = 0; i < finalItems.length; i++) {
            const item = finalItems[i];

            // Check if this is a discount line
            if (item._is_discount_candidate || item.total_price < 0) {
                const discountAmount = Math.abs(item.total_price);

                // Find previous non-discount item
                let prevIndex = processedItems.length - 1;
                while (prevIndex >= 0 && processedItems[prevIndex]._was_discount) {
                    prevIndex--;
                }

                if (prevIndex >= 0) {
                    // Attach discount to previous item
                    const prevItem = processedItems[prevIndex];
                    prevItem.discount_applied = round2((prevItem.discount_applied || 0) + discountAmount);
                    prevItem.total_price = round2(prevItem.total_price - discountAmount);

                    // Add offer description
                    const offerText = item.name.replace(/^-/, '').trim();
                    if (prevItem.offer_description) {
                        prevItem.offer_description += '; ' + offerText;
                    } else {
                        prevItem.offer_description = offerText;
                    }

                    console.log(`[textractOCR] Attached discount £${discountAmount} from "${item.name}" to previous item "${prevItem.name}"`);
                    // Don't add this discount line to processedItems
                } else {
                    // No previous item - accumulate to total discounts
                    extractedTotalDiscounts += discountAmount;
                    console.log(`[textractOCR] Unallocated discount: £${discountAmount}`);
                }
            } else {
                // Regular item - add to processed list
                processedItems.push(item);
            }
        }

        // Clean up internal fields
        processedItems.forEach(item => {
            delete item._source;
            delete item._geometry;
            delete item._is_discount_candidate;
            delete item._was_discount;
        });

        // ===== 7) Reconciliation computation (AFTER discount processing) =====
        const computedTotal = processedItems
            .filter(item => !isDiscountOnly(item))
            .reduce((sum, item) => sum + item.total_price, 0);
        const computedCount = processedItems.filter(item => !isDiscountOnly(item)).length;
        
        let totalDelta = null;
        let totalMismatch = false;
        let countDelta = null;
        let countMismatch = false;
        
        if (extractedReceiptTotal !== null) {
            totalDelta = round2(extractedReceiptTotal - computedTotal);
            totalMismatch = Math.abs(totalDelta) > 0.05;
        }
        
        if (extractedReceiptItemCount !== null) {
            countDelta = extractedReceiptItemCount - computedCount;
            countMismatch = Math.abs(countDelta) > 0;
        }

        // ===== 8) Parse quality scoring =====
        const validPriceCount = processedItems.filter(i => i.total_price > 0).length;
        const validPriceRatio = processedItems.length > 0 ? validPriceCount / processedItems.length : 0;
        const hasMultipliers = processedItems.some(i => i.quantity > 1);
        const hasExtractedTotal = extractedReceiptTotal !== null;
        const hasExtractedItemCount = extractedReceiptItemCount !== null;
        
        let confidenceScore = 0;
        if (processedItems.length >= 5) {
            confidenceScore += 40;
        } else {
            confidenceScore += processedItems.length * 5;
        }
        
        if (validPriceRatio >= 0.8) {
            confidenceScore += 20;
        } else {
            confidenceScore += validPriceRatio * 20;
        }
        
        if (totalTableItems > 0) confidenceScore += 10;
        if (totalLineItems > 0) confidenceScore += 10;
        if (hasExtractedTotal) confidenceScore += 10;
        
        confidenceScore = Math.min(100, Math.round(confidenceScore));

        return Response.json({
            success: true,
            items: processedItems,
            extracted_store_name: extractedStoreName,
            extracted_store_location: extractedLocation,
            extracted_purchase_date: extractedPurchaseDate,
            extracted_receipt_total: extractedReceiptTotal,
            extracted_receipt_item_count: extractedReceiptItemCount,
            total_discounts: round2(extractedTotalDiscounts),
            reconciliation: {
                extracted_receipt_total: extractedReceiptTotal,
                computed_items_total_excl_discounts: round2(computedTotal),
                total_delta: totalDelta,
                total_mismatch: totalMismatch,
                extracted_receipt_item_count: extractedReceiptItemCount,
                computed_items_count_excl_discounts: computedCount,
                count_delta: countDelta,
                count_mismatch: countMismatch
            },
            parseQuality: {
                itemCount: processedItems.length,
                tableItemCount: totalTableItems,
                lineItemCount: totalLineItems,
                rejectedLineCount: totalRejectedLines,
                validPriceRatio: round2(validPriceRatio),
                hasMultipliers,
                hasExtractedTotal,
                hasExtractedItemCount,
                confidenceScore
            }
        });

    } catch (error) {
        console.error('OCR processing error:', error.message);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});