-- ============================================================
-- Security hardening: server-side storage quota enforcement
-- Run in Supabase SQL Editor after migration-security-01
-- ============================================================
--
-- The client-side quota check in storage.ts can be bypassed by calling
-- Supabase Storage directly. This trigger enforces the quota at the database
-- layer: an evidence_files INSERT is rejected if the user would exceed their
-- plan-appropriate limit.
--
-- Limits (must stay in sync with lib/supabase/storage.ts):
--   Free / trial : 200 MB  (209,715,200 bytes)
--   Pro          :   5 GB  (5,368,709,120 bytes)
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_storage_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used        bigint;
  v_is_pro      boolean;
  v_quota_bytes bigint;
  v_limit_label text;
BEGIN
  -- Determine plan
  SELECT (subscription_status = 'active'
          AND subscription_period_end IS NOT NULL
          AND subscription_period_end > now())
    INTO v_is_pro
    FROM public.profiles
   WHERE id = NEW.user_id;

  IF v_is_pro THEN
    v_quota_bytes := 5368709120; -- 5 GB
    v_limit_label := '5 GB';
  ELSE
    v_quota_bytes := 209715200;  -- 200 MB
    v_limit_label := '200 MB';
  END IF;

  -- Sum existing usage (new row is not yet committed, so SUM gives the pre-insert total)
  SELECT COALESCE(SUM(file_size), 0)
    INTO v_used
    FROM public.evidence_files
   WHERE user_id = NEW.user_id;

  IF v_used + NEW.file_size > v_quota_bytes THEN
    RAISE EXCEPTION 'Storage quota exceeded (% limit). Delete some files to free up space.', v_limit_label;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if it already exists from a previous run (idempotent)
DROP TRIGGER IF EXISTS enforce_storage_quota_trigger ON public.evidence_files;

CREATE TRIGGER enforce_storage_quota_trigger
  BEFORE INSERT ON public.evidence_files
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_storage_quota();
