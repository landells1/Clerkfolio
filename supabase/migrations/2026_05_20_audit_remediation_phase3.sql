-- Audit remediation - 2026-05-20 phase 3
-- Closes Codex's 2026-05-20 audit findings:
--   1.  profiles INSERT spoofing + dead repair RPC
--   3.  session_fingerprints lock-out (add session_id, active-row filter in code)
--   5.  Institutional verification token race (reservation RPC + unique index)
--   7.  Foundation/NHS tier stale state (recompute_profile_tier RPC + expiry)
--   8.  audit_action enum missing values (extend before re-creating trigger)
--   10. evidence_files INSERT/UPDATE RLS too permissive
--   Plus REVOKE EXECUTE on trigger-only SECURITY DEFINER helpers.
--
-- Order is significant: enum values must be committed before functions that
-- reference them (Postgres requires the new value to be visible in a separate
-- statement before it can be cast to). We split into two transactions by
-- letting Supabase migration runner apply this file linearly.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Extend audit_action enum.
--
-- Live enum was (login, share_link_generated, share_link_viewed, data_export,
-- account_deleted, subscription_changed). Code already inserts
-- 'stripe_payment_failed', 'stripe_charge_refunded', 'stripe_dispute_created'
-- (lib/api/stripe/webhook/route.ts) and 'auth_email_changed' (phase 2 trigger)
-- - all of which were SILENTLY FAILING inside the enum cast. Add every action
-- string the codebase produces so audit_log inserts succeed end-to-end.
-- ────────────────────────────────────────────────────────────────────────────

-- Postgres 12+ allows ALTER TYPE ADD VALUE inside a transaction as long as
-- the new value is not cast/referenced before commit. We only add values
-- here; downstream INSERTs happen at request time, well after this migration
-- commits.
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'auth_email_changed';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'stripe_payment_failed';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'stripe_charge_refunded';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'stripe_dispute_created';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'password_changed';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. profiles: drop authenticated INSERT.
--
-- handle_new_user (SECURITY DEFINER trigger on auth.users) creates every
-- legitimate profile. ensure_profile_for_current_user fills the rare gap.
-- Dropping the user-level INSERT closes the spoofing path where a user with
-- a missing profile could insert their own row with tier='pro' etc.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. evidence_files: drop authenticated INSERT and UPDATE.
--
-- /api/upload/authorize pre-creates the row with service-role; /api/upload/verify
-- (and the scan-evidence edge function) finalises with service-role. SELECT
-- and DELETE stay so users can list and delete their own files via the existing
-- deleteEvidenceFile helper. Closes the "client can flip scan_status to clean"
-- path that the new upload state machine assumed was already shut.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can insert own evidence files" ON public.evidence_files;
DROP POLICY IF EXISTS "Users can update own evidence files" ON public.evidence_files;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. session_fingerprints: add session_id column (Supabase auth session UUID).
--
-- Middleware will start storing the session id from the JWT so a revoke
-- affects one session, not every future login from the same browser/IP. Index
-- the lookup keys for the middleware path.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.session_fingerprints
  ADD COLUMN IF NOT EXISTS session_id text;

