-- Audit remediation — 2026-05-15
-- Covers: MEDIUM-002 (atomic PDF claim), LOW-001 (REVOKE EXECUTE on SECURITY DEFINER),
--         LOW-004 (notifications INSERT policy), LOW-007 (share_links revoked constraint)

-- ── MEDIUM-002: Atomic free PDF export claim ─────────────────────────────────
-- Replaces the fire-and-forget increment_pro_feature_usage call in the PDF
-- export routes. Returns TRUE if the quota slot was claimed, FALSE if it was
-- already consumed by a concurrent request (TOCTOU-safe via single UPDATE).
CREATE OR REPLACE FUNCTION public.claim_free_pdf_export(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET pro_features_used = jsonb_set(
    COALESCE(pro_features_used, '{}'::jsonb),
    '{pdf_exports_used}',
    to_jsonb(COALESCE((pro_features_used->>'pdf_exports_used')::int, 0) + 1)
  )
  WHERE id = p_user_id
    AND auth.uid() = p_user_id
    AND COALESCE((pro_features_used->>'pdf_exports_used')::int, 0) < 1
  RETURNING true;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_free_pdf_export FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_free_pdf_export TO authenticated;

-- ── LOW-001: Revoke direct REST API access to SECURITY DEFINER functions ─────
-- These functions are internally guarded by auth.uid() checks and can only
-- affect the calling user's own data. Revoking from authenticated closes the
-- REST /rest/v1/rpc/ surface; app code calls them server-side via service role.
-- rename_user_tag is moved to /api/settings/rename-tag (server route).
REVOKE EXECUTE ON FUNCTION public.get_profile_entitlements(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_pro_feature_usage(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rename_user_tag(text, text, text) FROM authenticated;

-- ── LOW-004: Block client INSERT on notifications ─────────────────────────────
-- The existing ALL policy uses USING as with_check (because with_check is null),
-- which lets authenticated users POST to /rest/v1/notifications for themselves.
-- Replace with explicit SELECT/UPDATE/DELETE policies that allow user access,
-- and a service-role-only INSERT.
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own notifications" ON public.notifications;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- INSERT is intentionally omitted for authenticated — service role only.

-- ── LOW-007: Enforce share_links.revoked / revoked_at consistency ─────────────
-- Prevents drift between the boolean flag and the timestamp.
-- (revoked_at IS NULL) must equal (revoked = false).
ALTER TABLE public.share_links
  ADD CONSTRAINT revoked_consistent
  CHECK ((revoked_at IS NULL) = (revoked = false));
