-- Fix handle_new_user() to use the V2 free tier rather than the legacy trial.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral_code text;
  v_referrer_id uuid;
  v_is_student boolean;
begin
  v_referral_code := encode(gen_random_bytes(6), 'hex');
  v_is_student := new.email ilike '%.ac.uk';

  if nullif(new.raw_user_meta_data->>'referral_code', '') is not null then
    select id into v_referrer_id
    from public.profiles
    where referral_code = new.raw_user_meta_data->>'referral_code'
      and id <> new.id
    limit 1;
  end if;

  insert into public.profiles (
    id,
    first_name,
    last_name,
    career_stage,
    onboarding_complete,
    trial_started_at,
    tier,
    student_email_verified,
    subscription_status,
    referral_code,
    referred_by,
    pro_features_used,
    notification_preferences
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'career_stage', ''),
    false,
    now(),
    case when v_is_student then 'student' else 'free' end,
    v_is_student,
    'free',
    v_referral_code,
    v_referrer_id,
    '{"pdf_exports_used":0,"share_links_used":0,"referral_pro_until":null}'::jsonb,
    '{"deadlines":true,"share_link_expiring":true,"activity_nudge":false,"application_window":true}'::jsonb
  )
  on conflict (id) do update
    set subscription_status = 'free'
    where coalesce(public.profiles.subscription_status, '') = 'trial';

  return new;
end;
$$;
