-- Supabase Edge Function + DB setup scaffolding
-- NOTE: Adjust schemas, policies, and extensions to match your existing project.

-- 1) Required extensions (enable only what you need)
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- 2) HTTP helpers for edge/webhook coordination (optional)
-- Supabase already supports HTTP from Edge functions; this is DB-side only when needed.

-- 3) Core triggers for user provisioning
-- Assumes a public.users table with id (uuid), email, household_id, etc.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Bind to auth.users if not already present
-- drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- 4) Household helper: create and join
create or replace function public.create_household_and_join(household_name text)
returns uuid
language plpgsql
security definer
as $$
declare
  new_household_id uuid := gen_random_uuid();
begin
  insert into public.households (id, name, admin_id)
  values (new_household_id, household_name, auth.uid());

  update public.users
  set household_id = new_household_id
  where id = auth.uid();

  return new_household_id;
end;
$$;

-- 5) Invite code generation helper
create or replace function public.generate_invite_code(len integer default 8)
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..len loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.create_household_invite_code(p_household_id uuid, p_max_use integer default 1)
returns text
language plpgsql
security definer
as $$
declare
  code text := public.generate_invite_code(8);
begin
  insert into public.household_invitations (household_id, code, max_uses)
  values (p_household_id, code, p_max_use);
  return code;
end;
$$;

create or replace function public.join_household_by_code(p_code text)
returns uuid
language plpgsql
security definer
as $$
declare
  h_id uuid;
begin
  select household_id into h_id
  from public.household_invitations
  where code = p_code
  and (uses < max_uses)
  limit 1;

  if h_id is null then
    raise exception 'Invalid or expired invite code';
  end if;

  update public.users
  set household_id = h_id
  where id = auth.uid();

  update public.household_invitations
  set uses = uses + 1
  where code = p_code;

  return h_id;
end;
$$;

-- 6) Updated-at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Example trigger usage
-- create trigger set_receipts_updated_at
-- before update on public.receipts
-- for each row execute procedure public.set_updated_at();

-- 7) Minimal policies scaffold (example only)
-- Enable RLS on key tables
-- alter table public.users enable row level security;
-- create policy "users_self_read" on public.users
-- for select using (auth.uid() = id);

