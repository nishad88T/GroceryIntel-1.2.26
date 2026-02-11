# Vercel deployment checklist

If you see `404: NOT_FOUND` on the Vercel domain:

1. In Vercel Project Settings, confirm:
   - Framework preset: `Vite`
   - Root Directory: repository root (`.`)
   - Install Command: `npm install --no-audit --no-fund` (or keep `npm ci` only after lockfile is synced)
   - Build Command: `npm run build`
   - Output Directory: `dist`
2. Redeploy the latest commit from `codex/review-repo-for-groceryintel-recreation-fvaivc`.
3. Ensure preview deployment protection is disabled for public access (if needed).
4. Confirm branch-to-domain mapping points to the active branch and not a deleted branch.

## Branch hygiene
Delete stale branches in GitHub after merge to avoid stale preview URLs and invalid branch references.


## Supabase Auth URL settings (required for signup/magic link)
In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: set this to your deployed production URL (not localhost).
- **Additional Redirect URLs**: include all environments you use, for example:
  - `https://grocery-intel-1-2-26.vercel.app/auth/callback`
  - `https://grocery-intel-1-2-26-git-<branch>-<team>.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (local dev only)

If Site URL is left as `http://localhost:3000`, Supabase confirmation emails can send users to localhost and fail in production.


## Edge Functions required
Some app features call Supabase Edge Functions and will fail with `Failed to send a request to the Edge Function` until deployed:
- `processReceiptInBackground` (receipt scan)
- `parseRecipe` (add recipe from URL/text)
- `createCheckoutSession` (Stripe upgrade)
- `getMyHousehold`, `joinHouseholdByCode`, `generateHouseholdCode` (household flows)

Deploy these functions in Supabase and set required secrets before testing these features.

## Admin access without DB role edits
Set `VITE_ADMIN_EMAILS` (comma-separated) in Vercel env vars to grant admin UI access by email, e.g.
`VITE_ADMIN_EMAILS=you@example.com,admin2@example.com`
