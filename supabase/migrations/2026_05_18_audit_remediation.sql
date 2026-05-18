-- Audit remediation - 2026-05-18
-- Implements the joint Claude + Codex findings of 2026-05-18.
--
-- Critical fix:
--   The `protect_profile_account_fields` guard was a no-op because the function
--   ran as SECURITY DEFINER, so `current_user` inside the body was always the
--   table owner (`postgres`), failing the role-allowlist check. Any authenticated
--   user could update profile.tier, pro_features_used, etc. directly via the
--   public Supabase client.
--
-- Strategy:
--   - Collapse the two profiles BEFORE-UPDATE triggers into a single
--     SECURITY INVOKER function so `current_user` reflects the role doing
--     the work (PostgREST does `SET LOCAL ROLE` per request after JWT
--     verification, which changes current_user but not session_user).
--   - Add new server-owned fields to the protected list (pro_features_used,
--     foundation_gift_granted_at, referred_by, referral_code).
--   - Lock down direct client writes on tier-capped tables (session_fingerprints
--     UPDATE/DELETE/INSERT removed, specialty_applications cap enforced via a
--     BEFORE INSERT trigger, share_links via removed user INSERT/DELETE; the
--     route now uses the service-role client for writes that bypass user RLS).
--   - Add SECURITY DEFINER RPCs for student-email confirmation and missing-profile
--     repair so multi-step state changes happen inside a single transaction.
--   - Retry referral-code generation on collision in handle_new_user.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Combined profile guard (replaces protect_profile_account_fields +
--    grant_foundation_gift_on_stage_change). One function, deterministic order:
--      a) protect server-owned fields from user writes
--      b) auto-downgrade student tier on bad stage/date
--      c) grant the one-shot foundation gift on med-school -> FY transition
--    Step (c) reads `old.pro_features_used` (the value the user could not change
--    because step (a) reverted any change), so the gift writes survive into NEW.
-- ────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS protect_profile_account_fields_trigger ON public.profiles;
DROP TRIGGER IF EXISTS grant_foundation_gift_on_stage_change ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_account_fields();
DROP FUNCTION IF EXISTS public.grant_foundation_gift_on_stage_change();

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
  -- A user-level write means: a non-trusted role is talking to us via
  -- PostgREST. PostgREST establishes the connection as `authenticator`, then
  -- runs `SET LOCAL ROLE <jwt-role>` per request. That changes current_user
  -- but not session_user. With SECURITY INVOKER, current_user inside this
  -- trigger reflects the post-SET-ROLE role.
  v_is_user_write := tg_op = 'UPDATE'
    AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
    AND coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role';

  -- (a) Revert any user attempt to mutate server-owned fields. These fields
  -- are written only by the auth trigger, Stripe webhook, server routes, or
  -- this guard's own (c) block below. A user-level update silently keeps the
  -- old value rather than erroring, because settings forms include these
  -- fields in the SELECT-and-UPDATE round-trip.
  IF v_is_user_write THEN
    new.tier := old.tier;
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
  -- Runs on every UPDATE because tier could legitimately be 'student' from
  -- a service-role write (e.g. institutional verification).
  IF tg_op = 'UPDATE' AND new.tier = 'student'
    AND (
      new.student_graduation_date < current_date
      OR new.career_stage IN ('FY1', 'FY2', 'POST_FY')
    )
  THEN
    new.tier := 'foundation';
  END IF;

  -- (c) One-shot foundation gift on transition out of medical school.
  -- Reads `old.pro_features_used` so the gift is not influenced by what the
  -- user tried to write in this statement.
  IF tg_op = 'UPDATE'
    AND old.career_stage IN ('Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y5_PLUS', 'Y6')
    AND new.career_stage IN ('FY1', 'FY2', 'POST_FY')
    AND old.foundation_gift_granted_at IS NULL
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

DROP TRIGGER IF EXISTS guard_profile_writes_trigger ON public.profiles;
CREATE TRIGGER guard_profile_writes_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_writes();

-- ────────────────────────────────────────────────────────────────────────────
-- 2. handle_new_user: retry referral-code generation on rare unique-key
--    collision. 26^5 ~= 11.9M codes; birthday paradox gives non-negligible
--    collision probability at tens of thousands of users.
-- ────────────────────────────────────────────────────────────────────────────

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

  IF v_career_stage NOT IN ('Y1','Y2','Y3','Y4','Y5','Y5_PLUS','Y6','FY1','FY2','POST_FY','Y1-2','Y3-4','Y5-6') THEN
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

