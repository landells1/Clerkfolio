-- Fix handle_new_user: generate a 5-letter uppercase referral code to match
-- the profiles_referral_code_format_check constraint ('^[A-Z]{5}$').
--
-- Root cause: 2026_04_30_audit_security_followups.sql re-introduced
-- encode(gen_random_bytes(6),'hex') which produces a 12-char lowercase hex
-- string — always violating the constraint, breaking every new user signup.
-- 2026_04_29_five_letter_referral_codes.sql had fixed this, but was undone.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
declare
  v_referral_code text;
  v_referrer_id uuid;
  v_career_stage text;
  v_bytes bytea;
begin
  -- Generate 5 random uppercase letters (A-Z) matching constraint ^[A-Z]{5}$
  v_bytes := extensions.gen_random_bytes(5);
  v_referral_code :=
    chr(65 + (get_byte(v_bytes, 0) % 26)) ||
    chr(65 + (get_byte(v_bytes, 1) % 26)) ||
    chr(65 + (get_byte(v_bytes, 2) % 26)) ||
    chr(65 + (get_byte(v_bytes, 3) % 26)) ||
    chr(65 + (get_byte(v_bytes, 4) % 26));

  v_career_stage := nullif(new.raw_user_meta_data->>'career_stage', '');

  if v_career_stage not in ('Y1','Y2','Y3','Y4','Y5','Y5_PLUS','Y6','FY1','FY2','POST_FY','Y1-2','Y3-4','Y5-6') then
    v_career_stage := null;
  end if;

  if nullif(new.raw_user_meta_data->>'referral_code', '') is not null then
    select id into v_referrer_id
    from public.profiles
    where referral_code = upper(new.raw_user_meta_data->>'referral_code')
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
    student_email,
    student_email_verified,
    student_email_verified_at,
    student_email_verification_due_at,
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
    'free',
    null,
    false,
    null,
    null,
    v_referral_code,
    v_referrer_id,
    '{"pdf_exports_used":0,"share_links_used":0,"referral_pro_until":null}'::jsonb,
    '{"deadlines":true,"share_link_expiring":true,"activity_nudge":false,"application_window":true}'::jsonb
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
