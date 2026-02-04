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