-- ────────────────────────────────────────────────────────────────────────────
-- 3. session_fingerprints: remove user UPDATE / DELETE / INSERT. Middleware
--    uses service role for fingerprint maintenance; client-side revoke is now
--    a server route. Keeping SELECT so the settings page can render the list.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS sess_fp_upd ON public.session_fingerprints;
DROP POLICY IF EXISTS sess_fp_del ON public.session_fingerprints;
DROP POLICY IF EXISTS sess_fp_ins ON public.session_fingerprints;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. share_links: drop the catch-all "ALL own" policy. Keep granular SELECT
--    and UPDATE policies; user INSERT is no longer allowed. The /api/share
--    POST route writes via the service-role client; PATCH/DELETE routes mutate
--    revoked/expires_at via the user client which still owns its row.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "own share links" ON public.share_links;
DROP POLICY IF EXISTS select_own_share_links ON public.share_links;
DROP POLICY IF EXISTS update_own_share_links ON public.share_links;

CREATE POLICY select_own_share_links ON public.share_links
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY update_own_share_links ON public.share_links
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ────────────────────────────────────────────────────────────────────────────
-- 5. specialty_applications: enforce the Free-tier cap at the DB layer via a
--    BEFORE INSERT trigger. Existing "ALL own" RLS policy keeps direct client
--    inserts allowed for the AddSpecialtyModal happy path; the trigger raises
--    if the entitlements RPC says the user is at cap.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_specialty_track_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_can boolean;
BEGIN
  -- Service role / postgres bypasses the cap (data imports, backfills).
  IF current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
  THEN
    RETURN new;
  END IF;

  -- get_profile_entitlements is SECURITY DEFINER and uses auth.uid() inside,
  -- so we are still scoped to the calling user's own profile.
  SELECT can_track_another_specialty INTO v_can
  FROM public.get_profile_entitlements(new.user_id);

  IF NOT COALESCE(v_can, false) THEN
    RAISE EXCEPTION 'Free tier can track one specialty. Upgrade to Pro to add more.'
      USING ERRCODE = 'check_violation', HINT = 'free_specialty_cap';
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS enforce_specialty_track_cap_trigger ON public.specialty_applications;
CREATE TRIGGER enforce_specialty_track_cap_trigger
  BEFORE INSERT ON public.specialty_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_specialty_track_cap();

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Atomic institutional-email confirmation RPC. Replaces the multi-step
--    JavaScript dance in /api/student-email/confirm so the token consumption
--    and profile update commit together. Returns a structured status code.
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
BEGIN
  -- Lock the token row to serialise concurrent confirms.
  SELECT * INTO v_token
  FROM public.student_email_verification_tokens
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::uuid, NULL::text;
    RETURN;
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
  -- already verified. Exact lowercase compare matches the partial unique
  -- index on lower(student_email).
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

  -- Commit profile change first, token last. If either statement raises,
  -- the whole transaction rolls back and the user can retry the link.
  UPDATE public.profiles
     SET tier = v_next_tier,
         student_email = lower(v_token.email),
         student_email_verified = true,
         student_email_verified_at = v_now,
         student_email_verification_due_at = v_due_at
   WHERE id = v_token.user_id;

  UPDATE public.student_email_verification_tokens
     SET consumed_at = v_now
   WHERE id = v_token.id;

  RETURN QUERY SELECT 'verified'::text, v_token.user_id, v_token.email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_student_email_token(text) FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Profile repair RPC. Handles the rare case where auth.users exists but
--    the public.profiles row was not created (handle_new_user failure, manual
--    deletion, schema drift). Idempotent; safe to call from the onboarding
--    route as a self-healing fallback.
-- ────────────────────────────────────────────────────────────────────────────

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
  IF v_career_stage NOT IN ('Y1','Y2','Y3','Y4','Y5','Y5_PLUS','Y6','FY1','FY2','POST_FY','Y1-2','Y3-4','Y5-6') THEN
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

NOTIFY pgrst, 'reload schema';
