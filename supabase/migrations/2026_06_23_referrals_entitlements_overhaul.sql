-- Batch 1 (pre-launch build): Referrals, tiers & entitlements overhaul.
-- Findings: F-002 (referral overhaul), F-028 (+500 institutional), F-029/F-003
-- (provenance), F-036 (notifications), F-040 (storage meter).
--
-- This migration is ADDITIVE / BACKWARD-COMPATIBLE so the currently-deployed
-- code keeps working until the matching code deploy lands (one shared prod DB):
--   * new nullable column referrals.activated_at,
--   * new column profiles.referral_badges (default '{}'),
--   * guard_profile_writes extended to protect referral_badges,
--   * a referral_funnel growth-attribution VIEW (owner analytics),
--   * get_profile_entitlements rewritten to base + additive grants, base-ten
--     units, +500 on institutional verification, +250 one-time at 5 rewarded
--     referrals, +1 PDF / +1 share per rewarded referral, tiers collapsed to
--     free/pro (billing) + an effective pro_access flag.
--
-- The other tier functions (recompute_profile_tier, confirm_student_email_token,
-- handle_new_user) deliberately stay UNCHANGED: profiles.tier still physically
-- stores 'student'/'foundation'/'free'/'pro', but those labels no longer drive
-- entitlements - the entitlement layer keys storage off the verified-email flag.
-- FY1/FY2 remains a career stage (drives ARCP/onboarding), not an entitlement.

-- ---------------------------------------------------------------------------
-- 1. Referral lifecycle: attribution -> activation -> (7-day vest) -> completed
-- ---------------------------------------------------------------------------
alter table public.referrals
  add column if not exists activated_at timestamptz;

comment on column public.referrals.activated_at is
  'When the referred user completed the meaningful action (onboarding + >=1 real case/entry) and the referrer was institution-verified. Reward vests REFERRAL_VEST_DAYS later, then status flips to completed.';

-- Backfill existing rewarded rows so the funnel view has activation data.
update public.referrals
   set activated_at = coalesce(reward_granted_at, created_at)
 where activated_at is null
   and status in ('activated', 'completed');

-- ---------------------------------------------------------------------------
-- 2. Earned recognition badges (server-owned; users cannot self-award)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists referral_badges text[] not null default '{}'::text[];

comment on column public.profiles.referral_badges is
  'Server-granted recognition badges (connector/advocate/champion/ambassador/founding_sharer). Written only by the vesting cron via service role; protected by guard_profile_writes.';

-- ---------------------------------------------------------------------------
-- 3. guard_profile_writes: protect referral_badges from user-bound writes
--    (recreated verbatim from the live definition + the new protected column).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_writes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_user_write boolean;
  v_existing_until timestamptz;
  v_base timestamptz;
  v_next_until timestamptz;
BEGIN
  v_is_user_write := tg_op = 'UPDATE'
    AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
    AND coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role';

  IF v_is_user_write THEN
    new.tier := old.tier;
    new.onboarding_complete := old.onboarding_complete;
    new.onboarding_checklist_dismissed := old.onboarding_checklist_dismissed;
    new.onboarding_checklist_completed_items := old.onboarding_checklist_completed_items;
    new.student_email := old.student_email;
    new.student_email_verified := old.student_email_verified;
    new.student_email_verified_at := old.student_email_verified_at;
    new.student_email_verification_due_at := old.student_email_verification_due_at;
    new.student_email_verification_sent_at := old.student_email_verification_sent_at;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.subscription_period_end := old.subscription_period_end;
    new.pro_features_used := old.pro_features_used;
    new.foundation_gift_granted_at := old.foundation_gift_granted_at;
    new.referred_by := old.referred_by;
    new.referral_code := old.referral_code;
    new.referral_badges := old.referral_badges;
  END IF;

  IF tg_op = 'UPDATE' AND new.tier = 'student'
    AND (
      new.student_graduation_date < current_date
      OR new.career_stage IN ('FY1', 'FY2', 'POST_FY')
    )
  THEN
    new.tier := 'foundation';
  END IF;

  IF tg_op = 'UPDATE'
    AND old.career_stage IN ('Y1', 'Y2', 'Y3', 'Y4', 'Y5_PLUS')
    AND new.career_stage IN ('FY1', 'FY2', 'POST_FY')
    AND old.foundation_gift_granted_at IS NULL
    AND old.student_email_verified = true
    AND old.student_email_verification_due_at IS NOT NULL
    AND old.student_email_verification_due_at >= current_date
  THEN
    v_existing_until := nullif(old.pro_features_used ->> 'referral_pro_until', '')::timestamptz;
    v_base := greatest(coalesce(v_existing_until, now()), now());
    v_next_until := v_base + interval '90 days';

    new.foundation_gift_granted_at := now();
    new.pro_features_used := jsonb_set(
      coalesce(old.pro_features_used, '{}'::jsonb),
      '{referral_pro_until}',
      to_jsonb(v_next_until),
      true
    );
  END IF;

  RETURN new;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. get_profile_entitlements: base + additive grants (base-ten units).
--    Signature changes (adds referral_count) so DROP + CREATE + re-grant.
--    The only runtime caller is lib/subscription.ts (fetchSubscriptionInfo).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_profile_entitlements(uuid);

