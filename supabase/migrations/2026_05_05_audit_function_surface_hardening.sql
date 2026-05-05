-- =====================================================================
-- 2026_05_05_audit_function_surface_hardening
--
-- Tightens the REST surface of public functions flagged by the security
-- advisor on 2026-05-05.
--
-- 1. get_profile_entitlements already enforces auth.uid() = p_user_id
--    inside the body, so the self-check stays. We additionally remove
--    EXECUTE for the `anon` role — the app never calls it unauthenticated
--    and there is no reason to expose the entitlements RPC to anon.
--
-- 2. protect_profile_account_fields is a trigger function. PostgREST
--    exposes every public function by default; revoke EXECUTE from both
--    `anon` and `authenticated` so it stops appearing as an RPC.
--
-- 3. increment_share_link_view_count had a mutable search_path. Pin it
--    to public, pg_temp so any future SECURITY DEFINER conversion is
--    safe by default.
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.get_profile_entitlements(uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.protect_profile_account_fields() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_profile_account_fields() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_account_fields() FROM PUBLIC;

ALTER FUNCTION public.increment_share_link_view_count(uuid) SET search_path = public, pg_temp;
