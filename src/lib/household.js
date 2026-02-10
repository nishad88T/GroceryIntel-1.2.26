import { appClient } from '@/api/appClient';

export async function fetchHouseholdContext() {
    const user = await appClient.auth.me();
    if (!user) {
        return { user: null, householdId: null, household: null, members: [] };
    }

    try {
        const response = await appClient.functions.invoke('getMyHousehold', {});
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
