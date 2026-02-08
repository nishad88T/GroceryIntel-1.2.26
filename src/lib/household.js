import { base44 } from '@/api/base44Client';

export async function fetchHouseholdContext() {
    const user = await base44.auth.me();
    if (!user) {
        return { user: null, householdId: null, household: null, members: [] };
    }

    try {
        const response = await base44.functions.invoke('getMyHousehold', {});
        const household = response?.data?.household || null;
        const members = response?.data?.members || [];

        if (household?.id) {
            return { user, householdId: household.id, household, members };
        }
    } catch (error) {
        console.warn('[fetchHouseholdContext] Fallback to user profile household_id:', error?.message || error);
    }

    return { user, householdId: user.household_id || null, household: null, members: [] };
}
