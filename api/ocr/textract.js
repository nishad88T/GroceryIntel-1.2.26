export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { imageUrls, storeName = '', totalAmount = 0, modelType = 'AnalyzeDocumentTables' } = req.body || {};

  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    res.status(400).json({ success: false, error: 'imageUrls is required' });
    return;
  }

  const proxyUrl = process.env.TEXTRACT_PROXY_URL;
  if (!proxyUrl) {
    res.status(500).json({ success: false, error: 'TEXTRACT_PROXY_URL is not configured' });
    return;
  }

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrls,
      storeName,
      totalAmount,
      modelType
    })
  });

  const payload = await response.json();
  res.status(response.ok ? 200 : 500).json(payload);
}
