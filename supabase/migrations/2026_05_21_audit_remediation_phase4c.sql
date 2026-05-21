-- Audit remediation - 2026-05-21 phase 4c
-- Closes finding #21:
--   onboarding_checklist_dismissed and onboarding_checklist_completed_items
--   were writable directly by authenticated users via the profiles table.
--   A user could dismiss (or un-dismiss) the tutorial overlay client-side;
--   more critically they could clear completed items to re-trigger first-time
--   UX flows that assume a fresh account. Guard these alongside the other
--   server-owned fields in guard_profile_writes.
--
-- This replaces the function created in phase4 (2026_05_21_audit_remediation_phase4.sql).
-- Only the (a) block is changed; (b) and (c) are identical.

CREATE OR REPLACE FUNCTION public.guard_profile_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_user_write boolean;
  v_existing_until timestamptz;
  v_base timestamptz;
  v_next_until timestamptz;
BEGIN
  v_is_user_write := tg_op = 'UPDATE'
    AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
    AND coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role';

  -- (a) Revert user-level mutations to server-owned fields.
  --     onboarding_checklist_dismissed and onboarding_checklist_completed_items
  --     added here (#21): the tutorial reset must go through the service-role
  --     /api/settings/restart-tutorial route, not a direct client write.
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
  END IF;

  -- (b) Auto-downgrade student tier when graduation has passed or stage moved.
  IF tg_op = 'UPDATE' AND new.tier = 'student'
    AND (
      new.student_graduation_date < current_date
      OR new.career_stage IN ('FY1', 'FY2', 'POST_FY')
    )
  THEN
    new.tier := 'foundation';
  END IF;

  -- (c) One-shot foundation gift on med-school → FY transition.
  --     Requires current institutional verification (reads old.* so the user
  --     cannot set student_email_verified in the same UPDATE — clause (a)
  --     reverts it first). Null due_at is treated as expired, consistent with
  --     recompute_profile_tier and the aligned hasCurrentInstitutionVerification
  --     in lib/referrals/rewards.ts.
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
$$;

NOTIFY pgrst, 'reload schema';
