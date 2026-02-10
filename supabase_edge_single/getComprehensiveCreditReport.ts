import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required.' }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        // Parse request body for date range parameters
        const body = await req.json().catch(() => ({}));
        const { start_date, end_date } = body;

        // Default to current month if no dates provided
        const now = new Date();
        const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const startDate = start_date ? new Date(start_date) : defaultStartDate;
        const endDate = end_date ? new Date(end_date) : defaultEndDate;

        console.log("Fetching logs from:", startDate.toISOString(), "to:", endDate.toISOString());
        
        const [allCreditLogs, users] = await Promise.all([
            base44.asServiceRole.entities.CreditLog.filter({}, "-timestamp", 10000), 
            base44.asServiceRole.entities.User.list()
        ]);
        
        // Filter logs by date range in JavaScript
        const creditLogs = (allCreditLogs || []).filter(log => {
            if (!log.timestamp) return false;
            try {
                const logDate = new Date(log.timestamp);
                return logDate >= startDate && logDate <= endDate;
            } catch (e) {
                console.warn(`Invalid date format for log ID ${log.id}: ${log.timestamp}`);
                return false;
            }
        });
        
        console.log("Fetched total credit logs:", allCreditLogs?.length || 0);
        console.log("Credit logs for selected period:", creditLogs.length);
        console.log("Fetched users:", users?.length || 0);
        
        // Build user-level report
        const report = {};
        const allEventTypes = new Set();
        
        // Initialize report for all users
        if(users) {
            users.forEach(u => {
                if (u.email) {
                    report[u.email] = { totals: { credits: 0, events: 0, textract_scans: 0 } };
                }
            });
        }

        // Process credit logs for the selected period
        creditLogs.forEach(log => {
            allEventTypes.add(log.event_type);
            const userEmail = log.user_email;

            if (!report[userEmail]) {
                report[userEmail] = { totals: { credits: 0, events: 0, textract_scans: 0 } };
            }
            
            if (!report[userEmail][log.event_type]) {
                report[userEmail][log.event_type] = 0;
            }
            
            const credits = log.credits_consumed || 1;
            report[userEmail][log.event_type] += credits;
            report[userEmail].totals.credits += credits;
            report[userEmail].totals.events += 1;

            // Track Textract scans specifically
            if (log.event_type === 'ocr_scan' || log.event_type === 'ocr_scan_background') {
                report[userEmail].totals.textract_scans += 1;
            }
        });

        // Calculate aggregations for KPIs
        const eventTypeAggregations = {};
        allEventTypes.forEach(type => {
            eventTypeAggregations[type] = 0;
        });

        let totalTextractScans = 0;
        creditLogs.forEach(log => {
            eventTypeAggregations[log.event_type] = (eventTypeAggregations[log.event_type] || 0) + (log.credits_consumed || 1);
            if (log.event_type === 'ocr_scan' || log.event_type === 'ocr_scan_background') {
                totalTextractScans += 1;
            }
        });

        // Calculate monthly breakdown for trend chart
        const monthlyBreakdown = {};
        creditLogs.forEach(log => {
            try {
                const logDate = new Date(log.timestamp);
                const monthKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyBreakdown[monthKey]) {
                    monthlyBreakdown[monthKey] = {
                        total_credits: 0,
                        textract_scans: 0,
                        base44_credits: 0
                    };
                }
                
                const credits = log.credits_consumed || 1;
                monthlyBreakdown[monthKey].total_credits += credits;
                
                if (log.event_type === 'ocr_scan' || log.event_type === 'ocr_scan_background') {
                    monthlyBreakdown[monthKey].textract_scans += 1;
                } else {
                    monthlyBreakdown[monthKey].base44_credits += credits;
                }
            } catch (e) {
                console.warn('Error processing log for monthly breakdown:', e);
            }
        });

        const sortedEventTypes = Array.from(allEventTypes).sort();

        console.log("Generated report for", Object.keys(report).length, "users");
        console.log("Event types found:", sortedEventTypes);
        console.log("Total Textract scans:", totalTextractScans);

        return new Response(JSON.stringify({ 
            report, 
            eventTypes: sortedEventTypes,
            eventTypeAggregations,
            totalTextractScans,
            monthlyBreakdown,
            period: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            }
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Error in getComprehensiveCreditReport:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});