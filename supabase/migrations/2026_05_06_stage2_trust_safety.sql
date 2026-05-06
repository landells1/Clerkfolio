-- Stage 2 batch 12: trust, safety, and accessibility.
-- Apply manually to Supabase project dldhnstjngendpcywthv (eu-west-2).

alter table public.profiles
  add column if not exists display_prefs jsonb not null default '{}'::jsonb;

create table if not exists public.session_fingerprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_hash text not null,
  user_agent text,
  last_seen_at timestamptz default now(),
  revoked_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists session_fingerprints_user_idx
  on public.session_fingerprints(user_id, revoked_at);

create unique index if not exists session_fingerprints_active_uq
  on public.session_fingerprints(user_id, ip_hash, coalesce(user_agent, ''))
  where revoked_at is null;

alter table public.session_fingerprints enable row level security;

drop policy if exists sess_fp_sel on public.session_fingerprints;
drop policy if exists sess_fp_upd on public.session_fingerprints;

create policy sess_fp_sel on public.session_fingerprints
  for select using ((select auth.uid()) = user_id);
create policy sess_fp_upd on public.session_fingerprints
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
