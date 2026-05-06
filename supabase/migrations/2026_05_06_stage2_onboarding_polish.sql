-- Stage 2 batch 9: onboarding and UX polish.
-- Apply manually to Supabase project dldhnstjngendpcywthv (eu-west-2).

alter table public.profiles
  add column if not exists changelog_seen_at timestamptz,
  add column if not exists guided_tour_step int default 0,
  add column if not exists demo_dismissed_at timestamptz,
  add column if not exists timezone text default 'Europe/London',
  add column if not exists pinned_order jsonb default '[]',
  add column if not exists first_per_category jsonb default '{}';

alter table public.portfolio_entries
  add column if not exists is_demo boolean default false;

alter table public.cases
  add column if not exists is_demo boolean default false;
