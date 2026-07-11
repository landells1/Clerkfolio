-- Cases count as evidence: widen specialty_entry_links + arcp_entry_links to
-- accept case-backed links, not just portfolio entries.
--
-- ---------------------------------------------------------------------------
-- Backward-compatibility contract (the orchestrator applies this to prod BEFORE
-- the new code deploys, so currently-deployed code must keep working):
--   * PURELY ADDITIVE. Both entry_type CHECK constraints go from
--       CHECK (entry_type = 'portfolio')
--     to
--       CHECK (entry_type in ('portfolio','case'))
--     Every existing 'portfolio' row still satisfies the widened constraint, and
--     the ('portfolio' only) code that is live right now keeps inserting exactly
--     what it inserts today.
--   * The RLS policies that verify entry OWNERSHIP through portfolio_entries are
--     widened to ALSO accept an entry_id that is a live case owned by the same
--     user. The portfolio branch is preserved verbatim, so nothing that works
--     today stops working. Case links become insertable/selectable only once the
--     new code starts writing entry_type='case'.
--   * No data migration is needed: there are zero case-typed rows today (the old
--     CHECK forbade them), so widening only opens the door for new writes.
--
-- Live state verified via the Supabase connector on 2026-07-11 before writing
-- this file:
--   arcp_entry_links_entry_type_check      = CHECK ((entry_type = 'portfolio'::text))
--   specialty_entry_links_entry_type_check = CHECK ((entry_type = 'portfolio'::text))
--   specialty_entry_links: sel/ins/upd entry-ownership predicates join ONLY to
--     portfolio_entries (with the is_checkbox / entry_id IS NULL escapes).
--   arcp_entry_links: ins/upd entry-ownership predicates join ONLY to
--     portfolio_entries; sel/del gate on user_id only.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. CHECK constraints: allow 'case' alongside 'portfolio'.
-- ===========================================================================
alter table public.specialty_entry_links
  drop constraint if exists specialty_entry_links_entry_type_check;
alter table public.specialty_entry_links
  add constraint specialty_entry_links_entry_type_check
  check (entry_type in ('portfolio', 'case'));

alter table public.arcp_entry_links
  drop constraint if exists arcp_entry_links_entry_type_check;
alter table public.arcp_entry_links
  add constraint arcp_entry_links_entry_type_check
  check (entry_type in ('portfolio', 'case'));

-- ===========================================================================
-- 2. specialty_entry_links RLS. Add a 'case' ownership branch to every policy
--    that checks the target entry, keeping the portfolio branch plus the
--    is_checkbox / entry_id IS NULL escapes that synthetic (self-claimed) rows
--    rely on. DELETE stays application-ownership only (unchanged).
-- ===========================================================================
drop policy if exists sel_own_specialty_entry_links on public.specialty_entry_links;
create policy sel_own_specialty_entry_links
  on public.specialty_entry_links
  for select
  using (
    application_id in (
      select id from public.specialty_applications
      where user_id = (select auth.uid())
    )
    and (
      is_checkbox = true
      or entry_id is null
      or (
        entry_type = 'portfolio'
        and entry_id in (
          select id from public.portfolio_entries
          where user_id = (select auth.uid()) and deleted_at is null
        )
      )
      or (
        entry_type = 'case'
        and entry_id in (
          select id from public.cases
          where user_id = (select auth.uid()) and deleted_at is null
        )
      )
    )
  );

drop policy if exists ins_own_specialty_entry_links on public.specialty_entry_links;
create policy ins_own_specialty_entry_links
  on public.specialty_entry_links
  for insert
  with check (
    application_id in (
      select id from public.specialty_applications
      where user_id = (select auth.uid())
    )
    and (
      is_checkbox = true
      or entry_id is null
      or (
        entry_type = 'portfolio'
        and entry_id in (
          select id from public.portfolio_entries
          where user_id = (select auth.uid()) and deleted_at is null
        )
      )
      or (
        entry_type = 'case'
        and entry_id in (
          select id from public.cases
          where user_id = (select auth.uid()) and deleted_at is null
        )
      )
    )
  );

drop policy if exists upd_own_specialty_entry_links on public.specialty_entry_links;
create policy upd_own_specialty_entry_links
  on public.specialty_entry_links
  for update
  using (
    application_id in (
      select id from public.specialty_applications
      where user_id = (select auth.uid())
    )
  )
  with check (
    application_id in (
      select id from public.specialty_applications
      where user_id = (select auth.uid())
    )
    and (
      is_checkbox = true
      or entry_id is null
      or (
        entry_type = 'portfolio'
        and entry_id in (
          select id from public.portfolio_entries
          where user_id = (select auth.uid()) and deleted_at is null
        )
      )
      or (
        entry_type = 'case'
        and entry_id in (
          select id from public.cases
          where user_id = (select auth.uid()) and deleted_at is null
        )
      )
    )
  );

-- ===========================================================================
-- 3. arcp_entry_links RLS. INSERT/UPDATE gain the 'case' ownership branch
--    alongside the existing portfolio one (ARCP links always reference a real
--    entry — no is_checkbox / null escape). SELECT/DELETE gate on user_id only
--    and are left untouched.
-- ===========================================================================
drop policy if exists ins_own_arcp_links on public.arcp_entry_links;
create policy ins_own_arcp_links
  on public.arcp_entry_links
  for insert
  with check (
    user_id = (select auth.uid())
    and (
      (
        entry_type = 'portfolio'
        and entry_id in (
          select id from public.portfolio_entries
          where user_id = (select auth.uid()) and deleted_at is null
        )
      )
      or (
        entry_type = 'case'
        and entry_id in (
          select id from public.cases
          where user_id = (select auth.uid()) and deleted_at is null
        )
      )
    )
  );

drop policy if exists upd_own_arcp_links on public.arcp_entry_links;
create policy upd_own_arcp_links
  on public.arcp_entry_links
  for update
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      (
        entry_type = 'portfolio'
        and entry_id in (
          select id from public.portfolio_entries
          where user_id = (select auth.uid()) and deleted_at is null
        )
      )
      or (
        entry_type = 'case'
        and entry_id in (
          select id from public.cases
          where user_id = (select auth.uid()) and deleted_at is null
        )
      )
    )
  );
