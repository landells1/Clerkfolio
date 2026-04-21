-- ============================================================
-- Clinidex — Stage 3 Schema
-- Run this in the Supabase SQL Editor after schema-stage2.sql
-- ============================================================

create table public.cases (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  title           text not null,
  date            date not null,
  clinical_domain text,
  specialty_tags  text[] default '{}',
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Row-level security
alter table public.cases enable row level security;

create policy "Users can view own cases"
  on public.cases for select
  using (auth.uid() = user_id);

create policy "Users can insert own cases"
  on public.cases for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cases"
  on public.cases for update
  using (auth.uid() = user_id);

create policy "Users can delete own cases"
  on public.cases for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create trigger on_case_updated
  before update on public.cases
  for each row execute procedure public.handle_updated_at();

-- Indexes
create index cases_user_id_idx on public.cases(user_id);
create index cases_date_idx on public.cases(user_id, date desc);
