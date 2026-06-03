-- Audit remediation (2026-06-01 codebase audit, action item #10):
-- drop a dead DB object and tighten an unnecessary EXECUTE grant.

-- 1. enforce_revision_cap() is orphaned: 0 triggers are attached and its
--    target table public.entry_revisions was dropped in the version-history
--    removal (2026_05_23_drop_entry_revisions.sql). Verified live before this
--    migration: trigger_count = 0, to_regclass('public.entry_revisions') IS
--    NULL. Remove the dead function.
drop function if exists public.enforce_revision_cap();

-- 2. increment_share_link_view_count(uuid) is SECURITY INVOKER and is only ever
--    called by the service-role share-access route
--    (app/api/share/access/route.ts). Non-owners are already blocked by the
--    share_links UPDATE RLS policy, so it is a no-op for them, but the grants
--    to PUBLIC/anon/authenticated are unnecessary attack surface. Revoke them;
--    service_role keeps its explicit grant (and postgres owner is unaffected).
revoke execute on function public.increment_share_link_view_count(uuid) from public;
revoke execute on function public.increment_share_link_view_count(uuid) from anon;
revoke execute on function public.increment_share_link_view_count(uuid) from authenticated;
