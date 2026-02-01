import {
  subMonths, subYears
} from 'date-fns';

/**
 * Calculates budget-aligned periods for comparison based on the active budget and a selected preset.
 * Assumes activeBudget.period_start and activeBudget.period_end are already correctly set Date strings (ISO 8601).
 *
 * @param {object} activeBudget - The active budget object from the Budget entity.
 * @param {string} selectedPreset - The chosen comparison preset ('default', 'month-on-month', '3-months-ago', '6-months-ago', 'year-on-year', '2-years-ago').
 * @returns {{current: {from: Date, to: Date}|null, comparison: {from: Date, to: Date}|null}}
 */
export const getBudgetAlignedPeriods = (activeBudget, selectedPreset) => {
    if (!activeBudget || !activeBudget.period_start || !activeBudget.period_end) {
        return { current: null, comparison: null };
    }

    const currentPeriodStart = new Date(activeBudget.period_start);
    const currentPeriodEnd = new Date(activeBudget.period_end);

    let comparisonPeriodStart = null;
    let comparisonPeriodEnd = null;

    switch (selectedPreset) {
        case 'month-on-month':
            comparisonPeriodStart = subMonths(currentPeriodStart, 1);
            comparisonPeriodEnd = subMonths(currentPeriodEnd, 1);
            break;
        case '3-months-ago':
            comparisonPeriodStart = subMonths(currentPeriodStart, 3);
            comparisonPeriodEnd = subMonths(currentPeriodEnd, 3);
            break;
        case '6-months-ago':
            comparisonPeriodStart = subMonths(currentPeriodStart, 6);
            comparisonPeriodEnd = subMonths(currentPeriodEnd, 6);
            break;
        case 'year-on-year':
            comparisonPeriodStart = subYears(currentPeriodStart, 1);
            comparisonPeriodEnd = subYears(currentPeriodEnd, 1);
            break;
        case '2-years-ago':
            comparisonPeriodStart = subYears(currentPeriodStart, 2);
            comparisonPeriodEnd = subYears(currentPeriodEnd, 2);
            break;
        default: // 'default' preset (or no preset selected) will only show the current period
            break;
    }

    return {
        current: { from: currentPeriodStart, to: currentPeriodEnd },
        comparison: comparisonPeriodStart && comparisonPeriodEnd ? { from: comparisonPeriodStart, to: comparisonPeriodEnd } : null,
    };
};

// Helper function to filter receipts by a given period.
// This is already present in AnalyticsPage.js, but will be centralized here for reusability.
export const filterReceiptsByPeriod = (receipts, period) => {
    if (!period || !period.from || !period.to || !receipts) return [];
    
    try {
        return receipts.filter(r => {
            if (!r.purchase_date) return false;
            const purchaseDate = new Date(r.purchase_date);
            if (isNaN(purchaseDate.getTime())) return false;
            const fromDate = period.from instanceof Date ? period.from : new Date(period.from);
            const toDate = period.to instanceof Date ? period.to : new Date(period.to);
            if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return false;
            return purchaseDate >= fromDate && purchaseDate <= toDate;
        });
    } catch (error) {
        console.error('Error filtering receipts by period:', error);
        return [];
    }
};