-- Stage 2 batch 2: engagement state.
-- Apply manually to Supabase project dldhnstjngendpcywthv (eu-west-2).

alter table public.profiles
  add column if not exists last_anniversary_seen_year int,
  add column if not exists streak_cache jsonb;

update public.profiles
set notification_preferences = jsonb_set(
  jsonb_set(
    coalesce(notification_preferences, '{}'::jsonb),
    '{weekly_digest}',
    to_jsonb(coalesce((notification_preferences ->> 'weekly_digest')::boolean, true)),
    true
  ),
  '{monthly_digest}',
  to_jsonb(coalesce((notification_preferences ->> 'monthly_digest')::boolean, true)),
  true
);
