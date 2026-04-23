-- ============================================================
-- Clinidex — Stage 9 Schema: Specialty applications, entry links, RLS soft-delete fix
-- Run this in the Supabase SQL Editor after schema-stage8.sql
-- ============================================================

-- ── Specialty applications ────────────────────────────────────────────────────
-- Tracks a user's saved application for a specific specialty (e.g. IMT 2026)

create table if not exists public.specialty_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  specialty_key text not null,
  bonus_claimed boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.specialty_applications enable row level security;

drop policy if exists "Users manage own specialty applications" on public.specialty_applications;
create policy "Users manage own specialty applications"
  on public.specialty_applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists specialty_apps_user_idx
  on public.specialty_applications(user_id);

create index if not exists specialty_apps_user_key_idx
  on public.specialty_applications(user_id, specialty_key);


-- ── Specialty entry links ─────────────────────────────────────────────────────
-- Links individual portfolio/case entries to a domain within an application

create table if not exists public.specialty_entry_links (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.specialty_applications(id) on delete cascade,
  domain_key     text not null,
  entry_id       uuid not null,
  entry_type     text not null check (entry_type in ('portfolio', 'case')),
  band_label     text,
  points_claimed int,
  is_checkbox    boolean not null default false,
  created_at     timestamptz not null default now()
);

alter table public.specialty_entry_links enable row level security;

drop policy if exists "Users manage own specialty entry links" on public.specialty_entry_links;
create policy "Users manage own specialty entry links"
  on public.specialty_entry_links for all
  using (
    application_id in (
      select id from public.specialty_applications where user_id = auth.uid()
    )
  )
  with check (
    application_id in (
      select id from public.specialty_applications where user_id = auth.uid()
    )
  );

create index if not exists specialty_links_app_idx
  on public.specialty_entry_links(application_id);

create index if not exists specialty_links_entry_idx
  on public.specialty_entry_links(entry_id, entry_type);


-- ── Ensure soft-delete columns exist (idempotent — safe if stage 8 already ran) ──
alter table public.portfolio_entries add column if not exists deleted_at timestamptz;
alter table public.cases            add column if not exists deleted_at timestamptz;


-- ── Fix soft-delete RLS gap ───────────────────────────────────────────────────
-- The original SELECT policies don't filter out soft-deleted rows.
-- Drop and recreate them to include deleted_at IS NULL.

drop policy if exists "Users can view own portfolio entries" on public.portfolio_entries;
create policy "Users can view own portfolio entries"
  on public.portfolio_entries for select
  using (auth.uid() = user_id and deleted_at is null);

drop policy if exists "Users can view own cases" on public.cases;
create policy "Users can view own cases"
  on public.cases for select
  using (auth.uid() = user_id and deleted_at is null);


-- ── Backfill and enforce NOT NULL on trial_started_at ────────────────────────
update public.profiles set trial_started_at = now() where trial_started_at is null;
alter table public.profiles alter column trial_started_at set not null;


-- ── Auto-update updated_at on specialty_applications ─────────────────────────
drop trigger if exists on_specialty_application_updated on public.specialty_applications;
create trigger on_specialty_application_updated
  before update on public.specialty_applications
  for each row execute procedure public.handle_updated_at();
