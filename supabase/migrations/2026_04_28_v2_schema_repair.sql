-- Repair mismatches found against the live Supabase schema after the V2 bugfix pass.

alter table public.portfolio_entries
  add column if not exists completeness_score integer;

alter table public.portfolio_entries
  drop constraint if exists portfolio_entries_completeness_score_check;

alter table public.portfolio_entries
  add constraint portfolio_entries_completeness_score_check
  check (completeness_score is null or (completeness_score >= 0 and completeness_score <= 100));

alter table public.cases
  add column if not exists completeness_score integer;

alter table public.cases
  drop constraint if exists cases_completeness_score_check;

alter table public.cases
  add constraint cases_completeness_score_check
  check (completeness_score is null or (completeness_score >= 0 and completeness_score <= 100));

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type = any (
      array[
        'deadline_due',
        'share_link_expiring',
        'application_window_open',
        'application_window',
        'activity_nudge'
      ]::text[]
    )
  );

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
    encode(extensions.gen_random_bytes(6), 'hex'),
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
