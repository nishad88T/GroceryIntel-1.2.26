export async function resolveHouseholdId(base44, user) {
    if (!user) {
        return null;
    }

    if (user.household_id) {
        return user.household_id;
    }

    const memberships = await base44.asServiceRole.entities.HouseholdMember.filter({
        user_id: user.id
    }, '-created_date', 1);

    if (memberships && memberships.length > 0) {
        return memberships[0].household_id;
    }

    return null;
}

export async function getHouseholdMembers(base44, householdId) {
    const memberships = await base44.asServiceRole.entities.HouseholdMember.filter({
        household_id: householdId
    });

    if (!memberships || memberships.length === 0) {
        return { memberships: [], profiles: [] };
    }

    const profiles = await Promise.all(
        memberships.map((member) => base44.asServiceRole.entities.User.get(member.user_id).catch(() => null))
    );

    return {
        memberships,
        profiles: profiles.filter(Boolean)
    };
}


import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import OpenAI from 'npm:openai@4.77.3';

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const insightFrequency = user.insight_frequency || 'weekly';
        const householdId = await resolveHouseholdId(base44, user);

        if (!householdId) {
            return Response.json({ error: 'User has no household' }, { status: 400 });
        }

        // Fetch the last 8 weeks of weekly caches for comprehensive trend analysis
        const caches = await base44.entities.InsightCache.filter({
            user_id: user.id,
            cache_type: 'weekly_summary'
        });

        // Sort by most recent first
        const sortedCaches = caches.sort((a, b) => 
            new Date(b.period_end) - new Date(a.period_end)
        );

        // Get last 8 weeks of data for extended look-back
        const last8Weeks = sortedCaches.slice(0, 8);

        if (last8Weeks.length === 0) {
            return Response.json({
                error: 'No cached data available. Please run computeWeeklySummary first.',
                success: false
            }, { status: 404 });
        }

        const latestCache = last8Weeks[0];

        // Fetch inflation comparison data (now with multi-period support)
        let inflationData = null;
        try {
            const inflationResponse = await base44.functions.invoke('getInflationComparison', {});
            if (inflationResponse.data.success) {
                inflationData = inflationResponse.data;
                console.log('Inflation data fetched successfully with periods:', Object.keys(inflationData.comparison || {}));
            }
        } catch (inflationError) {
            console.warn('Inflation data unavailable, proceeding without it:', inflationError.message);
        }

        // Fetch active budget
        const budgets = await base44.entities.Budget.filter({
            household_id: householdId,
            is_active: true
        });

        const activeBudget = budgets.length > 0 ? budgets[0] : null;

        // Construct comprehensive prompt for GPT-4.1-mini with 8-week analysis
        const prompt = constructAnalystPrompt(
            user,
            last8Weeks,
            inflationData,
            activeBudget,
            insightFrequency
        );

        // Call GPT-4o for advanced insights (prefer Vercel endpoint if configured)
        let insights;
        const vercelInsightsEndpoint = Deno.env.get('VERCEL_LLM_INSIGHTS_ENDPOINT');
        if (vercelInsightsEndpoint) {
            const response = await fetch(vercelInsightsEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    response_schema: { type: 'object' }
                })
            });
            insights = await response.json();
        } else {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "You are an elite personal finance analyst with expertise in grocery spending optimization, inflation economics, and behavioral finance. Your insights are data-driven, forward-looking, and immediately actionable. You identify trends, volatility patterns, and opportunities that users wouldn't notice themselves."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
                max_tokens: 3000
            });

            insights = JSON.parse(completion.choices[0].message.content);
        }

        // Log credit consumption for LLM call
        await base44.entities.CreditLog.create({
            user_id: user.id,
            user_email: user.email,
            household_id: householdId,
            event_type: 'ai_shopping_list',
            credits_consumed: 1,
            reference_id: latestCache.id
        });

        return Response.json({
            success: true,
            generated_at: new Date().toISOString(),
            period: {
                start: latestCache.period_start,
                end: latestCache.period_end
            },
            analysis_period: {
                weeks_analyzed: last8Weeks.length,
                earliest_week: last8Weeks[last8Weeks.length - 1]?.period_start,
                latest_week: latestCache.period_end
            },
            insights: insights,
            data_sources: {
                weekly_caches_used: last8Weeks.length,
                inflation_data: inflationData?.user_country || null,
                budget_included: activeBudget !== null,
                insight_frequency: insightFrequency
            },
            tokens_used: null
        });

    } catch (error) {
        console.error('Error generating advanced insights:', error);
        return Response.json({
            error: error.message,
            success: false,
            debug: {
                stack: error.stack,
                name: error.name
            }
        }, { status: 500 });
    }
});

