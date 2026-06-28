-- ===========================================================================
-- Batch 6 (F-037 email change + recycled-email guard, F-038 notification type)
-- Additive / backward-compatible: safe to apply before the matching code deploy.
-- Applied to prod via Supabase MCP apply_migration on 2026-06-28.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- F-038 (+ latent F-036 fix): the notifications.type CHECK allow-list was stale
-- and missing many types the app already inserts (referral_reward,
-- referral_badge, billing, payment_failed, student_verification_expiring,
-- mandatory_training_expiring, and now password_changed), so those rows silently
-- failed the constraint. `type` is fully app-controlled and the read path
-- (NotifIcon) tolerates any string, so drop the faulty write-guard rather than
-- chase an allow-list that has already drifted.
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- ---------------------------------------------------------------------------
-- F-037 recycled-email ledger. Every institutional email that has ever been
-- verified is bound here to the FIRST account that verified it (by sha256 hash,
-- mirroring audit_auth_email_change's unsalted lower(email) digest). A released
-- address therefore cannot be re-verified by a DIFFERENT account even after the
-- original owner changes away from it -- universities recycle .ac.uk addresses,
-- and a freed address must not grant a new person student status / the +400 MB
-- grant. ON DELETE SET NULL keeps the lock in place even if the binding account
-- is later deleted (a null user_id = permanently locked).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consumed_institutional_emails (
  email_hash text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  consumed_at timestamptz NOT NULL DEFAULT now()
);
-- Service-role / SECURITY DEFINER access only (RLS on, no policies). Browsers
-- never read or write this ledger.
ALTER TABLE public.consumed_institutional_emails ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.consumed_institutional_emails IS
  'F-037: permanent binding of every verified institutional email (sha256 of lower(email)) to the account that first verified it, so a released/recycled .ac.uk or NHS address cannot be re-verified by another account. Service-role only.';

-- Seed the ledger from the institutional emails currently verified, so existing
-- holders keep their binding the moment the guard goes live.
INSERT INTO public.consumed_institutional_emails (email_hash, user_id)
SELECT encode(extensions.digest(lower(student_email), 'sha256'), 'hex'), id
FROM public.profiles
WHERE student_email_verified = true
  AND student_email IS NOT NULL
  AND student_email <> ''
ON CONFLICT (email_hash) DO NOTHING;

-- ---------------------------------------------------------------------------
-- F-037: extend the manual secondary-email verification RPC to (a) reject an
-- email bound in the ledger to a different account, and (b) write the ledger on
-- successful verification. Signature unchanged (callers unaffected).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_student_email_token(p_token_hash text)
 RETURNS TABLE(status text, user_id uuid, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token student_email_verification_tokens%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_other_id uuid;
  v_due_at date;
  v_next_tier text;
  v_now timestamptz := now();
  v_caller_uid uuid;
  v_caller_role text;
  v_hash text;
  v_consumed_uid uuid;
BEGIN
  v_caller_uid := auth.uid();
  v_caller_role := coalesce(current_setting('request.jwt.claim.role', true), '');

  SELECT * INTO v_token
  FROM public.student_email_verification_tokens
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'invalid'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

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

  -- F-037 recycled-email guard: this address is bound in the ledger to a
  -- different (or deleted) account, so it can never be re-claimed here.
  v_hash := encode(extensions.digest(lower(v_token.email), 'sha256'), 'hex');
  SELECT user_id INTO v_consumed_uid
  FROM public.consumed_institutional_emails
  WHERE email_hash = v_hash;
  IF FOUND AND v_consumed_uid IS DISTINCT FROM v_token.user_id THEN
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

  -- Bind the verified address in the ledger (idempotent for the same account).
  INSERT INTO public.consumed_institutional_emails (email_hash, user_id)
  VALUES (v_hash, v_token.user_id)
  ON CONFLICT (email_hash) DO NOTHING;

  UPDATE public.student_email_verification_tokens
     SET consumed_at = v_now
   WHERE id = v_token.id;

  RETURN QUERY SELECT 'verified'::text, v_token.user_id, v_token.email;
END;
$function$;

-- ---------------------------------------------------------------------------
-- F-037: when the PRIMARY login email actually changes (auth.users.email), the
-- DB re-derives institutional verification atomically -- independent of how many
-- confirmation links Supabase requires, since it fires only on the real change.
--   (1) If the verification was tied to the OLD primary email, clear it and bind
--       the released address in the ledger.
--   (2) If the NEW primary email is institutional and free, auto-claim it
--       (mirrors signup), unless the ledger binds it elsewhere.
-- Always recompute the tier afterwards.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_institutional_email_on_auth_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old text := lower(coalesce(old.email, ''));
  v_new text := lower(coalesce(new.email, ''));
  v_profile profiles%ROWTYPE;
  v_old_hash text;
  v_new_hash text;
  v_consumed_uid uuid;
  v_consumed_found boolean;
  v_new_is_inst boolean;
BEGIN
  IF tg_op <> 'UPDATE' OR old.email IS NOT DISTINCT FROM new.email THEN
    RETURN new;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = new.id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN new;
  END IF;

  -- (1) Verification was tied to the released primary email.
  IF v_profile.student_email_verified
     AND v_profile.student_email IS NOT NULL
     AND v_old <> ''
     AND lower(v_profile.student_email) = v_old THEN
    v_old_hash := encode(extensions.digest(v_old, 'sha256'), 'hex');
    INSERT INTO public.consumed_institutional_emails (email_hash, user_id)
    VALUES (v_old_hash, new.id)
    ON CONFLICT (email_hash) DO NOTHING;

    UPDATE public.profiles
       SET student_email = NULL,
           student_email_verified = false,
           student_email_verified_at = NULL,
           student_email_verification_due_at = NULL,
           student_email_verification_sent_at = NULL
     WHERE id = new.id;

    SELECT * INTO v_profile FROM public.profiles WHERE id = new.id;
  END IF;

  -- (2) Auto-claim a new institutional primary email.
  v_new_is_inst :=
    v_new LIKE '%.ac.uk'
    OR split_part(v_new, '@', 2) IN ('nhs.net', 'hscni.net')
    OR v_new LIKE '%.nhs.uk'
    OR v_new LIKE '%.nhs.scot';

  IF v_new <> '' AND v_new_is_inst AND NOT v_profile.student_email_verified THEN
    v_new_hash := encode(extensions.digest(v_new, 'sha256'), 'hex');

    SELECT user_id INTO v_consumed_uid
    FROM public.consumed_institutional_emails
    WHERE email_hash = v_new_hash;
    v_consumed_found := FOUND;

    IF (NOT v_consumed_found OR v_consumed_uid = new.id)
       AND NOT EXISTS (
         SELECT 1 FROM public.profiles
         WHERE student_email_verified
           AND student_email IS NOT NULL
           AND lower(student_email) = v_new
           AND id <> new.id
       ) THEN
      UPDATE public.profiles
         SET student_email = v_new,
             student_email_verified = true,
             student_email_verified_at = now(),
             student_email_verification_due_at = (now() + interval '1 year')::date
       WHERE id = new.id;

      INSERT INTO public.consumed_institutional_emails (email_hash, user_id)
      VALUES (v_new_hash, new.id)
      ON CONFLICT (email_hash) DO NOTHING;
    END IF;
  END IF;

  PERFORM public.recompute_profile_tier(new.id);
  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS handle_institutional_email_on_auth_change_trigger ON auth.users;
CREATE TRIGGER handle_institutional_email_on_auth_change_trigger
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_institutional_email_on_auth_change();

-- The trigger function must not be callable as a PostgREST RPC. Trigger
-- execution is unaffected by EXECUTE grants (it fires as the table owner), so
-- revoke EXECUTE from the API roles to match audit_auth_email_change /
-- handle_new_user (postgres + service_role only). Clears the anon/authenticated
-- SECURITY DEFINER advisor introduced with the function.
-- (Applied as the follow-up migration batch6_lock_down_institutional_trigger_fn.)
REVOKE EXECUTE ON FUNCTION public.handle_institutional_email_on_auth_change() FROM PUBLIC, anon, authenticated;
