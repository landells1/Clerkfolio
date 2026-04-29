-- ============================================================
-- Clerkfolio — Stage 4 Schema
-- Run this in the Supabase SQL Editor after schema-stage3.sql
-- ============================================================

create table public.deadlines (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  title      text not null,
  due_date   date not null,
  created_at timestamptz default now()
);

alter table public.deadlines enable row level security;

create policy "Users can view own deadlines"
  on public.deadlines for select
  using (auth.uid() = user_id);

create policy "Users can insert own deadlines"
  on public.deadlines for insert
  with check (auth.uid() = user_id);

create policy "Users can update own deadlines"
  on public.deadlines for update
  using (auth.uid() = user_id);

create policy "Users can delete own deadlines"
  on public.deadlines for delete
  using (auth.uid() = user_id);

create index deadlines_user_id_idx on public.deadlines(user_id, due_date asc);
