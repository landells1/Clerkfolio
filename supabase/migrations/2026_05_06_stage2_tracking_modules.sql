-- Stage 2 batch 5: tracking modules.
-- Apply manually to Supabase project dldhnstjngendpcywthv (eu-west-2).

create table if not exists public.personal_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('mandatory_training','course','exam','mentor_meeting','oop','rotation','wba_received','teaching_observed')),
  title text not null,
  date date not null,
  expires_at date,
  cpd_hours numeric,
  attempts int,
  score text,
  cost_pence int,
  meta jsonb default '{}',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create index if not exists personal_log_user_kind_idx
  on public.personal_log(user_id, kind, deleted_at);

alter table public.personal_log enable row level security;

drop policy if exists personal_log_sel on public.personal_log;
drop policy if exists personal_log_ins on public.personal_log;
drop policy if exists personal_log_upd on public.personal_log;
drop policy if exists personal_log_del on public.personal_log;

create policy personal_log_sel on public.personal_log
  for select using ((select auth.uid()) = user_id);
create policy personal_log_ins on public.personal_log
  for insert with check ((select auth.uid()) = user_id);
create policy personal_log_upd on public.personal_log
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy personal_log_del on public.personal_log
  for delete using ((select auth.uid()) = user_id);

alter table public.goals
  add column if not exists specific text,
  add column if not exists measurable text,
  add column if not exists achievable text,
  add column if not exists relevant text,
  add column if not exists time_bound text;
