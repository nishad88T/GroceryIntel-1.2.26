# Backend Function Map (Legacy platform → Supabase Edge + Vercel)

This map groups existing Legacy platform functions by where they should live in the new architecture.

## Supabase Edge Functions (Internal / DB-centric)
These functions primarily read/write Supabase data and should run close to the DB:
- `aggregateGroceryData`
- `assignHouseholdToOldReceipts`
- `checkTrialStatuses`
- `computeWeeklySummary`
- `createNotification`
- `createTestRun`
- `deleteTestRun`
- `deleteUserAccount`
- `enforceDataRetention`
- `generateAdvancedInsights`
- `generateHouseholdCode`
- `generateReceiptInsightsInBackground`
- `getCategoryMappings`
- `getComprehensiveCreditReport`
- `getInflationComparison`
- `getMyHousehold`
- `handleSharedContent`
- `importCuratedRecipes`
- `joinHouseholdByCode`
- `listAllInflationData`
- `markInvitationAccepted`
- `migrateLegacyCategories`
- `migrateUserSubscriptionsToHouseholds`
- `populateUserCountries`
- `processReceiptInBackground`
- `recategorizeAllReceipts`
- `recategorizeHistoricalReceipts`
- `rerunTestRun`
- `rolloverBudget`
- `seedGroceryCategories`
- `seedOfficialMappings`
- `submitOCRQualityFeedback`
- `updateCategoryMapping`
- `uploadInflationData`

## Vercel Serverless (External APIs & Webhooks)
These functions call external services or receive webhooks:
- `analyzeOCRFeedbackBatch` (OpenAI / LLM)
- `bulkImportNutrition` (external data sources)
- `calorieNinjasNutrition` (CalorieNinjas)
- `cancelSubscription` (Stripe)
- `canonicalizeRecipeIngredients` (OpenAI / LLM)
- `createCheckoutSession` (Stripe)
- `debugInflation` (external APIs)
- `enhanceReceiptWithLLM` (OpenAI / LLM)
- `extractCalorieNinjasNutrition` (CalorieNinjas)
- `extractCalorieNinjasRecipes` (CalorieNinjas)
- `feedbackAnalyzer` (OpenAI / LLM)
- `fetchBLSInflationData` (BLS API)
- `fetchONSInflationData` (ONS API)
- `generateAIMealPlan` (OpenAI / LLM)
- `generateModeledData` (external analytics)
- `getAIRecipeRecommendations` (OpenAI / LLM)
- `handleStripeWebhook` (Stripe)
- `onsDataFetcher` (ONS API)
- `parseRecipe` (OpenAI / LLM)
- `processIncomingEmail` (email webhook)
- `sendBrevoEmail` (Brevo)
- `sendBrevoTemplateEmails` (Brevo)
- `sendInvitation` (email provider)
- `sendTestBrevoEmails` (Brevo)
- `sendTestEmail` (email provider)
- `sendWelcomeEmail` (email provider)
- `testBrevoTags` (Brevo)
- `textractOCR` (AWS Textract)
- `updateBrevoContact` (Brevo)

## Notes
- Keep the API surface stable: existing client-side calls can be re-routed to Supabase Edge or Vercel without changing payloads.
- For any function that both calls external APIs and writes data, consider splitting into:
  - Vercel: external API call and sanitization
  - Supabase Edge: database writes and RLS-compliant inserts/updates

