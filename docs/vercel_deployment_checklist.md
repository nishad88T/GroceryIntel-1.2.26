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
