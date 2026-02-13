import { createServiceClient } from './supabase.ts';

export async function resolveHouseholdId(userId: string, fallbackHouseholdId?: string | null) {
  if (fallbackHouseholdId) {
    return fallbackHouseholdId;
  }

  const service = createServiceClient();
  const { data: membership } = await service
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return membership?.household_id || null;
}

export async function getHouseholdMembers(householdId: string) {
  const service = createServiceClient();
  const { data: memberships, error: membershipError } = await service
    .from('household_members')
    .select('*')
    .eq('household_id', householdId);

  if (membershipError || !memberships?.length) {
    return { memberships: [], profiles: [] };
  }

  const userIds = memberships.map((member) => member.user_id);
  const { data: profiles } = await service
    .from('profiles')
    .select('*')
    .in('id', userIds);

  return {
    memberships,
    profiles: profiles || []
  };
}
