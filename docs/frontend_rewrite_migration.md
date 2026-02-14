# Frontend Rewrite Migration Summary

## Overview
This rewrite removes Legacy platform from the frontend build and replaces client-side data/auth usage with Supabase. The goal is a Vite+React frontend that targets Node 24, uses Supabase Auth/DB/Edge Functions, and calls external APIs through a configurable API base URL.

## Key Replacements
- **Legacy platform SDK + Vite plugin removed**: frontend dependencies no longer include `@legacy_platform/sdk` or `@legacy_platform/vite-plugin`.
- **Client SDK replacement**: `src/api/appClient.js` replaces the Legacy platform client with Supabase-backed helpers for auth, entities, functions, and integrations.
- **Supabase client**: moved to `src/api/supabaseClient.ts`.
- **API base URL**: all external API calls now use `VITE_API_BASE_URL` via the app client (LLM/OCR/email/SMS/image endpoints).
- **Legacy Legacy platform client removed**: `src/api/legacy_platformClient.js` deleted.
- **Legacy app params removed**: `src/lib/app-params.js` deleted.

## Files Replaced/Removed
- **Removed**: `src/api/legacy_platformClient.js`
- **Removed**: `src/lib/app-params.js`
- **Added**: `src/api/appClient.js`
- **Renamed**: `src/api/supabaseClient.js` → `src/api/supabaseClient.ts`

## Frontend Imports Updated
All `legacy_platform` imports in components/pages now use the Supabase-backed `appClient`:
- `import { appClient } from '@/api/appClient'`

## Remaining Legacy Field Names
Some UI fields still reference backend-provided names like `legacy_platform_credits`. These are preserved to avoid breaking existing backend responses.

## Required Environment Variables
**Frontend (Vercel Project A)**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_AUTH_PROVIDER` (optional, default: `google`)
- `VITE_SUPABASE_STORAGE_BUCKET` (optional, default: `public`)
- `VITE_API_BASE_URL` (URL of the API-only Vercel project; e.g. `https://your-api.vercel.app`)

**API Project (Vercel Project B)**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional)
- `OPENAI_INSIGHTS_MODEL` (optional)

**Supabase Edge**
- `VERCEL_OCR_ENDPOINT`
- `VERCEL_LLM_ENDPOINT`
- `VERCEL_LLM_INSIGHTS_ENDPOINT`
