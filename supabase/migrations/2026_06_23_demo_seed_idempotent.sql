-- Batch 2 / F-014: the demo starter pack must seed exactly once per account.
-- The old seed (lib/onboarding/demo-seed.ts) ran a non-atomic count-then-insert
-- on every dashboard render, so two near-simultaneous renders could each pass
-- the guard and both insert -> duplicate "Demo audit/case - edit me" rows.
--
-- Fix in two parts:
--   1. De-duplicate any existing active demo rows (keep the earliest per user),
--      so the partial unique index below can be created.
--   2. Add a partial unique index guaranteeing at most one active demo row per
--      user per table. The seed insert now tolerates 23505 as a no-op, and the
--      seed itself moves into /api/onboarding/complete (runs once), off the
--      dashboard render hot-path (F-031).
--
-- Backward-compatible with the previously-deployed code: the old
-- ensureDemoStarterPack ignored insert errors, so a racing duplicate insert
-- simply fails silently against this index instead of creating a dupe.

with ranked as (
  select id, row_number() over (partition by user_id order by created_at, id) as rn
  from public.portfolio_entries
  where is_demo = true and deleted_at is null
)
update public.portfolio_entries pe
set deleted_at = now()
from ranked
where pe.id = ranked.id and ranked.rn > 1;

with ranked as (
  select id, row_number() over (partition by user_id order by created_at, id) as rn
  from public.cases
  where is_demo = true and deleted_at is null
)
update public.cases c
set deleted_at = now()
from ranked
where c.id = ranked.id and ranked.rn > 1;

create unique index if not exists portfolio_entries_one_active_demo_per_user
  on public.portfolio_entries (user_id)
  where is_demo = true and deleted_at is null;

create unique index if not exists cases_one_active_demo_per_user
  on public.cases (user_id)
  where is_demo = true and deleted_at is null;
