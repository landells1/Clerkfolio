-- 2026-05-16: Grant EXECUTE on user-callable RPCs to the `authenticated` role.
--
-- During QA we discovered that the client-side supabase RPC calls for the
-- entitlements gate (`get_profile_entitlements`) and share-link usage
-- counter (`increment_pro_feature_usage`) silently failed with
-- `42501 permission denied for function ...` for every authenticated user.
--
-- The functions are SECURITY DEFINER and contain their own auth.uid()
-- checks, but PostgREST still requires the caller to hold EXECUTE on the
-- function itself. Without these grants:
--   - `fetchSubscriptionInfo` returns the fail-closed defaults (canExportPdf =
--     canCreateShareLink = false), and every Free-tier wall renders even for
--     users who have used zero PDFs and zero share links.
--   - The share-link POST path in app/api/share/route.ts returns 500 because
--     `increment_pro_feature_usage` raises the 42501 inside the request.
--
-- Both bugs ship the same fix: grant EXECUTE to `authenticated`.
-- `rename_user_tag` is also user-callable from /settings/tags and was
-- missing the same grant.
--
-- Trigger-attached SECURITY DEFINER functions (handle_new_user,
-- enforce_revision_cap, enforce_storage_quota,
-- grant_foundation_gift_on_stage_change, protect_profile_account_fields)
-- do not need EXECUTE on the user-facing role because triggers fire under
-- the table owner's privileges, not the calling user's.

GRANT EXECUTE ON FUNCTION public.get_profile_entitlements(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_pro_feature_usage(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_user_tag(text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