CREATE FUNCTION public.get_profile_entitlements(p_user_id uuid)
 RETURNS TABLE(
   tier text,
   is_pro boolean,
   is_student boolean,
   storage_quota_mb integer,
   pdf_exports_used integer,
   share_links_used integer,
   specialties_tracked integer,
   storage_used_mb numeric,
   referral_pro_until timestamp with time zone,
   student_graduation_date date,
   can_export_pdf boolean,
   can_create_share_link boolean,
   can_track_another_specialty boolean,
   can_bulk_import boolean,
   can_upload_files boolean,
   referral_count integer
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with profile as (
    select
      p.*,
      -- Institutional verification: a verified .ac.uk student OR NHS doctor
      -- email, not past the yearly re-verification date. Keyed off the
      -- verified-email flag (NOT the "foundation" tier), so a verified CT/ST
      -- doctor qualifies too. One email slot per account => one +500 grant.
      (p.student_email_verified
        and p.student_email_verification_due_at is not null
        and p.student_email_verification_due_at >= current_date) as inst_verified,
      nullif(p.pro_features_used->>'referral_pro_until', '')::timestamptz as referral_until,
      coalesce((p.pro_features_used->>'pdf_exports_used')::int, 0) as pdf_count
    from public.profiles p
    where p.id = p_user_id
      and (
        auth.uid() = p_user_id
        or current_setting('request.jwt.claim.role', true) = 'service_role'
        or current_user in ('postgres', 'supabase_admin', 'service_role')
      )
  ),
  usage as (
    select
      p.id,
      coalesce((
        select count(*)::int from public.specialty_applications sa
        where sa.user_id = p.id and sa.is_active = true
      ), 0) as specialty_count,
      coalesce((
        select count(*)::int from public.share_links sl
        where sl.user_id = p.id and sl.revoked = false
          and sl.revoked_at is null and sl.expires_at > now()
      ), 0) as active_share_count,
      -- Base-ten MB (1 MB = 1,000,000 bytes) to match base-ten quota units.
      coalesce((
        select sum(ef.file_size)::numeric / 1000000.0
        from public.evidence_files ef where ef.user_id = p.id
      ), 0) as storage_mb,
      -- Vested (rewarded) referrals where this user is the referrer.
      coalesce((
        select count(*)::int from public.referrals r
        where r.referrer_id = p.id and r.status = 'completed'
      ), 0) as ref_count
    from profile p
  ),
  resolved as (
    select
      p.tier as base_tier,
      p.inst_verified,
      p.pdf_count,
      p.referral_until,
      p.student_graduation_date,
      u.active_share_count,
      u.specialty_count,
      u.storage_mb,
      u.ref_count,
      (p.tier = 'pro' or coalesce(p.referral_until > now(), false)) as pro_access
    from profile p
    join usage u on u.id = p.id
  ),
  final as (
    select
      *,
      ( (case when pro_access then 5000 else 100 end)
        + (case when inst_verified then 500 else 0 end)
        + (case when ref_count >= 5 then 250 else 0 end) )::int as quota_mb
    from resolved
  )
  select
    -- Billing tier: 'pro' ONLY for a real (Stripe) subscription, so the UI can
    -- tell Stripe-Pro from referral-Pro (which shows pro_access=true, tier='free').
    case when base_tier = 'pro' then 'pro' else 'free' end,
    pro_access,
    inst_verified,                                  -- is_student := institutionally verified (either route)
    quota_mb,
    pdf_count,
    active_share_count,
    specialty_count,
    storage_mb,
    referral_until,
    student_graduation_date,
    (pro_access or pdf_count < (1 + ref_count)),            -- +1 PDF per rewarded referral
    (pro_access or active_share_count < (1 + ref_count)),  -- +1 active share per rewarded referral
    (pro_access or specialty_count < 1),
    pro_access,
    (storage_mb < quota_mb),
    ref_count
  from final;
$function$;

-- DROP+CREATE auto-grants EXECUTE to PUBLIC; restore the prior baseline of
-- authenticated-only (the internal auth.uid() check already returns no rows to
-- anon, but keep the surface off the anon REST API).
revoke execute on function public.get_profile_entitlements(uuid) from public;
revoke execute on function public.get_profile_entitlements(uuid) from anon;
grant execute on function public.get_profile_entitlements(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Growth-attribution VIEW (owner analytics): signups -> activation ->
--    reward -> retention, per referrer. SECURITY INVOKER + RLS on referrals
--    means a normal authenticated caller only ever sees their own referral
--    rows; the owner queries it with service role for the global funnel.
-- ---------------------------------------------------------------------------
create or replace view public.referral_funnel
with (security_invoker = true) as
  select
    r.referrer_id,
    count(*)                                                  as signups,
    count(*) filter (where r.activated_at is not null)        as activated,
    count(*) filter (where r.status = 'completed')            as rewarded,
    count(*) filter (
      where r.status = 'completed'
        and exists (
          select 1 from public.portfolio_entries pe
          where pe.user_id = r.referred_id and pe.is_demo = false
            and pe.deleted_at is null
            and pe.created_at > r.activated_at + interval '14 days'
        )
    )                                                         as retained_14d,
    min(r.created_at)                                         as first_signup_at,
    max(r.reward_granted_at)                                  as last_reward_at
  from public.referrals r
  group by r.referrer_id;

comment on view public.referral_funnel is
  'F-002 growth-attribution: per-referrer funnel of signups -> activation -> reward -> 14-day retention. SECURITY INVOKER; owner queries globally via service role.';
