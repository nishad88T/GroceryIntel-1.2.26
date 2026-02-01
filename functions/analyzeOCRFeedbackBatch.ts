import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
        }

        const { test_run_id } = await req.json();

        if (!test_run_id) {
            return Response.json({ error: 'test_run_id is required' }, { status: 400 });
        }

        // Fetch all quality logs for this test run
        const logs = await base44.asServiceRole.entities.OCRQualityLog.filter({ test_run_id });

        if (!logs || logs.length === 0) {
            return Response.json({ 
                error: 'No feedback logs found for this test run',
                total_errors: 0
            }, { status: 400 });
        }

        // Calculate statistics
        const stats = {
            total_errors: logs.length,
            by_error_type: {},
            by_error_origin: {},
            by_receipt_quality: {},
            by_store: {},
            critical_errors: logs.filter(l => l.is_critical_error).length
        };

        logs.forEach(log => {
            stats.by_error_type[log.error_type] = (stats.by_error_type[log.error_type] || 0) + 1;
            stats.by_error_origin[log.error_origin] = (stats.by_error_origin[log.error_origin] || 0) + 1;
            stats.by_receipt_quality[log.receipt_quality] = (stats.by_receipt_quality[log.receipt_quality] || 0) + 1;
            stats.by_store[log.store_name] = (stats.by_store[log.store_name] || 0) + 1;
        });

        // Prepare detailed summary for LLM
        const logSummary = logs.map(log => ({
            error_type: log.error_type,
            error_origin: log.error_origin,
            original: log.original_value,
            corrected: log.corrected_value,
            comment: log.comment,
            receipt_quality: log.receipt_quality,
            store: log.store_name,
            critical: log.is_critical_error
        }));

        // Use LLM to analyze patterns and suggest improvements
        const analysisPrompt = `You are an OCR quality analyst reviewing feedback from a batch of grocery receipt scans.

**Test Run Statistics:**
- Total Errors: ${stats.total_errors}
- Critical Errors: ${stats.critical_errors}
- Error Types: ${JSON.stringify(stats.by_error_type, null, 2)}
- Error Origins: ${JSON.stringify(stats.by_error_origin, null, 2)}
- By Receipt Quality: ${JSON.stringify(stats.by_receipt_quality, null, 2)}
- By Store: ${JSON.stringify(stats.by_store, null, 2)}

**Detailed Error Log (sample of first 50):**
${JSON.stringify(logSummary.slice(0, 50), null, 2)}

**Your Task:**
1. Identify ALL prevalent error patterns (not just top 3). Group similar errors together.
2. For each pattern, explain the likely root cause.
3. Provide specific, technical code-level improvements for:
   - functions/textractOCR.js (for "textract_raw" origin errors)
   - functions/generateReceiptInsightsInBackground.js (for "llm_canonicalization" errors)
4. Prioritize improvements by potential impact (how many errors would be fixed).
5. Highlight any correlations (e.g., "faded receipts from Lidl have 80% price errors").

Format your response as JSON:
{
  "summary": "Brief overall assessment",
  "prevalent_issues": [
    {
      "pattern": "Description of the error pattern",
      "count": number,
      "severity": "high/medium/low",
      "root_cause": "Explanation",
      "affected_conditions": "e.g., 'Faded receipts', 'Lidl stores', 'Long receipts'",
      "suggested_fix": "Detailed technical suggestion with code references"
    }
  ],
  "correlations": ["Notable patterns found"],
  "priority_recommendations": ["Top improvements to implement first"]
}`;

        const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    summary: { type: "string" },
                    prevalent_issues: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                pattern: { type: "string" },
                                count: { type: "number" },
                                severity: { type: "string" },
                                root_cause: { type: "string" },
                                affected_conditions: { type: "string" },
                                suggested_fix: { type: "string" }
                            }
                        }
                    },
                    correlations: { type: "array", items: { type: "string" } },
                    priority_recommendations: { type: "array", items: { type: "string" } }
                }
            }
        });

        // Update test run with analysis
        const testRun = await base44.asServiceRole.entities.TestRun.get(test_run_id);
        const errorRate = testRun.total_items > 0 ? (stats.total_errors / testRun.total_items) * 100 : 0;

        await base44.asServiceRole.entities.TestRun.update(test_run_id, {
            status: 'analyzed',
            batch_analysis_summary: {
                total_errors: stats.total_errors,
                error_rate: parseFloat(errorRate.toFixed(2)),
                prevalent_issues: llmResponse.prevalent_issues.map(i => i.pattern),
                suggested_improvements: llmResponse.priority_recommendations,
                analysis_date: new Date().toISOString()
            }
        });

        return Response.json({
            success: true,
            stats,
            analysis: llmResponse,
            error_rate: parseFloat(errorRate.toFixed(2))
        });

    } catch (error) {
        console.error("Error analyzing OCR feedback batch:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});