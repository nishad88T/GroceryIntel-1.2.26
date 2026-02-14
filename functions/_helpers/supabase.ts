import { createClient } from 'npm:@supabase/supabase-js@2.49.8';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL secret is required');
}

export const createUserClient = (authHeader: string | null) =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {}
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

export const createServiceClient = () =>
  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

export const requireUser = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    return { error: Response.json({ error: 'Missing Authorization Bearer token' }, { status: 401 }) };
  }

  const supabase = createUserClient(authHeader);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { supabase, user: data.user, authHeader };
};
