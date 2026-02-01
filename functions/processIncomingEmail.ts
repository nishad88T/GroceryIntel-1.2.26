import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        // Validate API key from Make.com
        const apiKey = req.headers.get('X-API-KEY');
        const expectedKey = Deno.env.get('MAKE_COM_SECRET');
        
        if (!apiKey || apiKey !== expectedKey) {
            console.error('[Email Ingestion] Invalid or missing API key');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const base44 = createClientFromRequest(req);

        let sender_email = '';
        let subject = '';
        let body_html = '';
        let body_plain = '';
        let fileAttachments = [];

        const contentType = req.headers.get('Content-Type') || '';

        if (contentType.includes('application/json')) {
            // Parse JSON from Make.com (for emails WITHOUT attachments)
            const rawBody = await req.text();
            console.log(`[Email Ingestion] Raw JSON body length: ${rawBody.length}`);
            
            let jsonBody;
            try {
                jsonBody = JSON.parse(rawBody);
            } catch (parseError) {
                console.error('[Email Ingestion] JSON parse error:', parseError.message);
                console.error('[Email Ingestion] Raw body preview:', rawBody.substring(0, 500));
                return Response.json({ 
                    error: 'Invalid JSON in request body. Ensure Make.com sends properly escaped JSON.',
                    details: parseError.message
                }, { status: 400 });
            }
            
            sender_email = jsonBody.sender_email || '';
            subject = jsonBody.subject || '';
            body_html = jsonBody.body_html || '';
            body_plain = jsonBody.body_plain || '';
            
            console.log(`[Email Ingestion] Received JSON - sender: ${sender_email}, subject: ${subject}`);
        } else if (contentType.includes('multipart/form-data')) {
            // Parse multipart/form-data from Make.com (for emails WITH attachments)
            const formData = await req.formData();
            
            sender_email = formData.get('sender_email')?.toString() || '';
            subject = formData.get('subject')?.toString() || '';
            body_html = formData.get('body_html')?.toString() || '';
            body_plain = formData.get('body_plain')?.toString() || '';
            
            const attachments = formData.getAll('attachments[]');
            fileAttachments = attachments.filter(att => att instanceof File);
            
            console.log(`[Email Ingestion] Received form-data - sender: ${sender_email}, subject: ${subject}, attachments: ${fileAttachments.length}`);
        } else {
            console.error('[Email Ingestion] Unsupported Content-Type:', contentType);
            return Response.json({ error: 'Unsupported Content-Type. Use application/json or multipart/form-data.' }, { status: 415 });
        }

        if (!sender_email) {
            return Response.json({ error: 'Missing sender_email' }, { status: 400 });
        }

        // Step 1: Identify user by email
        const users = await base44.asServiceRole.entities.User.filter({ email: sender_email });
        
        if (!users || users.length === 0) {
            console.warn(`[Email Ingestion] No user found for email: ${sender_email}`);
            return Response.json({ 
                error: 'User not found. Please ensure you forward emails from the same address registered with GroceryIntel.',
                sender_email 
            }, { status: 404 });
        }

        const user = users[0];
        const householdId = user.household_id;

        if (!householdId) {
            console.warn(`[Email Ingestion] User ${sender_email} has no household`);
            return Response.json({ 
                error: 'User has no household. Please set up your household in GroceryIntel first.',
                sender_email 
            }, { status: 400 });
        }

        console.log(`[Email Ingestion] User identified: ${user.id}, household: ${householdId}`);

        // Determine processing type: photo attachment or email text
        const hasImageAttachments = fileAttachments.length > 0;
        const hasEmailContent = body_plain || body_html;

        if (!hasImageAttachments && !hasEmailContent) {
            return Response.json({ 
                error: 'No content to process. Email must contain receipt text or image attachments.' 
            }, { status: 400 });
        }

        let receiptData;
        let processingType;

        if (hasImageAttachments) {
            // PHOTO RECEIPT PATH: Upload files directly to Base44 storage
            processingType = 'photo';
            console.log(`[Email Ingestion] Processing ${fileAttachments.length} image attachment(s) directly`);

            // Upload images directly to Base44 storage (no fetching needed!)
            const uploadedImageUrls = [];
            for (const file of fileAttachments) {
                try {
                    console.log(`[Email Ingestion] Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);
                    
                    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
                    if (uploadResult && uploadResult.file_url) {
                        console.log(`[Email Ingestion] Image uploaded to: ${uploadResult.file_url}`);
                        uploadedImageUrls.push(uploadResult.file_url);
                    }
                } catch (uploadError) {
                    console.error(`[Email Ingestion] Failed to upload image ${file.name}:`, uploadError);
                }
            }

            if (uploadedImageUrls.length === 0) {
                console.error(`[Email Ingestion] No images could be uploaded`);
                return Response.json({ 
                    error: 'Failed to upload image attachments.' 
                }, { status: 400 });
            }

            const finalImageUrls = uploadedImageUrls;

            // Create initial receipt record
            const initialReceipt = await base44.asServiceRole.entities.Receipt.create({
                supermarket: 'Processing...',
                purchase_date: new Date().toISOString().split('T')[0],
                total_amount: 0,
                household_id: householdId,
                user_email: sender_email,
                receipt_image_urls: finalImageUrls,
                validation_status: 'processing_background',
                notes: `Forwarded via email: ${subject || 'No subject'}`
            });

            console.log(`[Email Ingestion] Created receipt ${initialReceipt.id} for photo processing`);

            // Trigger background OCR processing
            try {
                await base44.asServiceRole.functions.invoke('processReceiptInBackground', {
                    receiptId: initialReceipt.id,
                    imageUrls: finalImageUrls,
                    storeName: null,
                    totalAmount: null,
                    householdId: householdId,
                    userEmail: sender_email
                });
            } catch (bgError) {
                console.error(`[Email Ingestion] Background processing trigger failed:`, bgError);
                // Don't fail the request, the receipt is created and can be retried
            }

            receiptData = initialReceipt;

        } else {
            // EMAIL RECEIPT PATH: Parse email content with LLM
            processingType = 'email';
            console.log(`[Email Ingestion] Processing email content for online grocery receipt`);

            const emailContent = body_plain || body_html;

            // Use LLM to extract structured receipt data from email
            const extractionPrompt = `You are a receipt data extractor. Extract structured receipt data from this online grocery order email.

EMAIL SUBJECT: ${subject || 'N/A'}

EMAIL CONTENT:
${emailContent}

Extract the following information and respond with a JSON object:
- store_name: The supermarket/retailer name (e.g., "Tesco", "Sainsbury's", "Asda", "Ocado")
- store_location: Store location if mentioned (city, area)
- purchase_date: Date of purchase in YYYY-MM-DD format
- total_amount: Total amount paid (number, no currency symbol)
- total_discounts: Total discounts applied (number, default 0)
- currency: Currency code (default "GBP")
- items: Array of purchased items, each with:
  - name: Product name
  - quantity: Number of items
  - unit_price: Price per item
  - total_price: Total price for this line
  - discount_applied: Any discount on this item (default 0)
  - category: Best guess category from: hot_beverages, fruit, vegetables, meat_poultry, fish_seafood, dairy_eggs, bakery_grains, oils_fats, sweet_treats, pantry_staples, soft_drinks, ready_meals, alcohol, other_food, toiletries, household_cleaning, pet_care, baby_care, health_beauty, other_non_food

If you cannot extract certain fields, use reasonable defaults. For dates, if only day/month available, assume current year.`;

            const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: extractionPrompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        store_name: { type: "string" },
                        store_location: { type: "string" },
                        purchase_date: { type: "string" },
                        total_amount: { type: "number" },
                        total_discounts: { type: "number" },
                        currency: { type: "string" },
                        items: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    quantity: { type: "number" },
                                    unit_price: { type: "number" },
                                    total_price: { type: "number" },
                                    discount_applied: { type: "number" },
                                    category: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            console.log(`[Email Ingestion] LLM extracted: ${llmResponse.store_name}, ${llmResponse.items?.length || 0} items`);

            // Create receipt with extracted data
            const newReceipt = await base44.asServiceRole.entities.Receipt.create({
                supermarket: llmResponse.store_name || 'Unknown Store',
                store_location: llmResponse.store_location || '',
                purchase_date: llmResponse.purchase_date || new Date().toISOString().split('T')[0],
                total_amount: llmResponse.total_amount || 0,
                total_discounts: llmResponse.total_discounts || 0,
                currency: llmResponse.currency || 'GBP',
                items: llmResponse.items || [],
                household_id: householdId,
                user_email: sender_email,
                validation_status: 'processing_background',
                notes: `Imported from email: ${subject || 'No subject'}`
            });

            console.log(`[Email Ingestion] Created receipt ${newReceipt.id} from email content`);

            // Trigger LLM enhancement for canonicalization and insights
            try {
                await base44.asServiceRole.functions.invoke('generateReceiptInsightsInBackground', {
                    receiptId: newReceipt.id
                });
            } catch (enhanceError) {
                console.error(`[Email Ingestion] Enhancement trigger failed:`, enhanceError);
                // Update to review_insights even if enhancement fails
                await base44.asServiceRole.entities.Receipt.update(newReceipt.id, {
                    validation_status: 'review_insights'
                });
            }

            receiptData = newReceipt;
        }

        // Log credit consumption
        try {
            await base44.asServiceRole.entities.CreditLog.create({
                user_id: user.id,
                user_email: sender_email,
                household_id: householdId,
                event_type: processingType === 'photo' ? 'ocr_scan' : 'ocr_scan',
                credits_consumed: 1,
                reference_id: receiptData.id,
                timestamp: new Date().toISOString()
            });
        } catch (creditError) {
            console.warn(`[Email Ingestion] Failed to log credit:`, creditError);
        }

        // Update household's monthly scan count (instead of user-level)
        try {
            const households = await base44.asServiceRole.entities.Household.filter({ id: householdId });
            if (households && households.length > 0) {
                const household = households[0];
                const currentHouseholdCount = household.household_monthly_scan_count || 0;
                await base44.asServiceRole.entities.Household.update(householdId, {
                    household_monthly_scan_count: currentHouseholdCount + 1
                });
                console.log(`[Email Ingestion] Updated household scan count to ${currentHouseholdCount + 1}`);
            }
        } catch (countError) {
            console.warn(`[Email Ingestion] Failed to update household scan count:`, countError);
        }

        console.log(`[Email Ingestion] Successfully processed ${processingType} receipt: ${receiptData.id}`);

        return Response.json({
            success: true,
            message: `Receipt processed successfully via ${processingType}`,
            receipt_id: receiptData.id,
            processing_type: processingType,
            store: receiptData.supermarket,
            items_count: receiptData.items?.length || 0
        });

    } catch (error) {
        console.error('[Email Ingestion] Function error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});