function constructAnalystPrompt(user, last8Weeks, inflationData, activeBudget, insightFrequency) {
    const currency = user.currency || 'GBP';
    const currencySymbol = { GBP: '£', USD: '$', EUR: '€', CAD: 'C$', AUD: 'A$' }[currency] || '£';
    
    const latestCache = last8Weeks[0];
    const oldestCache = last8Weeks[last8Weeks.length - 1];

    // Calculate 8-week trends
    const weeklySpends = last8Weeks.map(w => w.summary_data?.total_spend || 0);
    const avgWeeklySpend = weeklySpends.reduce((a, b) => a + b, 0) / weeklySpends.length;
    const recentAvg = weeklySpends.slice(0, 4).reduce((a, b) => a + b, 0) / Math.min(4, weeklySpends.length);
    const olderAvg = weeklySpends.slice(4).reduce((a, b) => a + b, 0) / Math.max(1, weeklySpends.length - 4);
    const trendDirection = recentAvg > olderAvg ? 'accelerating' : 'decelerating';
    const trendMagnitude = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg * 100).toFixed(1) : '0.0';

    // Calculate total receipts analyzed across all weeks
    const totalReceiptsAnalyzed = last8Weeks.reduce((sum, w) => sum + (w.summary_data?.receipt_count || 0), 0);

    // Calculate category volatility over 8 weeks
    const categoryVolatility = calculateCategoryVolatility(last8Weeks);

    let prompt = `You are analyzing ${last8Weeks.length} weeks of grocery spending data for a user${inflationData ? ` in ${inflationData.user_country.country_code}` : ''}.

**ANALYSIS CONTEXT:**
- Insight Frequency: ${insightFrequency} digest
- Analysis Period: ${oldestCache.period_start} to ${latestCache.period_end} (${last8Weeks.length} weeks)
- Total Receipts Analyzed: ${totalReceiptsAnalyzed}
- Average Weekly Spend: ${currencySymbol}${avgWeeklySpend.toFixed(2)}
- Spending Trend: ${trendDirection} (${trendDirection === 'accelerating' ? '+' : ''}${trendMagnitude}%)
- Recent 4 weeks avg: ${currencySymbol}${recentAvg.toFixed(2)} vs Earlier weeks avg: ${currencySymbol}${olderAvg.toFixed(2)}

**LATEST WEEK SNAPSHOT (${latestCache.period_start} to ${latestCache.period_end}):**
- Total Spend: ${currencySymbol}${latestCache.summary_data?.total_spend?.toFixed(2) || '0.00'}
- Receipts: ${latestCache.summary_data?.receipt_count || 0}
- Week-over-week change: ${latestCache.summary_data?.week_over_week_change?.toFixed(1) || '0.0'}%

**CATEGORY BREAKDOWN (Latest Week):**
${latestCache.summary_data?.category_breakdown ? Object.entries(latestCache.summary_data.category_breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([cat, spend]) => `- ${cat}: ${currencySymbol}${spend.toFixed(2)}`)
    .join('\n') : 'No category data available'}

**TOP PURCHASED ITEMS (Latest Week):**
${latestCache.summary_data?.top_items ? latestCache.summary_data.top_items.slice(0, 10).map(item => 
    `- ${item.name}: ${currencySymbol}${item.total_spend.toFixed(2)} (${item.quantity} units)`
).join('\n') : 'No item data available'}

**8-WEEK SPENDING TRAJECTORY:**
${[...last8Weeks].reverse().map((w, i) => 
    `Week ${i + 1} (${w.period_start}): ${currencySymbol}${w.summary_data?.total_spend?.toFixed(2) || '0.00'} | ${w.summary_data?.receipt_count || 0} receipts`
).join('\n')}

**CATEGORY VOLATILITY ANALYSIS (8 weeks):**
${categoryVolatility.length > 0 ? categoryVolatility.slice(0, 8).map(cv => 
    `- ${cv.category}: Volatility ${cv.volatility.toFixed(1)}% | Range: ${currencySymbol}${cv.min.toFixed(2)}-${currencySymbol}${cv.max.toFixed(2)} | Avg: ${currencySymbol}${cv.avg.toFixed(2)} | Trend: ${cv.trend}`
).join('\n') : 'Limited volatility data available'}
`;

    if (inflationData && inflationData.comparison) {
        // Use the most relevant period as primary, but include all for context
        const relevantPeriod = inflationData.most_relevant_period || '1_month';
        const relevantComparison = inflationData.comparison[relevantPeriod];

        prompt += `
    **MULTI-PERIOD INFLATION COMPARISON (Most Relevant: ${relevantPeriod.replace('_', '-')}):**

    **YOUR INFLATION RATES ACROSS PERIODS:**
    - 1-month: ${inflationData.personal_inflation?.['1_month']?.overall?.toFixed(2) || 'N/A'}%
    - 3-month: ${inflationData.personal_inflation?.['3_month']?.overall?.toFixed(2) || 'N/A'}%
    - 6-month: ${inflationData.personal_inflation?.['6_month']?.overall?.toFixed(2) || 'N/A'}%
    - 12-month: ${inflationData.personal_inflation?.['12_month']?.overall?.toFixed(2) || 'N/A'}%

    **NATIONAL INFLATION RATES (${inflationData.user_country.statistical_source}):**
    - 1-month: ${inflationData.official_inflation?.['1_month'] ? calculateOverallRate(inflationData.official_inflation['1_month'])?.toFixed(2) : 'N/A'}%
    - 3-month: ${inflationData.official_inflation?.['3_month'] ? calculateOverallRate(inflationData.official_inflation['3_month'])?.toFixed(2) : 'N/A'}%
    - 6-month: ${inflationData.official_inflation?.['6_month'] ? calculateOverallRate(inflationData.official_inflation['6_month'])?.toFixed(2) : 'N/A'}%
    - 12-month: ${inflationData.official_inflation?.['12_month'] ? calculateOverallRate(inflationData.official_inflation['12_month'])?.toFixed(2) : 'N/A'}%

    **KEY VARIANCES (${relevantPeriod.replace('_', '-')} period):**
    ${relevantComparison?.by_category ? Object.entries(relevantComparison.by_category)
    .filter(([, data]) => data.variance !== null && data.variance > 5)
    .sort(([, a], [, b]) => (b.variance || 0) - (a.variance || 0))
    .slice(0, 6)
    .map(([cat, data]) => 
        `- ${cat}: Personal ${data.personal_rate?.toFixed(1) || 'N/A'}% vs National ${data.official_rate?.toFixed(1) || 'N/A'}% | Variance: +${data.variance?.toFixed(1)}%`
    )
    .join('\n') || 'None - your inflation is tracking at or below national averages' : 'Inflation comparison data unavailable'}

    **SIGNIFICANT CROSS-PERIOD MOVEMENTS:**
    Look for categories where inflation rates differ significantly across time periods (e.g., high 1-month but low 12-month = recent spike).
    `;
    }

    // Helper to calculate overall rate from period data
    function calculateOverallRate(periodData) {
        const validRates = Object.values(periodData).filter(r => r !== null);
        if (validRates.length === 0) return null;
        return validRates.reduce((sum, r) => sum + r, 0) / validRates.length;
    }

    if (activeBudget) {
        const budgetProgress = latestCache.summary_data?.total_spend ? 
            (latestCache.summary_data.total_spend / activeBudget.amount) * 100 : 0;
        const projectedMonthlySpend = avgWeeklySpend * 4.33;
        const projectedBudgetUsage = (projectedMonthlySpend / activeBudget.amount) * 100;
        
        prompt += `

**BUDGET ANALYSIS:**
- Budget: ${currencySymbol}${activeBudget.amount} (${activeBudget.type})
- Latest Week Spend: ${currencySymbol}${latestCache.summary_data?.total_spend?.toFixed(2) || '0.00'}
- Budget Usage (Latest Week): ${budgetProgress.toFixed(1)}%
- 8-Week Average Weekly Spend: ${currencySymbol}${avgWeeklySpend.toFixed(2)}
- Projected Monthly Spend (if trend continues): ${currencySymbol}${projectedMonthlySpend.toFixed(2)}
- Projected Budget Usage: ${projectedBudgetUsage.toFixed(1)}%
- Status: ${projectedBudgetUsage > 100 ? 'OVERSPEND RISK' : projectedBudgetUsage > 90 ? 'APPROACHING LIMIT' : 'ON TRACK'}
`;
    }

    prompt += `

**TASK:**
Generate a comprehensive JSON analysis as a ${insightFrequency} financial digest with the following structure:
{
  "executive_summary": "2-3 sentence overview highlighting the most critical financial insight from the 8-week period. Be specific with numbers and trends.",
  
  "spending_trends": [
    {
      "title": "Concise trend title (e.g., 'Meat & Fish Spending Accelerating')",
      "insight": "Detailed analysis of this trend over the 8-week period with specific numbers, percentage changes, and potential drivers",
      "period": "over_8_weeks|recent_4_weeks|latest_week",
      "impact": "high|medium|low",
      "direction": "increasing|decreasing|volatile",
      "action_items": ["Specific, immediately actionable recommendation"]
    }
  ],
  
  "inflation_analysis": {
    "summary": "Comprehensive analysis of how personal inflation compares to national trends, highlighting financial impact in ${currency}",
    "key_variances": [
      {
        "category": "category name",
        "message": "Explanation of why this category shows high variance, potential causes, and specific impact",
        "impact": "high|medium|low",
        "cost_delta": "Estimated additional cost vs. if inflation matched national average"
      }
    ],
    "forecast": "Forward-looking 4-8 week outlook based on identified trends and volatility patterns. Be specific about what to watch."
  },
  
  "volatility_alerts": [
    {
      "category": "category name",
      "alert": "Description of volatility pattern identified over 8 weeks",
      "price_range": "Min-Max price range observed",
      "recommendation": "Specific timing or shopping strategy recommendation"
    }
  ],
  
  "budget_guidance": {
    "status": "on_track|approaching_limit|overspend_risk|no_budget",
    "trajectory": "Projection: If current 8-week average continues, you will spend ${currency}X by end of budget period (X% over/under budget)",
    "recommendations": ["Specific, prioritized actions to optimize budget adherence"],
    "risk_areas": ["Categories or behaviors posing budget risk"]
  },
  
  "quick_wins": [
    "Immediate, specific action that can save money (e.g., 'Switch to own-brand milk - save ~£X/week based on your consumption')"
  ],
  
  "categories_to_watch": [
    {
      "category": "category name",
      "reason": "Why monitoring this category is critical for the next ${insightFrequency === 'weekly' ? 'week' : 'month'}",
      "metric_to_track": "Specific metric to monitor (e.g., 'price per kg for chicken breasts')"
    }
  ]
}

**CRITICAL INSTRUCTIONS:**
1. Base ALL insights on the actual data provided - use specific numbers, dates, and percentages
2. Identify NON-OBVIOUS patterns that require 8-week analysis to spot
3. Connect volatility patterns to actionable recommendations (e.g., "Fresh veg prices vary 30% week-to-week - shop Wed/Thu for best prices")
4. For budget trajectory, provide a FORWARD-LOOKING projection, not just current status
5. ${inflationData ? 'In inflation analysis, calculate the FINANCIAL COST of personal vs. national inflation variance' : 'Focus on spending patterns and budget optimization'}
6. Make quick wins IMMEDIATELY actionable with estimated savings
7. Prioritize insights by financial impact (high-impact items first)
8. Use plain language - assume user is financially literate but not an economist`;

    return prompt;
}

