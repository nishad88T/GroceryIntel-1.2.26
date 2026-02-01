import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all OCR feedback and correction logs using service role for admin analysis
        const [feedbackData, correctionData] = await Promise.all([
            base44.asServiceRole.entities.OCRFeedback.list('-created_date', 1000),
            base44.asServiceRole.entities.CorrectionLog.list('-created_date', 1000)
        ]);

        // Analyze feedback patterns
        const feedbackAnalysis = analyzeFeedbackPatterns(feedbackData);
        const correctionAnalysis = analyzeCorrectionPatterns(correctionData);

        // Generate improvement suggestions
        const suggestions = generateImprovementSuggestions(feedbackAnalysis, correctionAnalysis);

        return Response.json({
            summary: {
                total_feedback: feedbackData.length,
                total_corrections: correctionData.length,
                average_rating: feedbackAnalysis.averageRating,
                top_issues: feedbackAnalysis.topIssues,
                success_rate: correctionAnalysis.averageSuccessRate
            },
            feedback_analysis: feedbackAnalysis,
            correction_analysis: correctionAnalysis,
            improvement_suggestions: suggestions
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function analyzeFeedbackPatterns(feedbackData) {
    if (!feedbackData || feedbackData.length === 0) {
        return { averageRating: 0, topIssues: [], commonComplaints: [] };
    }

    const totalRatings = feedbackData.reduce((sum, f) => sum + (f.rating || 0), 0);
    const averageRating = totalRatings / feedbackData.length;

    // Count issues
    const issueCount = {};
    feedbackData.forEach(feedback => {
        if (feedback.issues && Array.isArray(feedback.issues)) {
            feedback.issues.forEach(issue => {
                issueCount[issue] = (issueCount[issue] || 0) + 1;
            });
        }
    });

    const topIssues = Object.entries(issueCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([issue, count]) => ({ issue, count, percentage: (count / feedbackData.length * 100).toFixed(1) }));

    // Analyze feedback text for common complaints
    const commonComplaints = extractCommonComplaints(feedbackData);

    return {
        averageRating: parseFloat(averageRating.toFixed(2)),
        topIssues,
        commonComplaints,
        ratingDistribution: getRatingDistribution(feedbackData)
    };
}

function analyzeCorrectionPatterns(correctionData) {
    if (!correctionData || correctionData.length === 0) {
        return { averageSuccessRate: 0, commonCorrections: [] };
    }

    const totalSuccessRate = correctionData.reduce((sum, c) => sum + (c.success_rate || 0), 0);
    const averageSuccessRate = totalSuccessRate / correctionData.length;

    // Analyze what gets corrected most often
    const correctionTypes = {};
    correctionData.forEach(correction => {
        if (correction.items_corrected && correction.items_corrected > 0) {
            // This could be expanded to analyze specific types of corrections
            // For now, we'll categorize by success rate ranges
            const rate = correction.success_rate || 0;
            const category = rate < 50 ? 'poor' : rate < 75 ? 'fair' : rate < 90 ? 'good' : 'excellent';
            correctionTypes[category] = (correctionTypes[category] || 0) + 1;
        }
    });

    return {
        averageSuccessRate: parseFloat(averageSuccessRate.toFixed(2)),
        correctionDistribution: correctionTypes,
        averageItemsCorrected: correctionData.reduce((sum, c) => sum + (c.items_corrected || 0), 0) / correctionData.length
    };
}

function generateImprovementSuggestions(feedbackAnalysis, correctionAnalysis) {
    const suggestions = [];

    // Rating-based suggestions
    if (feedbackAnalysis.averageRating < 3) {
        suggestions.push({
            priority: 'high',
            category: 'overall_accuracy',
            suggestion: 'OCR accuracy is critically low. Consider revising the main LLM prompt for receipt processing.',
            data: `Average rating: ${feedbackAnalysis.averageRating}/5`
        });
    }

    // Issue-specific suggestions
    feedbackAnalysis.topIssues.forEach(issue => {
        if (issue.count > feedbackAnalysis.topIssues.length * 0.1) { // If issue affects >10% of feedback
            let suggestion = '';
            switch (issue.issue) {
                case 'missed_items':
                    suggestion = 'Items are frequently missed. Improve prompt to emphasize complete item detection and line-by-line scanning.';
                    break;
                case 'wrong_prices':
                    suggestion = 'Price matching is problematic. Enhance prompt to focus on price-to-item alignment and verification.';
                    break;
                case 'wrong_quantities':
                    suggestion = 'Quantity detection needs improvement. Add specific instructions for quantity parsing.';
                    break;
                case 'missed_discounts':
                    suggestion = 'Discount detection is poor. Add specific guidance for identifying offers and promotional prices.';
                    break;
                default:
                    suggestion = `Address frequent issue: ${issue.issue}`;
            }
            
            suggestions.push({
                priority: issue.percentage > 20 ? 'high' : 'medium',
                category: issue.issue,
                suggestion,
                data: `${issue.count} reports (${issue.percentage}%)`
            });
        }
    });

    // Success rate suggestions
    if (correctionAnalysis.averageSuccessRate < 70) {
        suggestions.push({
            priority: 'high',
            category: 'extraction_accuracy',
            suggestion: 'Overall extraction success rate is low. Consider fundamental changes to the OCR processing approach.',
            data: `Success rate: ${correctionAnalysis.averageSuccessRate}%`
        });
    }

    return suggestions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
}

function extractCommonComplaints(feedbackData) {
    // Simple keyword analysis of feedback text
    const keywords = {};
    feedbackData.forEach(feedback => {
        if (feedback.feedback_text && typeof feedback.feedback_text === 'string') {
            const words = feedback.feedback_text.toLowerCase()
                .split(/\W+/)
                .filter(word => word.length > 3);
            words.forEach(word => {
                keywords[word] = (keywords[word] || 0) + 1;
            });
        }
    });

    return Object.entries(keywords)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));
}

function getRatingDistribution(feedbackData) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbackData.forEach(feedback => {
        if (feedback.rating >= 1 && feedback.rating <= 5) {
            distribution[feedback.rating]++;
        }
    });
    return distribution;
}