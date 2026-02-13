# Supabase Edge Functions (No Legacy platform)

This project now uses Supabase-native Edge functions for core user flows. No `Legacy platform-App-Id` header is required.

## Functions to deploy (core)
Deploy these from the repo `functions/` folder:
- `functions/getMyHousehold.ts`
- `functions/joinHouseholdByCode.ts`
- `functions/generateHouseholdCode.ts`
- `functions/processReceiptInBackground.ts`
- `functions/parseRecipe.ts`
- `functions/createCheckoutSession.ts` (optional until Stripe is enabled)

Also deploy helper files used by these functions:
- `functions/_helpers/supabase.ts`
- `functions/_helpers/household.ts`

## Deployment options

### Option A (Supabase CLI, recommended)
From repo root:
```bash
supabase link --project-ref <your-project-ref>
supabase functions deploy getMyHousehold
supabase functions deploy joinHouseholdByCode
supabase functions deploy generateHouseholdCode
supabase functions deploy processReceiptInBackground
supabase functions deploy parseRecipe
supabase functions deploy createCheckoutSession
```

### Option B (Dashboard manual)
In Supabase Dashboard -> Edge Functions:
1. Create each function by name.
2. Paste the corresponding file content.
3. Save + deploy.

## Required Supabase Edge Secrets
Set in Supabase Dashboard -> Edge Functions -> Secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_BASE_URL`
- `VERCEL_OCR_ENDPOINT`
- `VERCEL_LLM_ENDPOINT`
- `VERCEL_LLM_INSIGHTS_ENDPOINT`

Optional for Stripe:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Optional if OCR runs directly in Edge (without Vercel OCR route):
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Auth testing

### User-invoked functions (Authorization Bearer token required)
Examples:
- `getMyHousehold`
- `joinHouseholdByCode`
- `generateHouseholdCode`
- `parseRecipe`
- `createCheckoutSession`

How to test in Supabase dashboard test panel:
- Add Header:
  - `Authorization: Bearer <supabase_access_token>`

### Background/system functions
`processReceiptInBackground` is currently invoked from authenticated frontend flow and expects user auth; it validates user/household before processing.

## What changed vs Legacy platform
No frontend or function should require `Legacy platform-App-Id`.

Removed Legacy platform header compatibility from:
- `src/api/appClient.js` (`Legacy platform-App-Id` injection removed)
- `docs/vercel_deployment_checklist.md` (Legacy platform header compatibility section removed)

## External integrations strategy
External providers remain outside Supabase DB and are called via endpoint secrets:
- OCR -> `VERCEL_OCR_ENDPOINT`
- Recipe/LLM -> `VERCEL_LLM_ENDPOINT`
- Insights LLM -> `VERCEL_LLM_INSIGHTS_ENDPOINT`

Brevo/email stub path recommendation:
- Add `VERCEL_EMAIL_ENDPOINT` and call a Vercel route (e.g. `/api/email/brevo`) from Edge functions when email sending is enabled.
