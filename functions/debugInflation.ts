import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' });
        }

        // 1. Check UserCountry
        const userCountry = await base44.entities.UserCountry.filter({ user_id: user.id });

        // 2. Check raw InflationData (latest 5)
        const sampleData = await base44.entities.InflationData.filter({}, "-period_date", 5);

        // 3. Check raw InflationData for specific query (GB, ONS)
        const gbData = await base44.entities.InflationData.filter({
            country_code: 'GB',
            statistical_source: 'ONS'
        }, "-period_date", 5);

        // 4. Try to reproduce getInflationComparison logic
        let debugInfo = {
            step: "init",
            anchorDate: null,
            currentMonthString: null,
            oneMonthAgoString: null,
            currentIndicesFound: 0,
            oneMonthIndicesFound: 0,
            sampleCurrentIndex: null
        };

        if (gbData.length > 0) {
            const latestRecord = gbData[0];
            const anchorDate = new Date(latestRecord.period_date);
            debugInfo.anchorDate = anchorDate;

            const currentMonth = new Date(anchorDate);
            const oneMonthAgo = new Date(anchorDate);
            oneMonthAgo.setMonth(anchorDate.getMonth() - 1);

            const formatDate = (date) => date.toISOString().split('T')[0];
            const currentDateStr = formatDate(currentMonth);
            const oneMonthAgoStr = formatDate(oneMonthAgo);

            debugInfo.currentMonthString = currentDateStr;
            debugInfo.oneMonthAgoString = oneMonthAgoStr;

            const currentRecords = await base44.entities.InflationData.filter({
                country_code: 'GB',
                statistical_source: 'ONS',
                period_date: currentDateStr
            });
            
            const previousRecords = await base44.entities.InflationData.filter({
                country_code: 'GB',
                statistical_source: 'ONS',
                period_date: oneMonthAgoStr
            });

            debugInfo.currentIndicesFound = currentRecords.length;
            debugInfo.oneMonthIndicesFound = previousRecords.length;
            debugInfo.sampleCurrentIndex = currentRecords.length > 0 ? currentRecords[0] : null;
        }

        return Response.json({
            user: { email: user.email, currency: user.currency },
            userCountry,
            sampleData,
            gbData,
            debugInfo
        });

    } catch (error) {
        return Response.json({ error: error.message, stack: error.stack });
    }
});