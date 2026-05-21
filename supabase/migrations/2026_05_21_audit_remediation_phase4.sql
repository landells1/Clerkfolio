-- Audit remediation - 2026-05-21 phase 4
-- Closes findings from the May 2026 consolidated security audit:
--   #1  onboarding_complete client-writable → bypass specialty cap
--   #2  Foundation gift grantable without institutional verification
--   #3  verified-state invariants not enforced; null due_at logic divergence
--   #6  confirm_student_email_token callable by wrong auth.uid()
--   #12 career_stage CHECK allows legacy/unlisted values

-- ────────────────────────────────────────────────────────────────────────────
-- 1+2. Replace guard_profile_writes with hardened version.
--
-- Changes vs the 2026-05-18 version:
--   a) onboarding_complete added to the protected server-owned fields list.
--      Client UPDATEs can no longer flip it back to false, which previously
--      allowed re-running the service-role onboarding provisioning block and
--      bypassing the Free specialty cap.
--   b) Clause (b) unchanged (student tier auto-downgrade).
--   c) Foundation gift now requires current institutional verification:
--      old.student_email_verified = true AND old.student_email_verification_due_at
--      IS NOT NULL AND >= current_date. Reads old.* so a user cannot flip
--      both career_stage and student_email_verified in one UPDATE (the guard
--      reverts student_email_verified in clause (a) before clause (c) runs).
--      Also removes legacy stages Y5 and Y6 from the eligible med-school list,
--      consistent with the tightened career_stage CHECK below.
-- ────────────────────────────────────────────────────────────────────────────

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
  --     onboarding_complete is now included so clients cannot flip it back to
  --     false to re-trigger the service-role onboarding provisioning block.
  IF v_is_user_write THEN
    new.tier := old.tier;
    new.onboarding_complete := old.onboarding_complete;
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

