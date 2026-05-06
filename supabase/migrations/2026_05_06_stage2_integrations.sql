-- Stage 2 batch 10: notifications and integrations.
-- Apply manually to Supabase project dldhnstjngendpcywthv (eu-west-2).

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  prefix text not null,
  hash text not null,
  scopes text[] default '{read}',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, name)
);

create unique index if not exists api_keys_hash_idx
  on public.api_keys(hash);

create index if not exists api_keys_user_active_idx
  on public.api_keys(user_id, revoked_at, created_at desc);

alter table public.api_keys enable row level security;

drop policy if exists api_keys_sel on public.api_keys;
drop policy if exists api_keys_ins on public.api_keys;
drop policy if exists api_keys_upd on public.api_keys;
drop policy if exists api_keys_del on public.api_keys;

create policy api_keys_sel on public.api_keys
  for select using ((select auth.uid()) = user_id);
create policy api_keys_ins on public.api_keys
  for insert with check ((select auth.uid()) = user_id);
create policy api_keys_upd on public.api_keys
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy api_keys_del on public.api_keys
  for delete using ((select auth.uid()) = user_id);

alter table public.share_links
  add column if not exists view_webhook_url text;

alter table public.share_links
  drop constraint if exists share_links_view_webhook_url_check;

alter table public.share_links
  add constraint share_links_view_webhook_url_check
  check (view_webhook_url is null or view_webhook_url ~* '^https?://');
