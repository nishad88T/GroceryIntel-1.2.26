# GroceryIntel Rebuild: Suggested Next Steps

## 1) Confirm Ground Truth
- Export your current Supabase schema (tables, functions, policies, triggers) and compare against the Base44 spec.
- Align any missing tables, columns, or policies with the behavior described in `docs/app_functionality_2.2.26.md`.

## 2) Implement Backend Foundations
- Apply the SQL scaffolding in `docs/supabase_edge_setup.sql` and extend it to match your exact schema.
- Recreate or validate triggers for:
  - `handle_new_user`
  - `set_updated_at`
  - household creation + invite flow

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

