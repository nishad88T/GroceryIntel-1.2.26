# Vercel Integrations (OCR + LLM)

## Purpose
These endpoints provide the external API surface for OCR and LLM calls. Supabase Edge functions can call them via the `VERCEL_OCR_ENDPOINT` and `VERCEL_LLM_ENDPOINT` environment variables.

## Endpoints
- `POST /api/ocr/textract`
  - Proxies OCR requests to an external OCR/Textract proxy endpoint.
  - Required env: `TEXTRACT_PROXY_URL`

- `POST /api/llm/receipt`
  - Calls OpenAI directly and returns JSON.
  - Required env: `OPENAI_API_KEY`
  - Optional env: `OPENAI_MODEL` (default `gpt-4.1-mini`)

- `POST /api/llm/insights`
  - Calls OpenAI directly for advanced insights.
  - Required env: `OPENAI_API_KEY`
  - Optional env: `OPENAI_INSIGHTS_MODEL` (default `gpt-4o`)

## Supabase Edge Environment Variables
Set these in your Supabase Edge runtime:
- `VERCEL_OCR_ENDPOINT` → your Vercel OCR endpoint (e.g. `https://yourapp.vercel.app/api/ocr/textract`)
- `VERCEL_LLM_ENDPOINT` → your Vercel LLM endpoint (e.g. `https://yourapp.vercel.app/api/llm/receipt`)
- `VERCEL_LLM_INSIGHTS_ENDPOINT` → your Vercel LLM insights endpoint (e.g. `https://yourapp.vercel.app/api/llm/insights`)

## Notes
- Vercel deployment uses `vercel.json` to set the Node.js runtime for API routes.
- `processReceiptInBackground` will call `VERCEL_OCR_ENDPOINT` if set, otherwise it falls back to `textractOCR`.
- `generateReceiptInsightsInBackground` will call `VERCEL_LLM_ENDPOINT` if set, otherwise it falls back to Base44 LLM.
