# Legacy function migration audit

| Function | Classification | Caller evidence |
|---|---|---|
| `aggregateGroceryData` | B (UI/admin or optional) | src/pages/OperationalInsights.jsx:745:                                costDriver="aggregateGroceryData.js backend function (runs every 3 days)" |
| `analyzeOCRFeedbackBatch` | B (UI/admin or optional) | src/pages/OCRTestingDashboard.jsx:344:            const response = await appClient.functions.invoke('analyzeOCRFeedbackBatch', { |
| `assignHouseholdToOldReceipts` | B (UI/admin or optional) | src/functions/assignHouseholdToOldReceipts.js:1:export async function assignHouseholdToOldReceipts() {; src/components/settings/DataRecoverySection.jsx:6:import { assignHouseholdToOldReceipts } from '@/functions/assignHouseholdToOldReceipts';; src/components/settings/DataRecoverySection.jsx:18:            const response = await assignHouseholdToOldReceipts(); |
| `bulkImportNutrition` | B (called by other functions) | functions/bulkImportNutrition.ts:3:    error: 'bulkImportNutrition is not implemented in Supabase-native mode yet', |
| `calorieNinjasNutrition` | B (UI/admin or optional) | src/pages/OperationalInsights.jsx:695:                                costDriver="calorieNinjasNutrition.js backend function (batches of 5 items per call)"; src/components/nutrition/nutritionUtils.jsx:51:        // When API is re-enabled, we would call calorieNinjasNutrition here |
| `cancelSubscription` | B (called by other functions) | functions/cancelSubscription.ts:3:    error: 'cancelSubscription is not implemented in Supabase-native mode yet', |
| `canonicalizeRecipeIngredients` | B (called by other functions) | functions/canonicalizeRecipeIngredients.ts:3:    error: 'canonicalizeRecipeIngredients is not implemented in Supabase-native mode yet', |
| `checkTrialStatuses` | B (called by other functions) | functions/checkTrialStatuses.ts:3:    error: 'checkTrialStatuses is not implemented in Supabase-native mode yet', |
| `computeWeeklySummary` | B (UI/admin or optional) | src/pages/PersonalInsights.jsx:76:            await appClient.functions.invoke('computeWeeklySummary', {}); |
| `createNotification` | B (called by other functions) | functions/createNotification.ts:3:    error: 'createNotification is not implemented in Supabase-native mode yet', |
| `createTestRun` | B (UI/admin or optional) | src/pages/OCRTestingDashboard.jsx:161:            const response = await appClient.functions.invoke('createTestRun', { |
| `debugInflation` | B (called by other functions) | functions/debugInflation.ts:3:    error: 'debugInflation is not implemented in Supabase-native mode yet', |
| `deleteTestRun` | B (UI/admin or optional) | src/pages/OCRTestingDashboard.jsx:115:    const deleteTestRun = async (testRun) => {; src/pages/OCRTestingDashboard.jsx:121:            const response = await appClient.functions.invoke('deleteTestRun', {; src/pages/OCRTestingDashboard.jsx:500:                                                        <Button size="sm" variant="destructive" onClick={() => deleteTestRun(run)}> |
| `deleteUserAccount` | B (UI/admin or optional) | src/pages/OperationalInsights.jsx:765:                                costDriver="Backend functions: generateModeledData.js, deleteUserAccount.js, assignHouseholdToOldReceipts.js"; src/pages/Settings.jsx:104:            const response = await appClient.functions.invoke('deleteUserAccount'); |
| `enforceDataRetention` | B (called by other functions) | functions/enforceDataRetention.ts:3:    error: 'enforceDataRetention is not implemented in Supabase-native mode yet', |
| `enhanceReceiptWithLLM` | B (called by other functions) | functions/enhanceReceiptWithLLM.ts:3:    error: 'enhanceReceiptWithLLM is not implemented in Supabase-native mode yet', |
| `extractCalorieNinjasNutrition` | B (called by other functions) | functions/extractCalorieNinjasNutrition.ts:3:    error: 'extractCalorieNinjasNutrition is not implemented in Supabase-native mode yet', |
| `extractCalorieNinjasRecipes` | B (called by other functions) | functions/extractCalorieNinjasRecipes.ts:3:    error: 'extractCalorieNinjasRecipes is not implemented in Supabase-native mode yet', |
| `feedbackAnalyzer` | B (called by other functions) | functions/feedbackAnalyzer.ts:3:    error: 'feedbackAnalyzer is not implemented in Supabase-native mode yet', |
| `fetchBLSInflationData` | B (called by other functions) | functions/fetchBLSInflationData.ts:3:    error: 'fetchBLSInflationData is not implemented in Supabase-native mode yet', |
| `fetchONSInflationData` | B (called by other functions) | functions/fetchONSInflationData.ts:3:    error: 'fetchONSInflationData is not implemented in Supabase-native mode yet', |
| `generateAIMealPlan` | B (UI/admin or optional) | src/pages/MealPlan.jsx:299:            const response = await appClient.functions.invoke('generateAIMealPlan', { |
| `generateAdvancedInsights` | B (UI/admin or optional) | src/pages/PersonalInsights.jsx:58:            const response = await appClient.functions.invoke('generateAdvancedInsights', {}); |
| `generateModeledData` | B (UI/admin or optional) | src/components/settings/DataModeler.jsx:5:import { generateModeledData } from "@/functions/generateModeledData";; src/components/settings/DataModeler.jsx:45:            const response = await generateModeledData({ action: 'generate' });; src/components/settings/DataModeler.jsx:74:            const response = await generateModeledData({ action: 'remove' }); |
| `generateReceiptInsightsInBackground` | B (called by other functions) | functions/generateReceiptInsightsInBackground.ts:3:    error: 'generateReceiptInsightsInBackground is not implemented in Supabase-native mode yet', |
| `getAIRecipeRecommendations` | B (UI/admin or optional) | src/components/recipes/AIRecommendations.jsx:34:            const response = await appClient.functions.invoke('getAIRecipeRecommendations', { |
| `getCategoryMappings` | B (called by other functions) | functions/getCategoryMappings.ts:3:    error: 'getCategoryMappings is not implemented in Supabase-native mode yet', |
| `getComprehensiveCreditReport` | B (UI/admin or optional) | src/pages/OperationalInsights.jsx:9:import { appClient } from "@/api/appClient"; // Changed from getComprehensiveCreditReport; src/pages/OperationalInsights.jsx:153:            const response = await appClient.functions.invoke('getComprehensiveCreditReport', { start_date, end_date }); |
| `getInflationComparison` | A (required by active UI) | src/pages/Analytics.jsx:162:            const response = await appClient.functions.invoke('getInflationComparison', {}); |
| `handleSharedContent` | A (required by active UI) | src/pages/Import.jsx:29:    handleSharedContent();; src/pages/Import.jsx:32:  const handleSharedContent = async () => {; src/pages/ShareTarget.jsx:17:        handleSharedContent(); |
| `handleStripeWebhook` | B (UI/admin or optional) | src/components/settings/STRIPE_TESTING.jsx:29:stripe listen --forward-to https://YOUR_APP_URL/functions/handleStripeWebhook; src/components/settings/STRIPE_TESTING.jsx:37:5. Paste: `https://YOUR_NGROK_URL/functions/handleStripeWebhook`; src/components/settings/STRIPE_TESTING.jsx:112:- Look for console.log outputs in `handleStripeWebhook` |
| `importCuratedRecipes` | B (called by other functions) | functions/importCuratedRecipes.ts:3:    error: 'importCuratedRecipes is not implemented in Supabase-native mode yet', |
| `listAllInflationData` | B (called by other functions) | functions/listAllInflationData.ts:3:    error: 'listAllInflationData is not implemented in Supabase-native mode yet', |
| `markInvitationAccepted` | B (UI/admin or optional) | src/pages/JoinHousehold.jsx:102:            await appClient.functions.invoke('markInvitationAccepted', { |
| `migrateLegacyCategories` | B (called by other functions) | functions/migrateLegacyCategories.ts:3:    error: 'migrateLegacyCategories is not implemented in Supabase-native mode yet', |
| `migrateUserSubscriptionsToHouseholds` | B (called by other functions) | functions/migrateUserSubscriptionsToHouseholds.ts:3:    error: 'migrateUserSubscriptionsToHouseholds is not implemented in Supabase-native mode yet', |
| `onsDataFetcher` | B (UI/admin or optional) | src/components/analytics/OfficialInflationChart.jsx:8:import { onsDataFetcher } from '@/functions/onsDataFetcher';; src/components/analytics/OfficialInflationChart.jsx:80:                const response = await onsDataFetcher();; src/pages/OperationalInsights.jsx:725:                                costDriver="onsDataFetcher.js backend function call to ONS API" |
| `populateUserCountries` | B (called by other functions) | functions/populateUserCountries.ts:3:    error: 'populateUserCountries is not implemented in Supabase-native mode yet', |
| `processIncomingEmail` | B (called by other functions) | functions/processIncomingEmail.ts:3:    error: 'processIncomingEmail is not implemented in Supabase-native mode yet', |
| `recategorizeAllReceipts` | B (UI/admin or optional) | src/components/admin/HistoricalRecategorizationTool.jsx:42:                    const response = await appClient.functions.invoke('recategorizeAllReceipts', { |
| `recategorizeHistoricalReceipts` | B (called by other functions) | functions/recategorizeHistoricalReceipts.ts:3:    error: 'recategorizeHistoricalReceipts is not implemented in Supabase-native mode yet', |
| `rerunTestRun` | B (UI/admin or optional) | src/pages/OCRTestingDashboard.jsx:101:            const response = await appClient.functions.invoke('rerunTestRun', { |
| `rolloverBudget` | A (required by active UI) | src/pages/Budget.jsx:133:            const response = await appClient.functions.invoke('rolloverBudget'); |
| `seedGroceryCategories` | B (called by other functions) | functions/seedGroceryCategories.ts:3:    error: 'seedGroceryCategories is not implemented in Supabase-native mode yet', |
| `seedOfficialMappings` | B (called by other functions) | functions/seedOfficialMappings.ts:3:    error: 'seedOfficialMappings is not implemented in Supabase-native mode yet', |
| `sendBrevoEmail` | B (called by other functions) | functions/sendBrevoEmail.ts:3:    error: 'sendBrevoEmail is not implemented in Supabase-native mode yet', |
| `sendBrevoTemplateEmails` | B (called by other functions) | functions/sendBrevoTemplateEmails.ts:3:    error: 'sendBrevoTemplateEmails is not implemented in Supabase-native mode yet', |
| `sendEmail` | B (called by other functions) | functions/sendWelcomeEmail.ts:1:Deno.serve(async (_req) => Response.json({ success: true, message: 'Welcome email disabled until sendEmail/Brevo is configured.' })); |
| `sendInvitation` | B (UI/admin or optional) | src/pages/OperationalInsights.jsx:735:                                costDriver="sendInvitation.js → Platform Core.SendEmail integration" |
| `sendTestBrevoEmails` | B (called by other functions) | functions/sendTestBrevoEmails.ts:3:    error: 'sendTestBrevoEmails is not implemented in Supabase-native mode yet', |
| `sendTestEmail` | B (called by other functions) | functions/sendTestEmail.ts:3:    error: 'sendTestEmail is not implemented in Supabase-native mode yet', |
| `sendWelcomeEmail` | A (required by active UI) | src/pages/Layout.jsx:267:                        await appClient.functions.invoke('sendWelcomeEmail'); |
| `submitOCRQualityFeedback` | B (UI/admin or optional) | src/pages/OCRTestingDashboard.jsx:315:            await appClient.functions.invoke('submitOCRQualityFeedback', { |
| `testBrevoTags` | B (called by other functions) | functions/testBrevoTags.ts:3:    error: 'testBrevoTags is not implemented in Supabase-native mode yet', |
| `textractOCR` | B (called by other functions) | functions/textractOCR.ts:3:    error: 'textractOCR is not implemented in Supabase-native mode yet', |
| `updateBrevoContact` | A (required by active UI) | src/Layout.jsx:452:                        await appClient.functions.invoke('updateBrevoContact', { |
| `updateCategoryMapping` | B (called by other functions) | functions/updateCategoryMapping.ts:3:    error: 'updateCategoryMapping is not implemented in Supabase-native mode yet', |
| `uploadInflationData` | B (called by other functions) | functions/uploadInflationData.ts:3:    error: 'uploadInflationData is not implemented in Supabase-native mode yet', |
