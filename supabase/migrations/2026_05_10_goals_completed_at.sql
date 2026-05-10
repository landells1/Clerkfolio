-- Track completed personal timeline goals.
alter table public.goals
  add column if not exists completed_at timestamptz;

create index if not exists goals_user_incomplete_due_idx
  on public.goals(user_id, due_date)
  where completed_at is null;
