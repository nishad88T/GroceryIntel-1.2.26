import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const ONS_URL = 'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/mm23/data';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    // Check if user is an admin or has feature access
    const { hasAdvancedAnalytics } = JSON.parse(req.headers.get('x-b44-user-features') || '{}');
    if (user.role !== 'admin' && !hasAdvancedAnalytics) {
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 });
    }

    const response = await fetch(ONS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch ONS data: ${response.statusText}`);
    }
    const data = await response.json();
    
    // Log the credit event upon successful fetch
    try {
        await base44.asServiceRole.entities.CreditLog.create({
            user_id: user.id,
            user_email: user.email,
            household_id: user.household_id,
            event_type: 'ons_data_api',
            credits_consumed: 1,
            timestamp: new Date().toISOString(),
        });
    } catch(logError){
        console.error("Failed to log ONS API credit consumption (non-critical):", logError);
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});