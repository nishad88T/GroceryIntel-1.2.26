# Supabase Alignment Review (Profiles + Household Members)

## 1) Profile + Household Membership Consistency
Current code references a `household_id` stored directly on the user object in multiple places. This will not align with a `profiles` + `household_members` model without a compatibility layer or refactor.

Examples:
- `joinHouseholdByCode` updates `household_id` on the authenticated user and reads `user.household_id` for membership checks and tier handling.
- `getAIRecipeRecommendations` uses `user.household_id` to scope meal plans and recipes.
- `processReceiptInBackground` expects a `householdId` in the payload and updates household scan counters by household ID.

## 2) RLS Assumptions
Many functions use the Base44 service role client (`base44.asServiceRole`), which bypasses RLS. This implies that RLS rules must still be enforced for client-facing operations, while server-side workers should perform their own authorization checks.

## 3) Suggested Refactors
- Replace direct reads of `user.household_id` with a lookup from `household_members` (or expose a view that joins `profiles` to active household membership).
- Keep household-specific writes (like scan count updates) operating on the household table, but ensure membership and admin checks are enforced server-side.
- Update any client-visible code paths that read/write `household_id` to use the membership model.

## 4) Schema Hygiene Checklist
Because the repo does not include your live SQL schema, use this checklist against your Supabase project:
- Verify unique constraints on household invite codes and membership tuples.
- Verify indexes on high-cardinality filters (`household_id`, `created_date`, `user_id`) for receipts, meal plans, and logs.
- Ensure `updated_at` triggers are attached to all mutable tables used by the app (receipts, budgets, household memberships, profiles, invitations, etc.).

## 5) Remaining Wiring Needed
- Update edge/serverless functions to use the `profiles` + `household_members` model.
- Confirm all server-side workers that currently pass `householdId` still align with your RLS rules and helper functions.
- Add an explicit edge function for membership lookup (current household) if the client needs a single call to resolve active membership.

