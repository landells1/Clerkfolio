-- Follow-up hardening from the full security audit.

-- Calendar feeds: store only token hashes. Existing plaintext tokens are
-- migrated once, then cleared.
alter table public.profiles
  add column if not exists calendar_feed_token_hash text;

update public.profiles
set calendar_feed_token_hash = encode(extensions.digest(calendar_feed_token, 'sha256'), 'hex')
where calendar_feed_token is not null
  and calendar_feed_token_hash is null;

update public.profiles
set calendar_feed_token = null
where calendar_feed_token is not null;

create unique index if not exists profiles_calendar_feed_token_hash_idx
  on public.profiles(calendar_feed_token_hash)
  where calendar_feed_token_hash is not null;

-- Upload verification: distinguish real AV scans from MIME/magic-byte fallback.
alter table public.evidence_files
  add column if not exists scan_provider text
    check (scan_provider in ('clamav', 'mime_only'));

-- New signups must verify institutional email before receiving Student tier.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral_code text;
  v_referrer_id uuid;
  v_career_stage text;
begin
  v_referral_code := encode(extensions.gen_random_bytes(6), 'hex');
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
