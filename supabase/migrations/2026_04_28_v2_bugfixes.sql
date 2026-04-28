-- V2 bugfixes after live schema review.

-- The original stage-1 profile check only allowed grouped medical-school years.
-- V2 writes exact years (Y1-Y6), FY1/FY2, and POST_FY.
alter table public.profiles
  drop constraint if exists profiles_career_stage_check;

alter table public.profiles
  add constraint profiles_career_stage_check
  check (
    career_stage is null
    or career_stage in ('Y1','Y2','Y3','Y4','Y5','Y6','FY1','FY2','POST_FY','Y1-2','Y3-4','Y5-6')
  );

-- Existing paid accounts may have subscription_status='active' while the newer tier column
-- is still its default 'free'. Keep tier and the legacy subscription status aligned.
update public.profiles
  set tier = 'pro'
  where coalesce(subscription_status, '') = 'active'
    and coalesce(tier, 'free') = 'free';

-- Calendar feed support.
alter table public.profiles
  add column if not exists calendar_feed_token text unique;

alter table public.deadlines
  add column if not exists details text,
  add column if not exists location text;

-- Signup trigger: explicitly set V2 defaults and handle referral metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  referrer uuid;
begin
  insert into public.profiles (
    id,
    trial_started_at,
    referral_code,
    tier,
    subscription_status,
    pro_features_used,
    notification_preferences
  )
  values (
    new.id,
    now(),
    encode(gen_random_bytes(6), 'hex'),
    'free',
    'trial',
    '{"pdf_exports_used":0,"share_links_used":0,"referral_pro_until":null}'::jsonb,
    '{"deadlines":true,"share_link_expiring":true,"activity_nudge":false,"application_window":true}'::jsonb
  )
  on conflict (id) do nothing;

  if nullif(new.raw_user_meta_data->>'referral_code', '') is not null then
    select id into referrer
    from public.profiles
    where referral_code = new.raw_user_meta_data->>'referral_code'
      and id <> new.id
    limit 1;

    if referrer is not null then
      update public.profiles
        set referred_by = referrer
        where id = new.id and referred_by is null;
    end if;
  end if;

  return new;
end;
$$;

