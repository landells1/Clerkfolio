-- ============================================================
-- Clinidex — Stage 1 Schema
-- Run this in the Supabase SQL Editor for your project
-- ============================================================

-- Profiles table: one row per user, created automatically on signup
create table public.profiles (
  id                  uuid references auth.users(id) on delete cascade primary key,
  first_name          text,
  last_name           text,
  career_stage        text check (career_stage in ('Y1-2', 'Y3-4', 'Y5-6', 'FY1', 'FY2')),
  specialty_interests text[]   default '{}',
  onboarding_complete boolean  default false,
  trial_started_at    timestamptz default now(),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Row-level security: users can only access their own profile
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, trial_started_at)
  values (new.id, now());
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update the updated_at timestamp on any profile change
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
