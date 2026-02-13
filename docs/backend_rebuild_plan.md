# GroceryIntel Backend Rebuild Plan (Supabase + Vercel)

## Goal
Rebuild the Legacy platform backend as a Supabase + Vercel architecture that preserves the existing app behavior, ordering, and business rules described in `docs/app_functionality_2.2.26.md`, while enabling a future mobile app build-out.

## High-Level Architecture
- **Supabase**
  - Auth (email/password + JWT)
  - Postgres (RLS, functions, triggers)
  - Storage (receipt images, exports, app assets)
  - Edge Functions for internal logic and DB-first workflows
- **Vercel**
  - Serverless API routes for external vendor integrations (Stripe, AWS Textract, Brevo, CalorieNinjas, OpenAI, etc.)
  - Webhook endpoints that validate signatures and orchestrate Supabase operations
- **Client**
  - Supabase JS SDK for auth, data, and storage access
  - Calls Vercel endpoints for external APIs when needed

## Backend Rebuild Principles
1. **Same data flow, same order**: keep receipt upload → OCR → normalization → LLM enrichment → post-processing.
2. **RLS-first data protection**: all access governed by `auth.uid()` and `household_id` rules.
3. **Edge functions for internal logic**: prefer Supabase Edge for operations that can run entirely within Supabase.
4. **Vercel for external APIs**: keep vendor secrets out of the client and reduce cold-start issues.

## Data Model & RLS Alignment
The data model and RLS policies described in `docs/app_functionality_2.2.26.md` should be preserved, specifically:
- Household-scoped access for receipts, budgets, logs, and feedback.
- Public data for grocery categories and inflation data.
- Admin-only access for operational tables (test runs, OCR quality logs).

## Core Flows to Preserve
### 1) Auth & User Provisioning
- Supabase Auth creates users; trigger runs `handle_new_user` to provision defaults and link to a household.
- Use Postgres functions/triggers to create `users` records and seed default categories.

### 2) Receipt Upload
- Client uploads receipt images to Supabase Storage.
- Insert into `receipts` table with `validation_status = processing_background`.

### 3) OCR & Normalization
- Vercel endpoint sends images to Textract and returns OCR JSON.
- Supabase Edge function normalizes OCR into structured receipt items and stores results.

### 4) LLM Enrichment
- Vercel endpoint calls OpenAI with structured receipt data.
- Supabase Edge function persists canonicalized items, insights, and corrections.

### 5) Post-Processing
- Supabase Edge functions handle category mappings, credits, and summaries.
- Scheduled cron jobs update inflation data, roll budgets, and compute weekly summaries.

## Background Jobs
Use scheduled Supabase Edge functions (cron) for:
- Weekly summaries
- Inflation data refresh
- Data retention (receipt image cleanup)
- Trial status checks

## Webhooks & External APIs
- Stripe → Vercel (signature validation) → Supabase for subscription updates.
- AWS Textract → Vercel (OCR) → Supabase Edge for parsing.
- Brevo → Vercel for transactional emails.

## Next Implementation Steps
1. Build a minimal supabase edge function scaffold for each internal Legacy platform function.
2. Build Vercel endpoints for each external integration.
3. Implement a single “receipt processing pipeline” end-to-end with logs.
4. Add health checks, structured logging, and alerting.

