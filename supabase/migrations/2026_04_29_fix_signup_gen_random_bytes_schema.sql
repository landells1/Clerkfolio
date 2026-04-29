-- handle_new_user uses a restricted search_path; qualify gen_random_bytes.

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
  v_career_stage text;
begin
  v_referral_code := encode(extensions.gen_random_bytes(6), 'hex');
  v_is_student := new.email ilike '%.ac.uk';
  v_career_stage := nullif(new.raw_user_meta_data->>'career_stage', '');

  if v_career_stage not in ('Y1','Y2','Y3','Y4','Y5','Y6','FY1','FY2','POST_FY','Y1-2','Y3-4','Y5-6') then
    v_career_stage := null;
  end if;

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
    v_career_stage,
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