-- Trigger already exists from 2026-05-18 migration; replace is idempotent.
DROP TRIGGER IF EXISTS guard_profile_writes_trigger ON public.profiles;
CREATE TRIGGER guard_profile_writes_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_writes();

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Verified-state invariants (#3).
--
-- Backfill: any row with student_email_verified = true but missing the
-- supporting fields is in an inconsistent state (legacy row, test row, or
-- bad write path). Reset to unverified so the CHECK below can be applied.
-- ────────────────────────────────────────────────────────────────────────────

UPDATE public.profiles
   SET student_email_verified = false,
       student_email_verified_at = NULL,
       student_email_verification_due_at = NULL
 WHERE student_email_verified = true
   AND (
     student_email IS NULL
     OR student_email_verified_at IS NULL
     OR student_email_verification_due_at IS NULL
   );

-- Re-derive tier for any rows just reset (they may have been on student tier).
-- safe to run even if recompute_profile_tier is a no-op for free rows.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.profiles
     WHERE tier IN ('student', 'foundation')
       AND student_email_verified = false
  LOOP
    PERFORM public.recompute_profile_tier(r.id);
  END LOOP;
END;
$$;

-- Add the CHECK constraint that makes the invariant permanent.
-- student_email_verified = false is always valid.
-- student_email_verified = true requires all three supporting columns.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS verified_state_complete;

ALTER TABLE public.profiles
  ADD CONSTRAINT verified_state_complete CHECK (
    student_email_verified = false
    OR (
      student_email IS NOT NULL
      AND student_email_verified_at IS NOT NULL
      AND student_email_verification_due_at IS NOT NULL
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Harden confirm_student_email_token: reject calls where the caller is not
--    the token owner.
--
-- The route already has a JS-layer guard, but the RPC itself was callable by
-- any authenticated user (or even service role on behalf of any user). Adding
-- the check here closes the path where an attacker bypasses the route.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.confirm_student_email_token(p_token_hash text)
RETURNS TABLE(status text, user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token student_email_verification_tokens%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_other_id uuid;
  v_due_at date;
  v_next_tier text;
  v_now timestamptz := now();
  v_caller_uid uuid;
  v_caller_role text;
BEGIN
  -- Only service-role callers may bypass the caller-uid check.
  -- Authenticated users must be the token owner.
  v_caller_uid := auth.uid();
  v_caller_role := coalesce(current_setting('request.jwt.claim.role', true), '');

  -- Lock the token row first so we know the owner before checking the caller.
  SELECT * INTO v_token
  FROM public.student_email_verification_tokens
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  -- Caller check: must be service-role OR the token's own user.
  -- An unauthenticated caller (v_caller_uid IS NULL) and a wrong-user caller
  -- both return 'forbidden' here so the token is not consumed on bad calls.
  IF NOT (
    v_caller_role = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin', 'service_role')
    OR v_caller_uid = v_token.user_id
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_token.consumed_at IS NOT NULL THEN
    RETURN QUERY SELECT 'invalid'::text, v_token.user_id, v_token.email;
    RETURN;
  END IF;

  IF v_token.expires_at < v_now THEN
    UPDATE public.student_email_verification_tokens
       SET consumed_at = v_now
     WHERE id = v_token.id;
    RETURN QUERY SELECT 'expired'::text, v_token.user_id, v_token.email;
    RETURN;
  END IF;

  -- Block a second profile from claiming an email another profile has
  -- already verified.
  SELECT id INTO v_other_id
  FROM public.profiles
  WHERE student_email_verified = true
    AND student_email IS NOT NULL
    AND lower(student_email) = lower(v_token.email)
    AND id <> v_token.user_id
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.student_email_verification_tokens
       SET consumed_at = v_now
     WHERE id = v_token.id;
    RETURN QUERY SELECT 'already_used'::text, v_token.user_id, v_token.email;
    RETURN;
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_token.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.student_email_verification_tokens
       SET consumed_at = v_now
     WHERE id = v_token.id;
    RETURN QUERY SELECT 'invalid'::text, v_token.user_id, v_token.email;
    RETURN;
  END IF;

  v_due_at := (v_now + interval '1 year')::date;

  v_next_tier := CASE
    WHEN v_profile.tier = 'pro' THEN 'pro'
    WHEN v_token.email LIKE '%.ac.uk' THEN 'student'
    WHEN coalesce(v_profile.career_stage, '') IN ('FY1', 'FY2', 'POST_FY') THEN 'foundation'
    ELSE 'free'
  END;

  -- Commit profile change and token consumption atomically.
  -- Unique violation on profiles.student_email here means another profile
  -- claimed the email between our SELECT above and this UPDATE (race). Return
  -- 'already_used' so the caller can surface the correct message.
  BEGIN
    UPDATE public.profiles
       SET tier = v_next_tier,
           student_email = lower(v_token.email),
           student_email_verified = true,
           student_email_verified_at = v_now,
           student_email_verification_due_at = v_due_at
     WHERE id = v_token.user_id;
  EXCEPTION WHEN unique_violation THEN
    UPDATE public.student_email_verification_tokens
       SET consumed_at = v_now
     WHERE id = v_token.id;
    RETURN QUERY SELECT 'already_used'::text, v_token.user_id, v_token.email;
    RETURN;
  END;

  UPDATE public.student_email_verification_tokens
     SET consumed_at = v_now
   WHERE id = v_token.id;

  RETURN QUERY SELECT 'verified'::text, v_token.user_id, v_token.email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_student_email_token(text) FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 12. Tighten career_stage CHECK + update profile-creation functions.
--
-- Live CHECK allowed 13 values including legacy ones (Y5, Y6, Y1-2, Y3-4,
-- Y5-6) that the UI no longer exposes. These stale values caused drift in
-- recompute_profile_tier and sidebar gating.
--
-- Canonical set after tightening:
--   Y1, Y2, Y3, Y4, Y5_PLUS, FY1, FY2, POST_FY
--
-- Backfill:
--   Y5 → Y5_PLUS (same year group, display label changed)
--   Y6, Y1-2, Y3-4, Y5-6 → NULL (no clean mapping; set career_stage = NULL
--   so the onboarding flow prompts the user to re-select on next login)
-- ────────────────────────────────────────────────────────────────────────────

UPDATE public.profiles
   SET career_stage = 'Y5_PLUS'
 WHERE career_stage = 'Y5';

UPDATE public.profiles
   SET career_stage = NULL
 WHERE career_stage IN ('Y6', 'Y1-2', 'Y3-4', 'Y5-6');

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_career_stage_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_career_stage_check CHECK (
    career_stage IS NULL
    OR career_stage IN ('Y1','Y2','Y3','Y4','Y5_PLUS','FY1','FY2','POST_FY')
  );

-- Update handle_new_user to strip legacy career stage values.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referral_code text;
  v_referrer_id uuid;
  v_career_stage text;
  v_bytes bytea;
  v_attempts int := 0;
BEGIN
  v_career_stage := nullif(new.raw_user_meta_data->>'career_stage', '');

  IF v_career_stage NOT IN ('Y1','Y2','Y3','Y4','Y5_PLUS','FY1','FY2','POST_FY') THEN
    v_career_stage := NULL;
  END IF;

  IF nullif(new.raw_user_meta_data->>'referral_code', '') IS NOT NULL THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = upper(new.raw_user_meta_data->>'referral_code')
      AND id <> new.id
    LIMIT 1;
  END IF;

  LOOP
    v_bytes := extensions.gen_random_bytes(5);
    v_referral_code :=
      chr(65 + (get_byte(v_bytes, 0) % 26)) ||
      chr(65 + (get_byte(v_bytes, 1) % 26)) ||
      chr(65 + (get_byte(v_bytes, 2) % 26)) ||
      chr(65 + (get_byte(v_bytes, 3) % 26)) ||
      chr(65 + (get_byte(v_bytes, 4) % 26));

    BEGIN
      INSERT INTO public.profiles (
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
      VALUES (
        new.id,
        coalesce(new.raw_user_meta_data->>'first_name', ''),
        coalesce(new.raw_user_meta_data->>'last_name', ''),
        v_career_stage,
        false,
        'free',
        NULL,
        false,
        NULL,
        NULL,
        v_referral_code,
        v_referrer_id,
        '{"pdf_exports_used":0,"share_links_used":0,"referral_pro_until":null}'::jsonb,
        '{"deadlines":true,"share_link_expiring":true,"activity_nudge":false,"application_window":true}'::jsonb
      )
      ON CONFLICT (id) DO NOTHING;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 5 THEN
        RAISE EXCEPTION 'Could not allocate referral code after % attempts', v_attempts
          USING ERRCODE = 'unique_violation';
      END IF;
    END;
  END LOOP;

  RETURN new;
END;
$$;

-- Update ensure_profile_for_current_user to strip legacy career stage values.
CREATE OR REPLACE FUNCTION public.ensure_profile_for_current_user()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing uuid;
  v_meta jsonb;
  v_career_stage text;
  v_referrer_id uuid;
  v_referral_code text;
  v_bytes bytea;
  v_attempts int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT id INTO v_existing FROM public.profiles WHERE id = v_uid;
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  SELECT raw_user_meta_data INTO v_meta FROM auth.users WHERE id = v_uid;

  v_career_stage := nullif(v_meta->>'career_stage', '');
  IF v_career_stage NOT IN ('Y1','Y2','Y3','Y4','Y5_PLUS','FY1','FY2','POST_FY') THEN
    v_career_stage := NULL;
  END IF;

  IF nullif(v_meta->>'referral_code', '') IS NOT NULL THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = upper(v_meta->>'referral_code')
      AND id <> v_uid
    LIMIT 1;
  END IF;

  LOOP
    v_bytes := extensions.gen_random_bytes(5);
    v_referral_code :=
      chr(65 + (get_byte(v_bytes, 0) % 26)) ||
      chr(65 + (get_byte(v_bytes, 1) % 26)) ||
      chr(65 + (get_byte(v_bytes, 2) % 26)) ||
      chr(65 + (get_byte(v_bytes, 3) % 26)) ||
      chr(65 + (get_byte(v_bytes, 4) % 26));

    BEGIN
      INSERT INTO public.profiles (
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
      VALUES (
        v_uid,
        coalesce(v_meta->>'first_name', ''),
        coalesce(v_meta->>'last_name', ''),
        v_career_stage,
        false,
        'free',
        false,
        v_referral_code,
        v_referrer_id,
        '{"pdf_exports_used":0,"share_links_used":0,"referral_pro_until":null}'::jsonb,
        '{"deadlines":true,"share_link_expiring":true,"activity_nudge":false,"application_window":true}'::jsonb
      )
      ON CONFLICT (id) DO NOTHING;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 5 THEN
        RAISE EXCEPTION 'Could not allocate referral code after % attempts', v_attempts
          USING ERRCODE = 'unique_violation';
      END IF;
    END;
  END LOOP;

  RETURN v_uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_profile_for_current_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile_for_current_user() TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Thin wrapper so authenticated users can recompute their own tier from the
-- settings page after a career-stage change, without granting full access to
-- the service-role recompute_profile_tier RPC.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recompute_my_profile_tier()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN public.recompute_profile_tier(v_uid);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_my_profile_tier() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recompute_my_profile_tier() TO authenticated;

NOTIFY pgrst, 'reload schema';
