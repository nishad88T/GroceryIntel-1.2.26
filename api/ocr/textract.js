import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';

function parsePriceValue(valueText) {
  if (!valueText) return 0;
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
    cleaned = cleaned.replace(/[^\d.-]/g, '');
  }

  const parsed = parseFloat(cleaned);
  if (!isNaN(parsed) && Math.abs(parsed) > 1000 && !isNegative) {
    return parsed / 100;
  }

  return isNaN(parsed) ? 0 : parsed;
}

function isDiscountOnly(item) {
  if (item.total_price < 0) return true;
  const lowerName = (item.name || '').toLowerCase();
  return /discount|saving|offer|clubcard|nectar|more points|voucher|promo/i.test(lowerName);
}

function isDiscountCandidate(name, price) {
  if (price < 0) return true;
  const lowerName = (name || '').toLowerCase();
  return /discount|saving|offer|clubcard|nectar|more points|voucher|promo/i.test(lowerName);
}

function round2(num) {
  return Math.round(num * 100) / 100;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { imageUrls, storeName, totalAmount } = req.body || {};

  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    res.status(400).json({ success: false, error: 'No image URLs provided' });
    return;
  }

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
    res.status(500).json({ success: false, error: 'AWS credentials are not configured' });
    return;
  }

  const textractClient = new TextractClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
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
      continue;
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);

    const command = new AnalyzeDocumentCommand({
      Document: { Bytes: imageBytes },
      FeatureTypes: ['TABLES']
    });
    const textractResponse = await textractClient.send(command);
    if (!textractResponse.Blocks) continue;

    const blocks = textractResponse.Blocks;
    const lineBlocks = blocks.filter(b => b.BlockType === 'LINE' && b.Text);

    let footerStartIndex = lineBlocks.length;
    for (let i = 0; i < lineBlocks.length; i++) {
      const text = (lineBlocks[i].Text || '').toLowerCase();
      if (/total\b|goods:|subtotal|vat|card number|authorisation|approved|contactless|merchant id|terminal id|eft no|change|debit|mastercard|visa|amount due/.test(text)) {
        footerStartIndex = i;
        break;
      }
    }

    const headerLines = lineBlocks.slice(0, Math.min(5, lineBlocks.length));
    const footerLines = lineBlocks.slice(footerStartIndex);

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

    if (!extractedStoreName && storeName && storeName !== 'Unknown Store') {
      extractedStoreName = storeName;
    }

    if (!extractedLocation && headerLines.length > 1) {
      for (let i = 1; i < Math.min(3, headerLines.length); i++) {
        const text = (headerLines[i].Text || '').trim();
        if (text.length > 3 && text !== 'GBP' && /[a-zA-Z]/.test(text) && !/^\d+$/.test(text)) {
          extractedLocation = text;
          break;
        }
      }
    }

    if (!extractedPurchaseDate) {
      for (const line of lineBlocks) {
        const match = (line.Text || '').match(/\b(\d{2}\/\d{2}\/\d{2,4})\b/);
        if (match) {
          extractedPurchaseDate = match[1];
          break;
        }
      }
    }

    if (!extractedReceiptItemCount) {
      for (const line of footerLines) {
        const match = (line.Text || '').match(/\b(\d+)\s+items?\b/i);
        if (match) {
          extractedReceiptItemCount = parseInt(match[1], 10);
          break;
        }
      }
    }

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

    const tables = blocks.filter(block => block.BlockType === 'TABLE');
    if (tables.length > 0) {
      const rows = blocks.filter(block => block.BlockType === 'CELL' && block.RowIndex !== undefined);
      const rowMap = {};
      rows.forEach(cell => {
        const rowIndex = cell.RowIndex;
        if (!rowMap[rowIndex]) rowMap[rowIndex] = [];
        rowMap[rowIndex].push(cell);
      });

      Object.values(rowMap).forEach(rowCells => {
        const rowText = rowCells.map(cell => cell.Text || '').join(' ').trim();
        if (!rowText) return;

        const priceMatch = rowText.match(/(-?\d+[.,]\d{2})\s*$/);
        const itemName = rowText.replace(/(-?\d+[.,]\d{2})\s*$/, '').trim();

        if (itemName && priceMatch) {
          const total_price = parsePriceValue(priceMatch[1]);
          allItems.push({
            name: itemName,
            quantity: 1,
            unit_price: total_price,
            total_price
          });
          totalTableItems++;
        }
      });
    } else {
      lineBlocks.forEach(line => {
        const text = (line.Text || '').trim();
        if (!text) return;

        const match = text.match(/(.*)\s+(-?\d+[.,]\d{2})$/);
        if (!match) {
          totalRejectedLines++;
          return;
        }

        const itemName = match[1].trim();
        const total_price = parsePriceValue(match[2]);
        if (!itemName || isDiscountCandidate(itemName, total_price)) {
          totalRejectedLines++;
          return;
        }

        allItems.push({
          name: itemName,
          quantity: 1,
          unit_price: total_price,
          total_price
        });
        totalLineItems++;
      });
    }
  }

  const cleanedItems = allItems.filter(item => !isDiscountOnly(item));
  const computedTotal = round2(cleanedItems.reduce((sum, item) => sum + (item.total_price || 0), 0));
  const computedCount = cleanedItems.length;
  const extractedTotal = extractedReceiptTotal || totalAmount || 0;
  const totalDelta = round2(computedTotal - extractedTotal);

  const parseQuality = {
    confidenceScore: cleanedItems.length > 0 ? 80 : 0,
    totalTableItems,
    totalLineItems,
    totalRejectedLines
  };

  res.status(200).json({
    success: true,
    items: cleanedItems,
    extracted_store_name: extractedStoreName,
    extracted_store_location: extractedLocation,
    extracted_purchase_date: extractedPurchaseDate,
    total_discounts: extractedTotalDiscounts,
    reconciliation: {
      extracted_receipt_total: extractedReceiptTotal,
      extracted_receipt_item_count: extractedReceiptItemCount,
      computed_items_total_excl_discounts: computedTotal,
      computed_items_count_excl_discounts: computedCount,
      total_delta: totalDelta,
      total_mismatch: Math.abs(totalDelta) > 0.5,
      count_delta: extractedReceiptItemCount ? computedCount - extractedReceiptItemCount : null,
      count_mismatch: extractedReceiptItemCount ? Math.abs(computedCount - extractedReceiptItemCount) > 2 : false
    },
    parseQuality
  });
}
