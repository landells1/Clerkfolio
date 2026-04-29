-- Remove legacy profile trial/subscription fields now that tier is the source of truth.

update public.profiles
set tier = 'pro'
where coalesce(subscription_status, '') = 'active'
  and coalesce(tier, 'free') = 'free';

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
    tier,
    student_email_verified,
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
    case when v_is_student then 'student' else 'free' end,
    v_is_student,
    v_referral_code,
    v_referrer_id,
    '{"pdf_exports_used":0,"share_links_used":0,"referral_pro_until":null}'::jsonb,
    '{"deadlines":true,"share_link_expiring":true,"activity_nudge":false,"application_window":true}'::jsonb
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.enforce_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used bigint;
  v_is_pro boolean;
  v_quota_bytes bigint;
  v_limit_label text;
begin
  select (
      tier in ('pro', 'student')
      or nullif(pro_features_used->>'referral_pro_until', '')::timestamptz > now()
      or student_grace_until > now()
    )
    into v_is_pro
    from public.profiles
   where id = new.user_id;

  if v_is_pro then
    v_quota_bytes := 5368709120;
    v_limit_label := '5 GB';
  else
    v_quota_bytes := 104857600;
    v_limit_label := '100 MB';
  end if;

  select coalesce(sum(file_size), 0)
    into v_used
    from public.evidence_files
   where user_id = new.user_id;

  if v_used + new.file_size > v_quota_bytes then
    raise exception 'Storage quota exceeded (% limit). Delete some files to free up space.', v_limit_label;
  end if;

  return new;
end;
$$;

alter table public.profiles
  drop column if exists subscription_status,
  drop column if exists trial_started_at,
  drop column if exists specialty_interests;
