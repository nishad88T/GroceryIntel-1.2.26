/**
 * Temporary stubs during Legacy platform -> Supabase migration.
 * These allow the app to run while we replace calls properly.
 */

export const SendEmail = async () => {
  // no-op stub
  return { ok: true };
};

export const InvokeLLM = async () => {
  // no-op stub: pretend the LLM returned nothing
  return { ok: true, output: null };
};
