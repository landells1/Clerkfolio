-- Audit remediation - 2026-05-18 phase 2
-- Closes the remaining deferred items from the joint Claude + Codex audit:
--   * Evidence upload state machine (pre-create row, signed URL upload, finalize)
--   * Orphan-upload purge cron support (index)
--   * Latest-only outstanding institutional-email token (index)
--   * Audit-log row when auth.users email changes

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Block direct user uploads to the evidence bucket. The new flow:
--      - /api/upload/authorize pre-creates the evidence_files row with
--        scan_status='pending' and returns a signed upload URL.
--      - Browser PUTs the file to the signed URL (no storage RLS needed -
--        signed URLs bypass RLS but are bound to a specific path and TTL).
--      - /api/upload/verify finalises (magic-byte check + scan_status update).
--
--    Removing INSERT permission on the bucket forces every upload through the
--    server route, which performs the entry-ownership and quota checks.
--    SELECT / DELETE policies stay so users can still view their own files
--    and delete them via deleteEvidenceFile().
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can upload own evidence" ON storage.objects;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Index supporting the orphan-upload purge cron. The cron looks for
--    evidence_files rows in scan_status='pending' older than 24h and removes
--    them plus the matching storage object.
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS evidence_files_orphan_idx
  ON public.evidence_files (created_at)
  WHERE scan_status = 'pending';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Index supporting the "outstanding token for this email" check in
--    /api/student-email/send-verification, plus the purge-stale-tokens cron.
--    Note: we can't include `expires_at > now()` in the WHERE predicate
--    because now() is not IMMUTABLE; the route filters that explicitly.
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS student_email_verification_tokens_pending_email_idx
  ON public.student_email_verification_tokens (lower(email))
  WHERE consumed_at IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Audit row when a user's auth.users email changes. Doesn't auto-revoke
--    the institutional verification because the institutional email is a
--    separate column and may still be reachable; but the audit_log gives
--    operators a trail when responding to "I can't access my account" tickets
--    that turn out to be email-change follow-ups. Hashes the email so the
--    audit_log entry is not itself a PII regression.
--
--    extensions.digest is explicitly schema-qualified because pgcrypto lives
--    in the extensions schema on Supabase and the function's search_path is
--    'public' for security-hardening reasons.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.audit_auth_email_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF tg_op = 'UPDATE' AND old.email IS DISTINCT FROM new.email THEN
    INSERT INTO public.audit_log (user_id, action, metadata)
    VALUES (
      new.id,
      'auth_email_changed',
      jsonb_build_object(
        'old_email_hash', encode(extensions.digest(coalesce(old.email, ''), 'sha256'), 'hex'),
        'new_email_hash', encode(extensions.digest(coalesce(new.email, ''), 'sha256'), 'hex'),
        'at', now()
      )
    );
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS audit_auth_email_change_trigger ON auth.users;
CREATE TRIGGER audit_auth_email_change_trigger
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_auth_email_change();

NOTIFY pgrst, 'reload schema';
