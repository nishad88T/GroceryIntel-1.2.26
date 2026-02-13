import { createServiceClient, requireUser } from './_helpers/supabase.ts';

Deno.serve(async (req) => {
  try {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    const { user } = auth;
    const { receiptId, imageUrls, storeName, totalAmount, householdId } = await req.json();

    if (!receiptId || !Array.isArray(imageUrls) || !householdId) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: profile } = await service
      .from('profiles')
      .select('household_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.household_id || profile.household_id !== householdId) {
      return Response.json({ error: 'User or household not found' }, { status: 403 });
    }

    const vercelOcrEndpoint = Deno.env.get('VERCEL_OCR_ENDPOINT');
    if (!vercelOcrEndpoint) {
      return Response.json({ error: 'VERCEL_OCR_ENDPOINT is not configured' }, { status: 500 });
    }

    const ocrRequest = await fetch(vercelOcrEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrls,
        storeName: storeName || '',
        totalAmount: totalAmount || 0,
        modelType: 'AnalyzeDocumentTables'
      })
    });

    if (!ocrRequest.ok) {
      const text = await ocrRequest.text();
      throw new Error(`OCR endpoint failed: ${ocrRequest.status} ${text}`);
    }

    const ocrData = await ocrRequest.json();
    if (!ocrData?.success || !Array.isArray(ocrData.items)) {
      await service.from('receipts').update({ validation_status: 'failed_processing', items: [] }).eq('id', receiptId);
      return Response.json({ success: false, message: 'OCR failed to extract items', receiptId });
    }

    const updates = {
      items: ocrData.items,
      supermarket: ocrData.extracted_store_name || storeName || 'Unknown Store',
      store_location: ocrData.extracted_store_location || null,
      purchase_date: ocrData.extracted_purchase_date || null,
      total_discounts: ocrData.total_discounts || 0,
      validation_status: 'completed',
      is_processed: true
    };

    const { error: updateError } = await service.from('receipts').update(updates).eq('id', receiptId);
    if (updateError) {
      throw updateError;
    }

    return Response.json({ success: true, receiptId, itemCount: ocrData.items.length });
  } catch (error) {
    console.error('[processReceiptInBackground] Error:', error);
    return Response.json({ error: error.message || 'Background processing failed' }, { status: 500 });
  }
});