CREATE INDEX IF NOT EXISTS session_fingerprints_user_active_idx
  ON public.session_fingerprints (user_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS session_fingerprints_session_id_idx
  ON public.session_fingerprints (session_id)
  WHERE session_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Unique partial index for live institutional tokens (per user).
--
-- Combined with the reservation RPC below, this guarantees at most one
-- unconsumed token per user at any time. Two concurrent reservations race
-- the insert; the loser gets a unique-violation and retries.
-- ────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS student_email_verification_tokens_pending_user_uidx
  ON public.student_email_verification_tokens (user_id)
  WHERE consumed_at IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. reserve_student_email_token: atomic cooldown + consume-old + insert-new.
--
-- Callers are server routes using the service-role client, so we accept
-- p_user_id and validate against auth.uid() OR the calling role. Returns the
-- token plaintext only on success; the route emails it and never persists the
-- plaintext on its own. Cooldown is enforced inside the RPC so two tabs can't
-- both pass the same JS-side check.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reserve_student_email_token(
  p_user_id uuid,
  p_email text,
  p_token_hash text,
  p_ttl_hours int DEFAULT 24,
  p_cooldown_seconds int DEFAULT 60
)
RETURNS TABLE(status text, last_sent_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_now timestamptz := now();
  v_last_sent timestamptz;
  v_cross_pending uuid;
  v_caller_role text;
BEGIN
  -- Restrict callers: must be the user themselves, or service role.
  v_caller_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  IF NOT (
    auth.uid() = p_user_id
    OR v_caller_role = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin', 'service_role')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'no_profile'::text, NULL::timestamptz;
    RETURN;
  END IF;

  v_last_sent := v_profile.student_email_verification_sent_at;

  IF v_last_sent IS NOT NULL
     AND v_now - v_last_sent < make_interval(secs => p_cooldown_seconds)
  THEN
    -- Critical: do NOT consume the existing token. The inbox link must stay
    -- live so the user can complete verification from the email they already
    -- received.
    RETURN QUERY SELECT 'cooldown'::text, v_last_sent;
    RETURN;
  END IF;

  -- Block when another user has a live token for this email - prevents
  -- using Clerkfolio to spam someone else's institutional inbox.
  SELECT user_id INTO v_cross_pending
  FROM public.student_email_verification_tokens
  WHERE lower(email) = lower(p_email)
    AND consumed_at IS NULL
    AND expires_at > v_now
    AND user_id <> p_user_id
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT 'cross_user_pending'::text, v_last_sent;
    RETURN;
  END IF;

  -- Consume any prior unconsumed token for this user (only safe past the
  -- cooldown gate above; otherwise a resend in cooldown would orphan the inbox
  -- link). Atomic with the insert below in the same transaction.
  UPDATE public.student_email_verification_tokens
     SET consumed_at = v_now
   WHERE user_id = p_user_id
     AND consumed_at IS NULL;

  INSERT INTO public.student_email_verification_tokens (user_id, email, token_hash, expires_at)
  VALUES (
    p_user_id,
    lower(p_email),
    p_token_hash,
    v_now + make_interval(hours => p_ttl_hours)
  );

  -- Only the rate-limit clock updates here; existing verified email/tier stay
  -- intact until confirm.
  UPDATE public.profiles
     SET student_email_verification_sent_at = v_now
   WHERE id = p_user_id;

  RETURN QUERY SELECT 'reserved'::text, v_now;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_student_email_token(uuid, text, text, int, int) FROM PUBLIC, anon, authenticated;

-- Rollback hook: if the Resend send fails after we reserved a token, the
-- route calls this to mark the token consumed and clear the cooldown so the
-- user can retry immediately.
CREATE OR REPLACE FUNCTION public.rollback_student_email_token(
  p_user_id uuid,
  p_token_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text;
BEGIN
  v_caller_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  IF NOT (
    v_caller_role = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin', 'service_role')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.student_email_verification_tokens
     SET consumed_at = now()
   WHERE user_id = p_user_id
     AND token_hash = p_token_hash
     AND consumed_at IS NULL;

  UPDATE public.profiles
     SET student_email_verification_sent_at = NULL
   WHERE id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rollback_student_email_token(uuid, text) FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. recompute_profile_tier: single source of truth for tier derivation.
--
-- Used by /auth/callback after NHS verification, by /api/onboarding/complete
-- after the career-stage write, by /api/student-email/confirm (already does
-- this inline today), and by the entitlements RPC for expiry-downgrade.
-- Mirrors the existing inline logic in get_profile_entitlements but with the
-- foundation expiry path Codex flagged.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recompute_profile_tier(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_next_tier text;
  v_caller_role text;
  v_inst_expired boolean;
BEGIN
  v_caller_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  IF NOT (
    auth.uid() = p_user_id
    OR v_caller_role = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin', 'service_role')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_profile';
  END IF;

  -- Pro is always Pro; respect Stripe subscription state regardless of
  -- institutional verification.
  IF v_profile.tier = 'pro' THEN
    RETURN 'pro';
  END IF;

  v_inst_expired := v_profile.student_email_verification_due_at IS NULL
    OR v_profile.student_email_verification_due_at < current_date;

  v_next_tier := CASE
    -- Verified student email that has not expired and the user is still
    -- in medical school -> student.
    WHEN v_profile.student_email_verified
         AND NOT v_inst_expired
         AND v_profile.student_email LIKE '%.ac.uk'
         AND coalesce(v_profile.career_stage, '') NOT IN ('FY1','FY2','POST_FY')
         AND (v_profile.student_graduation_date IS NULL
              OR v_profile.student_graduation_date >= current_date)
      THEN 'student'
    -- Verified institutional email + foundation career stage -> foundation.
    WHEN v_profile.student_email_verified
         AND NOT v_inst_expired
         AND coalesce(v_profile.career_stage, '') IN ('FY1','FY2','POST_FY')
      THEN 'foundation'
    ELSE 'free'
  END;

  IF v_next_tier <> v_profile.tier THEN
    UPDATE public.profiles SET tier = v_next_tier WHERE id = p_user_id;
  END IF;

  RETURN v_next_tier;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_profile_tier(uuid) FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Recreate audit_auth_email_change trigger.
--
-- Phase 2 created the trigger but the enum lacked 'auth_email_changed', so
-- every primary email change failed inside the trigger and rolled the
-- auth.users UPDATE back. We dropped + readded already in the same migration;
-- now the enum has the value, so the existing trigger body will succeed. No
-- changes needed beyond the enum extension at the top of this file. The same
-- applies to the Stripe webhook actions.
-- ────────────────────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────────────────────
-- 9. REVOKE EXECUTE on trigger-only SECURITY DEFINER functions flagged by the
--    Supabase advisors. These are only meant to fire from triggers, not from
--    /rest/v1/rpc/.
-- ────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.audit_auth_email_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_specialty_track_cap() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profile_writes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 10. "Restart tutorial" decoupling.
--
-- No new column is needed: the dashboard tutorial overlay is already gated by
-- profiles.onboarding_checklist_dismissed (see components/dashboard/onboarding-
-- checklist.tsx). The fix is purely in app code: stop flipping
-- onboarding_complete to false on Restart, and instead flip
-- onboarding_checklist_dismissed back to false. That keeps the
-- /api/onboarding/complete service-role provisioning block one-shot.
-- ────────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
