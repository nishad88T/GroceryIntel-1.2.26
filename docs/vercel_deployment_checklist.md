# Vercel deployment checklist

If you see `404: NOT_FOUND` on the Vercel domain:

1. In Vercel Project Settings, confirm:
   - Framework preset: `Vite`
   - Root Directory: repository root (`.`)
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: `dist`
2. Redeploy the latest commit from `codex/review-repo-for-groceryintel-recreation-fvaivc`.
3. Ensure preview deployment protection is disabled for public access (if needed).
4. Confirm branch-to-domain mapping points to the active branch and not a deleted branch.

## Supabase Auth URL settings
In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: your deployed production URL (not localhost).
- **Additional Redirect URLs**: add all callback URLs you use:
  - `https://<your-domain>/auth/callback`
  - `https://<vercel-preview-domain>/auth/callback`
  - `http://localhost:3000/auth/callback` (local dev only)

## Minimum Edge Functions to deploy
Deploy these from the repo `functions/` directory:
- `processReceiptInBackground`
- `parseRecipe`
- `getMyHousehold`
- `joinHouseholdByCode`
- `generateHouseholdCode`
- `createCheckoutSession`
- `sendEmail` (currently returns 501 placeholder)

## Required Supabase Edge Function secrets
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_BASE_URL`
- `VERCEL_OCR_ENDPOINT`
- `VERCEL_LLM_ENDPOINT`
- `VERCEL_LLM_INSIGHTS_ENDPOINT`

## Email provider placeholders (future)
Add these now so you can enable Brevo later without code changes:
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`

## Vercel frontend env vars
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Optional admin override: `VITE_ADMIN_EMAILS=email1@example.com,email2@example.com`
