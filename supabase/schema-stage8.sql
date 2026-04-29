-- ============================================================
-- Clerkfolio — Stage 8 Schema: Soft delete, pinned entries, goals
-- Run this in the Supabase SQL Editor after schema-stage7.sql
-- ============================================================

-- Soft delete
alter table public.portfolio_entries add column if not exists deleted_at timestamptz;
alter table public.cases add column if not exists deleted_at timestamptz;

-- Pinned entries
alter table public.portfolio_entries add column if not exists pinned boolean not null default false;
alter table public.cases add column if not exists pinned boolean not null default false;

-- Goals table (used by another feature)
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  target_count int not null default 10,
  created_at timestamptz not null default now()
);
alter table public.goals enable row level security;
drop policy if exists "Users manage their own goals" on public.goals;
create policy "Users manage their own goals"
  on public.goals for all using (auth.uid() = user_id);

-- Indexes
create index if not exists portfolio_entries_not_deleted_idx
  on public.portfolio_entries(user_id, date desc) where deleted_at is null;
create index if not exists cases_not_deleted_idx
  on public.cases(user_id, date desc) where deleted_at is null;
create index if not exists portfolio_entries_pinned_idx
  on public.portfolio_entries(user_id) where pinned = true and deleted_at is null;
create index if not exists cases_pinned_idx
  on public.cases(user_id) where pinned = true and deleted_at is null;
create index if not exists goals_user_idx on public.goals(user_id);
