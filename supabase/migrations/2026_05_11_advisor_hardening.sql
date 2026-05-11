-- Database advisor hardening pass following the 2026-05-11 QA review.
--
-- 1. Trigger-only SECURITY DEFINER functions should not be callable via the
--    PostgREST RPC surface. enforce_revision_cap and
--    grant_foundation_gift_on_stage_change are both invoked exclusively by
--    BEFORE/AFTER row triggers; revoke EXECUTE from PUBLIC, anon, and
--    authenticated so they cannot be hit through /rest/v1/rpc/.
-- 2. rename_user_tag is user-facing but only ever called by a signed-in user
--    renaming their own tags. Revoke from PUBLIC and anon (was leaking via
--    PUBLIC grant); keep authenticated.
-- 3. stripe_webhook_events and student_email_verification_tokens both have
--    RLS enabled with no policies. Implicit deny is the current behaviour;
--    declare it explicitly with FOR ALL ... USING (false) policies so intent
--    is documented and the advisor warning clears. service_role bypasses RLS
--    so internal handlers continue to work.
-- 4. stripe_webhook_events_event_id_uq duplicates the primary key uniqueness
--    on the same column; drop the duplicate index.

REVOKE EXECUTE ON FUNCTION public.enforce_revision_cap() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_revision_cap() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_revision_cap() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.grant_foundation_gift_on_stage_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_foundation_gift_on_stage_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.grant_foundation_gift_on_stage_change() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.rename_user_tag(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rename_user_tag(text, text, text) FROM anon;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='stripe_webhook_events'
      AND policyname='stripe_webhook_events_no_client_access'
  ) THEN
    CREATE POLICY stripe_webhook_events_no_client_access
      ON public.stripe_webhook_events
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='student_email_verification_tokens'
      AND policyname='student_email_verification_tokens_no_client_access'
  ) THEN
    CREATE POLICY student_email_verification_tokens_no_client_access
      ON public.student_email_verification_tokens
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;

DROP INDEX IF EXISTS public.stripe_webhook_events_event_id_uq;
