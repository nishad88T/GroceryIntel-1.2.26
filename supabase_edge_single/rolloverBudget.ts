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


import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { addMonths, addWeeks, addDays, startOfMonth, endOfMonth, format } from 'npm:date-fns@3.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const householdId = await resolveHouseholdId(base44, user);
        if (!householdId) {
            return Response.json({ error: 'User does not have a household assigned.' }, { status: 400 });
        }

        console.log("=== BUDGET ROLLOVER STARTED ===");
        console.log(`User: ${user.email}, Household: ${householdId}`);

        // Find the current active budget
        const activeBudgets = await base44.asServiceRole.entities.Budget.filter({
            household_id: householdId,
            is_active: true
        });

        if (!activeBudgets || activeBudgets.length === 0) {
            return Response.json({ 
                success: false, 
                message: 'No active budget found to roll over.' 
            }, { status: 400 });
        }

        const currentBudget = activeBudgets[0];
        console.log("Current active budget:", currentBudget);

        const now = new Date();
        const periodEnd = new Date(currentBudget.period_end);
        
        // Check if budget period has actually ended
        if (periodEnd >= now) {
            return Response.json({ 
                success: false, 
                message: `Budget period is still active until ${format(periodEnd, 'MMM d, yyyy')}. Cannot roll over yet.`,
                current_period_end: currentBudget.period_end
            }, { status: 400 });
        }

        console.log("Budget period has ended. Proceeding with rollover...");

        // Calculate total spending for the expired budget period (for record-keeping)
        const receiptsInPeriod = await base44.asServiceRole.entities.Receipt.filter({
            household_id: householdId
        });
        
        const periodReceipts = receiptsInPeriod.filter(r => {
            const purchaseDate = new Date(r.purchase_date);
            const start = new Date(currentBudget.period_start);
            const end = new Date(currentBudget.period_end);
            return purchaseDate >= start && purchaseDate <= end;
        });

        const totalSpent = periodReceipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
        console.log(`Total spent in expired period: ${totalSpent}`);

        // Mark current budget as inactive and record total spending
        await base44.asServiceRole.entities.Budget.update(currentBudget.id, {
            is_active: false,
            total_spent: totalSpent
        });
        console.log("Marked old budget as inactive");

        // Calculate new period dates based on budget type
        let newPeriodStart, newPeriodEnd;
        
        switch (currentBudget.type) {
            case 'monthly': {
                // Standard calendar monthly
                newPeriodStart = startOfMonth(addMonths(periodEnd, 1));
                newPeriodEnd = endOfMonth(newPeriodStart);
                break;
            }
                
            case 'weekly': {
                // Weekly cycle
                newPeriodStart = addWeeks(new Date(currentBudget.period_start), 1);
                newPeriodEnd = addWeeks(new Date(currentBudget.period_end), 1);
                break;
            }
                
            case 'custom_monthly': {
                // Custom monthly (e.g., payday cycle)
                if (!currentBudget.start_day) {
                    return Response.json({ 
                        success: false, 
                        message: 'Custom monthly budget missing start_day configuration.' 
                    }, { status: 400 });
                }
                
                // Move to next month, same start_day
                const nextMonthStart = addMonths(new Date(currentBudget.period_start), 1);
                newPeriodStart = nextMonthStart;
                
                // End date is the day before next cycle starts
                const followingMonthStart = addMonths(nextMonthStart, 1);
                newPeriodEnd = addDays(followingMonthStart, -1);
                break;
            }
                
            default:
                return Response.json({ 
                    success: false, 
                    message: `Unknown budget type: ${currentBudget.type}` 
                }, { status: 400 });
        }

        console.log(`New period calculated: ${format(newPeriodStart, 'yyyy-MM-dd')} to ${format(newPeriodEnd, 'yyyy-MM-dd')}`);

        // Create new budget with SAME amount (fresh start - no rollover of balance)
        const newBudget = {
            type: currentBudget.type,
            amount: currentBudget.amount, // Start fresh with same budget amount each period
            currency: currentBudget.currency,
            period_start: format(newPeriodStart, 'yyyy-MM-dd'),
            period_end: format(newPeriodEnd, 'yyyy-MM-dd'),
            start_day: currentBudget.start_day,
            category_limits: currentBudget.category_limits || {},
            is_active: true,
            household_id: householdId,
            user_email: user.email
        };

        const createdBudget = await base44.asServiceRole.entities.Budget.create(newBudget);
        console.log("Created new budget:", createdBudget);

        const remainingBudget = currentBudget.amount - totalSpent;

        return Response.json({
            success: true,
            message: `Budget successfully rolled over to new period (${format(newPeriodStart, 'MMM d')} - ${format(newPeriodEnd, 'MMM d, yyyy')})`,
            old_budget: {
                id: currentBudget.id,
                period: `${format(new Date(currentBudget.period_start), 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`,
                total_spent: totalSpent,
                budget_amount: currentBudget.amount,
                remaining: remainingBudget
            },
            new_budget: {
                id: createdBudget.id,
                period: `${format(newPeriodStart, 'MMM d')} - ${format(newPeriodEnd, 'MMM d, yyyy')}`,
                budget_amount: createdBudget.amount
            }
        });

    } catch (error) {
        console.error("Budget rollover error:", error);
        return Response.json({ 
            success: false, 
            error: error.message || 'Failed to roll over budget' 
        }, { status: 500 });
    }
});