function calculateCategoryVolatility(weeklyData) {
    const categoryStats = {};
    
    // Aggregate category data across all weeks
    weeklyData.forEach(week => {
        if (week.summary_data?.category_breakdown) {
            Object.entries(week.summary_data.category_breakdown).forEach(([category, spend]) => {
                if (!categoryStats[category]) {
                    categoryStats[category] = [];
                }
                categoryStats[category].push(spend);
            });
        }
    });
    
    // Calculate volatility metrics
    return Object.entries(categoryStats)
        .map(([category, spends]) => {
            if (spends.length < 2) return null;
            
            const avg = spends.reduce((a, b) => a + b, 0) / spends.length;
            if (avg === 0) return null;
            
            const variance = spends.reduce((sum, spend) => sum + Math.pow(spend - avg, 2), 0) / spends.length;
            const stdDev = Math.sqrt(variance);
            const volatility = (stdDev / avg) * 100; // Coefficient of variation
            
            const min = Math.min(...spends);
            const max = Math.max(...spends);
            
            // Determine trend
            const recentAvg = spends.slice(0, Math.min(3, spends.length)).reduce((a, b) => a + b, 0) / Math.min(3, spends.length);
            const olderAvg = spends.slice(-Math.min(3, spends.length)).reduce((a, b) => a + b, 0) / Math.min(3, spends.length);
            const trend = recentAvg > olderAvg * 1.1 ? 'increasing' : recentAvg < olderAvg * 0.9 ? 'decreasing' : 'stable';
            
            return {
                category,
                volatility,
                avg,
                min,
                max,
                trend,
                weeks_tracked: spends.length
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.volatility - a.volatility);
}
