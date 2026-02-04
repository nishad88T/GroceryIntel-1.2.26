# GroceryIntel Rebuild: Suggested Next Steps

## 1) Confirm Ground Truth
- Export your current Supabase schema (tables, functions, policies, triggers) and compare against the Base44 spec.
- Validate the **existing** `profiles` + `household_members` model and keep household membership logic in DB helpers.

## 2) Implement Backend Foundations (No Scaffold SQL)
- Keep your existing `handle_new_user`, `create_household_and_join`, `create_household_invite_code`, `join_household_by_code`, `is_household_admin`, and `is_household_member` functions.
- Ensure all Edge/serverless handlers reference `profiles` and `household_members` rather than `users.household_id`.

## 3) Rebuild the Receipt Pipeline (Single Vertical Slice)
- Implement a single end-to-end flow:
  1. Upload receipt image to Supabase Storage
  2. Insert receipt row with `processing_background`
  3. Vercel OCR (Textract) → Supabase Edge normalization
  4. Vercel LLM enrichment → Supabase Edge persistence
- Add logs and admin UI markers so you can see pipeline status per receipt.

## 4) Wire External Services via Vercel
- Create Vercel endpoints for:
  - Stripe checkout + webhooks
  - OpenAI (receipt enrichment, recipes)
  - Brevo (emails)
  - CalorieNinjas (nutrition)
  - AWS Textract (OCR)

## 5) Migrate Remaining Functions
- Use `docs/backend_function_map.md` to move each Base44 function to Edge or Vercel.
- Split mixed functions into:
  - Vercel: external API calls
  - Supabase Edge: DB writes and aggregation

## 6) Testing & Validation
- Build a fixture dataset to run OCR → LLM → insights flows against.
- Add regression tests for:
  - RLS policies
  - invite/household flows
  - receipt totals and categorization

## 7) Mobile Readiness
- Ensure API boundaries are stable and avoid browser-only dependencies.
- Implement deep-link friendly routes and a session refresh strategy for mobile clients.

