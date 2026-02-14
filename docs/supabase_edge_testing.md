# Supabase Edge testing guide

## User-invoked functions (JWT required)
Examples: `getMyHousehold`, `joinHouseholdByCode`, `generateHouseholdCode`, `parseRecipe`, `processReceiptInBackground`.

1. Sign in from the app.
2. Copy the access token from browser storage/session.
3. In Supabase Dashboard → Edge Functions → Function → Invoke:
   - Add header: `Authorization: Bearer <access_token>`
   - Add JSON body required by the function.
4. Confirm HTTP 200 and expected JSON payload.

## Service/background functions
Functions used for scheduled/admin background processing can rely on service role access.
- These are safe to invoke without a user JWT only when they are not exposed to the public client.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in Edge Function secrets.

## Email placeholder
`sendEmail` is intentionally a placeholder and returns HTTP 501 until Brevo is enabled.
Required future secrets:
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME`
