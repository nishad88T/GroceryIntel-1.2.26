import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Admin-only function to enforce data retention rules:
// - Active accounts: keep last 14 months of identifiable data
// - Inactive/trial accounts: retain up to 6 months after last activity, then delete
// - Anonymous crowd price data: placeholder purge for 10 days if such entity exists
//
// Notes:
// - "Last activity" is inferred from the most recent Receipt created/updated by the user,
//   falling back to the User.updated_date if no receipts are found.
// - "Identifiable data" here includes receipts, budgets, meal plans, OCR feedback/logs,
//   nutrition facts, and similar user-scoped records.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (caller?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const fourteenMonthsAgo = new Date(now);
    fourteenMonthsAgo.setMonth(fourteenMonthsAgo.getMonth() - 14);

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const summary = {
      usersProcessed: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      deleted: {
        receipts: 0,
        budgets: 0,
        mealPlans: 0,
        ocrFeedback: 0,
        correctionLogs: 0,
        failedScanLogs: 0,
        nutritionFacts: 0,
        failedNutritionLookups: 0,
        userCountries: 0,
      },
      notes: [] as string[]
    };

    // Helper delete-many with counting
    const deleteRecords = async (entityName: string, records: any[]) => {
      for (const rec of records) {
        try {
          await base44.asServiceRole.entities[entityName].delete(rec.id);
          // @ts-ignore count bucket exists
          if (entityName === 'Receipt') summary.deleted.receipts++;
          else if (entityName === 'Budget') summary.deleted.budgets++;
          else if (entityName === 'MealPlan') summary.deleted.mealPlans++;
          else if (entityName === 'OCRFeedback') summary.deleted.ocrFeedback++;
          else if (entityName === 'CorrectionLog') summary.deleted.correctionLogs++;
          else if (entityName === 'FailedScanLog') summary.deleted.failedScanLogs++;
          else if (entityName === 'NutritionFact') summary.deleted.nutritionFacts++;
          else if (entityName === 'FailedNutritionLookup') summary.deleted.failedNutritionLookups++;
          else if (entityName === 'UserCountry') summary.deleted.userCountries++;
        } catch (e) {
          console.warn(`[Retention] Failed to delete ${entityName} ${rec.id}:`, e);
        }
      }
    };

    // List all users (admin-only)
    const users = await base44.asServiceRole.entities.User.list();

    // Entities we will manage by user_email
    const ENTITY_LIST = [
      'Receipt', 'Budget', 'MealPlan', 'OCRFeedback', 'CorrectionLog',
      'FailedScanLog', 'NutritionFact', 'FailedNutritionLookup', 'UserCountry'
    ];

    for (const u of users) {
      summary.usersProcessed++;
      const email = u.email;

      // Determine last activity from receipts first (fast path: fetch latest one)
      let lastActivity: Date | null = null;
      try {
        const latestReceipts = await base44.asServiceRole.entities.Receipt.filter(
          { user_email: email }, '-created_date', 1
        );
        if (latestReceipts && latestReceipts.length > 0) {
          lastActivity = new Date(latestReceipts[0].created_date || latestReceipts[0].updated_date || now);
        }
      } catch {
        // ignore
      }

      if (!lastActivity) {
        // fallback to user.updated_date if available
        try {
          if (u.updated_date) lastActivity = new Date(u.updated_date);
        } catch {/* ignore */}
      }

      // If we still don't know activity, treat as inactive since account is idle
      if (!lastActivity) lastActivity = new Date(0);

      const isInactive = lastActivity < sixMonthsAgo;
      if (isInactive) summary.inactiveUsers++; else summary.activeUsers++;

      // Fetch all user-scoped data for retention decisions
      const dataByEntity: Record<string, any[]> = {};
      for (const en of ENTITY_LIST) {
        try {
          dataByEntity[en] = await base44.asServiceRole.entities[en].filter({ user_email: email });
        } catch (e) {
          // Some entities may not exist in all environments; ignore gracefully
          dataByEntity[en] = [];
        }
      }

      if (!isInactive) {
        // ACTIVE: delete records older than 14 months (rolling window)
        const olderReceipts = (dataByEntity['Receipt'] || []).filter(r => {
          const pd = r.purchase_date ? new Date(r.purchase_date) : new Date(r.created_date);
          return pd < fourteenMonthsAgo;
        });
        await deleteRecords('Receipt', olderReceipts);

        const olderBudgets = (dataByEntity['Budget'] || []).filter(b => {
          const end = b.period_end ? new Date(b.period_end) : new Date(b.created_date);
          return end < fourteenMonthsAgo;
        });
        await deleteRecords('Budget', olderBudgets);

        const olderMealPlans = (dataByEntity['MealPlan'] || []).filter(mp => {
          const d = mp.week_start_date ? new Date(mp.week_start_date) : new Date(mp.created_date);
          return d < fourteenMonthsAgo;
        });
        await deleteRecords('MealPlan', olderMealPlans);

        // Optional: prune older logs and nutrition data too
        for (const en of ['OCRFeedback','CorrectionLog','FailedScanLog','NutritionFact','FailedNutritionLookup']) {
          const older = (dataByEntity[en] || []).filter(rec => new Date(rec.created_date) < fourteenMonthsAgo);
          await deleteRecords(en, older);
        }
      } else {
        // INACTIVE: after 6 months from last activity, delete all identifiable data
        for (const en of ENTITY_LIST) {
          await deleteRecords(en, dataByEntity[en] || []);
        }

        // Optionally: within first 3 months after inactivity, send re-engagement (not enforced here)
        if (lastActivity > threeMonthsAgo) {
          summary.notes.push(`User ${email} is within re-engagement window (first 3 months of inactivity).`);
        }
      }
    }

    // Anonymous crowd price data (placeholder): if there is a PriceObservation entity, prune >10 days
    try {
      // @ts-ignore may not exist
      const observations = await base44.asServiceRole.entities.PriceObservation?.list?.();
      if (observations && Array.isArray(observations)) {
        const stale = observations.filter((o: any) => new Date(o.created_date) < tenDaysAgo);
        for (const rec of stale) {
          try { await base44.asServiceRole.entities.PriceObservation.delete(rec.id); } catch {/* ignore */}
        }
      }
    } catch {/* ignore if entity doesn't exist */}

    return Response.json({ success: true, ...summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});