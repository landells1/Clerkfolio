-- Evidence file reuse across multiple entries.
--
-- Today each evidence_files row binds ONE uploaded file to exactly ONE entry
-- via the (entry_id, entry_type) columns, so a certificate that supports three
-- portfolio entries has to be uploaded three times (and counts three times
-- against the storage quota). This migration adds a join table so a single
-- physical file (one evidence_files row = one storage object) can be linked to
-- many entries.
--
-- ---------------------------------------------------------------------------
-- Backward-compatibility contract (the orchestrator applies this to prod BEFORE
-- the new code deploys, so currently-deployed code must keep working):
--   * PURELY ADDITIVE: no existing column is dropped or renamed. The legacy
--     evidence_files.entry_id / entry_type columns stay NOT NULL and keep their
--     current meaning ("the entry this file was first uploaded against / that
--     owns the deterministic storage path"). All currently-deployed read paths
--     (entry detail / edit / list, /api/export/evidence, GDPR export, the
--     purge-deleted + purge-orphan crons, /api/upload/authorize) reference
--     those columns directly and are untouched by this migration.
--   * The new code deploy will start ALSO writing/reading evidence_file_links.
--     A file's physical lifetime becomes "delete the storage object + the
--     evidence_files row only when the LAST link is gone"; until the new code
--     lands, every file has exactly one link (its backfilled original binding),
--     so the legacy one-file-one-entry behaviour is preserved bit-for-bit.
--   * quota accounting is unchanged: storage_used_mb in get_profile_entitlements
--     sums evidence_files.file_size per user, so each physical file is still
--     counted exactly ONCE regardless of how many links it has. No entitlement
--     change is needed and none is made here.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Join table: one row per (file, entry) attachment.
-- ---------------------------------------------------------------------------
create table if not exists public.evidence_file_links (
  id          uuid primary key default gen_random_uuid(),
  file_id     uuid not null references public.evidence_files(id) on delete cascade,
  entry_id    uuid not null,
  entry_type  text not null check (entry_type in ('portfolio', 'case')),
  created_at  timestamptz not null default now(),
  -- A file can be attached to a given entry at most once.
  unique (file_id, entry_id, entry_type)
);

comment on table public.evidence_file_links is
  'Many-to-many link of a single uploaded evidence_files row to the portfolio entries / cases it supports. One physical file (one storage object) can be attached to many entries; the storage object is removed only when its last link is deleted. entry_id/entry_type are polymorphic (like specialty_entry_links / evidence_files) so no FK — RLS + the app own referential integrity.';

-- FK index on file_id (a prior audit flagged a missing FK index; do not repeat).
create index if not exists evidence_file_links_file_idx
  on public.evidence_file_links (file_id);

-- Lookup index for "which files are attached to this entry" (detail/edit/list).
create index if not exists evidence_file_links_entry_idx
  on public.evidence_file_links (entry_id, entry_type);

-- ---------------------------------------------------------------------------
-- 2. RLS. Ownership is derived through the parent evidence_files row (same
--    pattern as specialty_entry_links deriving ownership through
--    specialty_applications). INSERT additionally requires the target entry to
--    be a live (not soft-deleted) entry owned by the same user, mirroring the
--    ins_own_arcp_links / ins_own_specialty_entry_links WITH CHECK guards.
--    No UPDATE policy: links are immutable (unlink + relink), so leaving UPDATE
--    with no policy denies it — matching evidence_files' own posture.
-- ---------------------------------------------------------------------------
alter table public.evidence_file_links enable row level security;

drop policy if exists sel_own_evidence_file_links on public.evidence_file_links;
create policy sel_own_evidence_file_links
  on public.evidence_file_links
  for select
  using (
    file_id in (
      select ef.id from public.evidence_files ef
      where ef.user_id = (select auth.uid())
    )
  );

drop policy if exists ins_own_evidence_file_links on public.evidence_file_links;
create policy ins_own_evidence_file_links
  on public.evidence_file_links
  for insert
  with check (
    file_id in (
      select ef.id from public.evidence_files ef
      where ef.user_id = (select auth.uid())
    )
    and (
      (entry_type = 'portfolio' and entry_id in (
        select pe.id from public.portfolio_entries pe
        where pe.user_id = (select auth.uid()) and pe.deleted_at is null
      ))
      or
      (entry_type = 'case' and entry_id in (
        select c.id from public.cases c
        where c.user_id = (select auth.uid()) and c.deleted_at is null
      ))
    )
  );

drop policy if exists del_own_evidence_file_links on public.evidence_file_links;
create policy del_own_evidence_file_links
  on public.evidence_file_links
  for delete
  using (
    file_id in (
      select ef.id from public.evidence_files ef
      where ef.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Backfill: one link row per existing evidence_files row, from its current
--    (entry_id, entry_type) binding. ON CONFLICT DO NOTHING makes the migration
--    idempotent and safe to re-run. Every existing file therefore ends up with
--    exactly one link (its original binding), so behaviour is identical until a
--    user explicitly attaches a file to a second entry.
-- ---------------------------------------------------------------------------
insert into public.evidence_file_links (file_id, entry_id, entry_type)
select ef.id, ef.entry_id, ef.entry_type
from public.evidence_files ef
where ef.entry_id is not null
  and ef.entry_type in ('portfolio', 'case')
on conflict (file_id, entry_id, entry_type) do nothing;
