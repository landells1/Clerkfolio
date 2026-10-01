-- 2026-10-01 QA fixes: goal titles + entry-date streak cache.
--
-- 1. goals.title: an explicit, optional goal title (the SMART "specific" field
--    was doing double duty as the title). Additive and nullable; existing rows
--    keep rendering from `specific` / the category count until edited.
--
-- 2. profiles.streak_cache: active weeks are now derived from each entry's own
--    date (portfolio_entries.date / cases.date), not created_at, so a doctor
--    who backfills six months of entries gets the weeks they actually worked.
--    This one-off rebuild brings every cached value onto the new basis so the
--    weekly/monthly digest streak lines agree with the dashboard straight
--    away; the nightly streak-cache cron keeps it current from here. Same
--    shape as the cron writes: ISO week keys (IYYY-"W"IW, e.g. 2026-W05),
--    the last 52 weeks with activity, oldest first, future-dated rows ignored.
--    Idempotent - rerunning rebuilds the same cache.
--
-- Rollback: ALTER TABLE public.goals DROP COLUMN IF EXISTS title;
-- (the streak cache needs no rollback - it is derived data the cron rewrites).

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE public.goals
  DROP CONSTRAINT IF EXISTS goals_title_length;
ALTER TABLE public.goals
  ADD CONSTRAINT goals_title_length CHECK (title IS NULL OR char_length(title) <= 200);

WITH dated AS (
  SELECT user_id, date FROM public.portfolio_entries WHERE deleted_at IS NULL AND is_demo = false
  UNION ALL
  SELECT user_id, date FROM public.cases WHERE deleted_at IS NULL AND is_demo = false
), weeks AS (
  SELECT DISTINCT user_id, to_char(date, 'IYYY-"W"IW') AS week
  FROM dated
  WHERE date <= current_date AND date >= current_date - 370
), ranked AS (
  SELECT user_id, week, row_number() OVER (PARTITION BY user_id ORDER BY week DESC) AS rn
  FROM weeks
), agg AS (
  SELECT user_id, jsonb_agg(week ORDER BY week) AS active_weeks
  FROM ranked
  WHERE rn <= 52
  GROUP BY user_id
)
UPDATE public.profiles p
SET streak_cache = jsonb_build_object('active_weeks', COALESCE(agg.active_weeks, '[]'::jsonb), 'updated_at', now())
FROM public.profiles p2
LEFT JOIN agg ON agg.user_id = p2.id
WHERE p.id = p2.id
  AND (agg.user_id IS NOT NULL OR p.streak_cache IS NOT NULL);
