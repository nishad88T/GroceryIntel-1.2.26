# Supabase State (as of 2026-02-04)

This document records what is already configured in the Supabase project so code changes and migrations can be compared safely.

## Project
- Supabase URL: https://kpuyrywsomuhnnbbzovg.supabase.co
- Auth: Supabase Auth (`auth.users`)

---

## Extensions enabled

| extname            | extversion |
| ------------------ | ---------- |
| pg_graphql         | 1.5.11     |
| pg_stat_statements | 1.11       |
| pgcrypto           | 1.3        |
| plpgsql            | 1.0        |
| supabase_vault     | 0.3.1      |
| uuid-ossp          | 1.1        |

Notes:
- `pgcrypto` and `uuid-ossp` are already enabled; do not re-enable unless needed.

---

## Tables

### auth schema
- auth.audit_log_entries
- auth.flow_state
- auth.identities
- auth.instances
- auth.mfa_amr_claims
- auth.mfa_challenges
- auth.mfa_factors
- auth.oauth_authorizations
- auth.oauth_client_states
- auth.oauth_clients
- auth.oauth_consents
- auth.one_time_tokens
- auth.refresh_tokens
- auth.saml_providers
- auth.saml_relay_states
- auth.schema_migrations
- auth.sessions
- auth.sso_domains
- auth.sso_providers
- auth.users

### public schema
- public.budgets
- public.categories
- public.file_objects
- public.household_invitations
- public.household_members
- public.households
- public.meal_plan_items
- public.meal_plans
- public.profiles
- public.receipt_items
- public.receipts
- public.recipe_folder_items
- public.recipe_folders
- public.recipes
- public.shopping_list_items
- public.shopping_lists

Important schema decisions:
- User profile table is `public.profiles` (NOT `public.users`).
- Household membership is modeled via `public.household_members` (NOT `users.household_id`).

---

## Auth provisioning (trigger + function)

### Trigger (auth.users)
- Trigger name: `on_auth_user_created`
- Timing: AFTER INSERT on `auth.users`
- Action: `EXECUTE FUNCTION handle_new_user()`

### Function: `public.handle_new_user()`
Inserts/updates a profile row:

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;
Household + Invite functions
Function: public.create_household_and_join(household_name text) returns households
sql
Copy code
create or replace function public.create_household_and_join(household_name text)
returns households
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  h public.households;
begin
  insert into public.households (name, created_by)
  values (household_name, auth.uid())
  returning * into h;

  insert into public.household_members (household_id, user_id, role)
  values (h.id, auth.uid(), 'owner')
  on conflict do nothing;

  return h;
end;
$$;
Function: public.is_household_admin(h_id uuid) returns boolean
sql
Copy code
create or replace function public.is_household_admin(h_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = h_id
      and hm.user_id = auth.uid()
      and hm.role in ('owner','admin')
  );
$$;
Function: public.is_household_member(h_id uuid) returns boolean
sql
Copy code
create or replace function public.is_household_member(h_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = h_id
      and hm.user_id = auth.uid()
  );
$$;
Function: public.generate_invite_code(len integer default 8) returns text
(min length enforced at 6)

sql
Copy code
create or replace function public.generate_invite_code(len integer default 8)
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  if len < 6 then
    len := 6;
  end if;

  for i in 1..len loop
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  end loop;

  return result;
end;
$$;
Function: public.create_household_invite_code(...) returns household_invitations
Supports expiry, max uses, collision retry, and admin check.

sql
Copy code
create or replace function public.create_household_invite_code(
  p_household_id uuid,
  p_max_uses integer default 1,
  p_expires_at timestamptz default null,
  p_code_length integer default 8
)
returns household_invitations
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  inv public.household_invitations;
  new_code text;
  tries int := 0;
begin
  if p_max_uses is null or p_max_uses < 1 then
    raise exception 'max_uses must be >= 1';
  end if;

  if not public.is_household_admin(p_household_id) then
    raise exception 'not authorized';
  end if;

  loop
    tries := tries + 1;
    new_code := public.generate_invite_code(p_code_length);

    begin
      insert into public.household_invitations (
        household_id, code, created_by, expires_at, max_uses, uses
      )
      values (
        p_household_id, new_code, auth.uid(), p_expires_at, p_max_uses, 0
      )
      returning * into inv;

      exit;
    exception when unique_violation then
      if tries >= 10 then
        raise exception 'could not generate unique code';
      end if;
    end;
  end loop;

  return inv;
end;
$$;
Function: public.join_household_by_code(p_code text) returns uuid
Race-safe consumption of invite uses (atomic update returning row), then idempotent membership insert.

sql
Copy code
create or replace function public.join_household_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_code text;
  inv public.household_invitations;
begin
  v_code := upper(trim(p_code));

  if v_code is null or length(v_code) < 4 then
    raise exception 'invalid code';
  end if;

  update public.household_invitations hi
  set uses = uses + 1
  where hi.code = v_code
    and (hi.expires_at is null or hi.expires_at >= now())
    and hi.uses < hi.max_uses
  returning * into inv;

  if not found then
    select * into inv
    from public.household_invitations
    where code = v_code
    limit 1;

    if not found then
      raise exception 'code not found';
    elsif inv.expires_at is not null and inv.expires_at < now() then
      raise exception 'code expired';
    else
      raise exception 'code already used';
    end if;
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (inv.household_id, auth.uid(), 'member')
  on conflict do nothing;

  return inv.household_id;
end;
$$;
updated_at helper
Function: public.set_updated_at()
sql
Copy code
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
Note: triggers using this helper may or may not be attached to each table; review repo/migrations.

Row Level Security (RLS) policies summary
RLS is used broadly; access generally depends on:

is_household_member(household_id) for SELECT/UPDATE

is_household_admin(household_id or id) for DELETE and some UPDATE

INSERT checks typically require membership + created_by = auth.uid()

policies (from pg_policies)
budgets:

SELECT: is_household_member(household_id)

INSERT: is_household_member(household_id) AND created_by = auth.uid()

UPDATE: is_household_member(household_id)

DELETE: is_household_admin(household_id)

categories:

SELECT/UPDATE: is_household_member(household_id)

INSERT: is_household_member(household_id) AND (created_by is null OR created_by = auth.uid())

DELETE: is_household_admin(household_id)

file_objects:

SELECT/UPDATE: is_household_member(household_id)

INSERT: is_household_member(household_id) AND created_by = auth.uid() AND bucket='uploads'

DELETE: is_household_admin(household_id)

household_invitations:

SELECT: is_household_member(household_id)

INSERT: is_household_admin(household_id) AND created_by = auth.uid()

UPDATE: is_household_admin(household_id) (with_check true)

household_members:

SELECT: is_household_member(household_id)

households:

SELECT: is_household_member(id)

INSERT: created_by = auth.uid()

UPDATE: is_household_admin(id) (with_check true)

meal_plans / meal_plan_items, receipts / receipt_items, recipes / folders / folder_items, shopping_lists / items:

SELECT/UPDATE: is_household_member(household_id)

INSERT: is_household_member(household_id) plus table-specific checks

DELETE: is_household_admin(household_id)

profiles:

SELECT: id = auth.uid()

UPDATE: id = auth.uid()

Full policy listing available from pg_policies output in chat.

Notes for developers / Codex
Do NOT implement public.users or users.household_id. The canonical model is public.profiles + public.household_members.

Auth provisioning is already wired (auth.users trigger to public.handle_new_user()).

Household + invite flows are already implemented and should be used by frontend/backend.

Main remaining work is usually: ensuring repo code matches this schema, verifying constraints/indexes, and ensuring updated_at triggers are attached where needed.
