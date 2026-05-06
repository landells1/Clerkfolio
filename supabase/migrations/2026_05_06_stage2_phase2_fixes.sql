-- Stage 2 Phase 2 bug-fix migration
-- Enforces entry_revisions cap at DB level (M7).
-- All other schema items from the Phase 2 review (M9 evidence_files index,
-- M10/M11 arcp_capabilities/share_views deny policies, M13 evidence_files
-- UPDATE policy) were already applied in 2026_05_05_audit_rls_hardening.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- M7. entry_revisions: enforce 50-per-entry cap via trigger
--     Currently capped only in app code; a trigger guarantees it even if the
--     client path changes.  The trigger deletes the oldest revision(s) above
--     the cap *after* the new row is inserted so the count never exceeds 50.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_revision_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.entry_revisions
  where id in (
    select id
    from public.entry_revisions
    where entry_id   = new.entry_id
      and entry_type = new.entry_type
    order by created_at desc
    offset 50
  );
  return new;
end;
$$;

drop trigger if exists entry_revisions_cap_tg on public.entry_revisions;
create trigger entry_revisions_cap_tg
  after insert on public.entry_revisions
  for each row
  execute function public.enforce_revision_cap();
