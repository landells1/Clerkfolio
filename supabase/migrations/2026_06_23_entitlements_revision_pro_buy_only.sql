-- Batch 1 revision (owner direction, 2026-06-23, same day as the overhaul):
--   * Pro is BUY-ONLY: referrals/gifts no longer grant Pro. get_profile_entitlements
--     pro_access keys off profiles.tier = 'pro' (Stripe) only.
--   * Institutional verification bonus reduced 500 -> 400 MB (verified total 500).
--   * Foundation gift removed: drop the gift block from guard_profile_writes.
--   * Clear the now-dead referral_pro_until / referral_milestones (this also
--     drops the test accounts' legacy referral Pro to their real entitlements).
--
-- The +1 PDF / +1 share per rewarded referral and the +REFERRAL_STORAGE_BONUS_MB
-- (250) at REFERRAL_STORAGE_BONUS_AT (5) referrals are kept (still derived in the
-- RPC from the completed-referral count). Numbers mirror lib/entitlements/limits.ts
-- (BASE 100, VERIFIED_BONUS 400, PRO 5000, REFERRAL_STORAGE_BONUS 250 @ 5).
--
-- Signature is unchanged, so CREATE OR REPLACE (grants preserved, no DROP).

CREATE OR REPLACE FUNCTION public.get_profile_entitlements(p_user_id uuid)
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
      coalesce((
        select sum(ef.file_size)::numeric / 1000000.0
        from public.evidence_files ef where ef.user_id = p.id
      ), 0) as storage_mb,
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
      -- Pro is buy-only: effective Pro == a real Stripe subscription.
      (p.tier = 'pro') as pro_access
    from profile p
    join usage u on u.id = p.id
  ),
  final as (
    select
      *,
      ( (case when pro_access then 5000 else 100 end)   -- PRO_STORAGE_MB / BASE_STORAGE_MB
        + (case when inst_verified then 400 else 0 end)  -- VERIFIED_BONUS_MB
        + (case when ref_count >= 5 then 250 else 0 end) )::int as quota_mb  -- REFERRAL_STORAGE_BONUS_MB @ _AT
    from resolved
  )
  select
    case when base_tier = 'pro' then 'pro' else 'free' end,
    pro_access,
    inst_verified,
    quota_mb,
    pdf_count,
    active_share_count,
    specialty_count,
    storage_mb,
    referral_until,
    student_graduation_date,
    (pro_access or pdf_count < (1 + ref_count)),
    (pro_access or active_share_count < (1 + ref_count)),
    (pro_access or specialty_count < 1),
    pro_access,
    (storage_mb < quota_mb),
    ref_count
  from final;
$function$;

-- guard_profile_writes WITHOUT the foundation-gift block (gift removed).
CREATE OR REPLACE FUNCTION public.guard_profile_writes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_user_write boolean;
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

  -- Keep the student -> foundation tier auto-correction (career-stage move).
  IF tg_op = 'UPDATE' AND new.tier = 'student'
    AND (
      new.student_graduation_date < current_date
      OR new.career_stage IN ('FY1', 'FY2', 'POST_FY')
    )
  THEN
    new.tier := 'foundation';
  END IF;

  -- (Foundation 90-day Pro gift block removed: Pro is buy-only.)

  RETURN new;
END;
$function$;

-- Clear the now-dead referral/gift Pro fields. Sets referral_pro_until to JSON
-- null and drops the referral_milestones key. This also removes the four test
-- accounts' legacy referral Pro so they fall back to their real entitlements.
update public.profiles
set pro_features_used = jsonb_set(
      pro_features_used - 'referral_milestones',
      '{referral_pro_until}',
      'null'::jsonb,
      true
    )
where coalesce(pro_features_used->>'referral_pro_until', '') <> ''
   or pro_features_used ? 'referral_milestones';
