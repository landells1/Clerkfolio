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
-- Limits are resolved by public.get_profile_entitlements():
--   Free/Foundation : 100 MB
--   Student         :   1 GB
--   Pro/Referral Pro:   5 GB
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_storage_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used        bigint;
  v_quota_mb    integer;
  v_quota_bytes bigint;
  v_limit_label text;
BEGIN
  SELECT storage_quota_mb
    INTO v_quota_mb
    FROM public.get_profile_entitlements(NEW.user_id)
    LIMIT 1;

  v_quota_bytes := COALESCE(v_quota_mb, 100) * 1024 * 1024;
  v_limit_label := CASE
    WHEN COALESCE(v_quota_mb, 100) >= 5120 THEN '5 GB'
    WHEN COALESCE(v_quota_mb, 100) >= 1024 THEN '1 GB'
    ELSE '100 MB'
  END;

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
