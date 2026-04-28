-- ============================================================
-- Security hardening: arcp_entry_links ownership checks
-- Run in Supabase SQL Editor after schema-stage12.sql.
-- ============================================================

alter table public.arcp_entry_links enable row level security;

drop policy if exists "own arcp links" on public.arcp_entry_links;
drop policy if exists "sel_own_arcp_links" on public.arcp_entry_links;
drop policy if exists "ins_own_arcp_links" on public.arcp_entry_links;
drop policy if exists "upd_own_arcp_links" on public.arcp_entry_links;
drop policy if exists "del_own_arcp_links" on public.arcp_entry_links;

create policy "sel_own_arcp_links"
  on public.arcp_entry_links
  for select
  using (user_id = auth.uid());

create policy "ins_own_arcp_links"
  on public.arcp_entry_links
  for insert
  with check (
    user_id = auth.uid()
    and (
      (
        entry_type = 'portfolio'
        and entry_id in (
          select id
          from public.portfolio_entries
          where user_id = auth.uid()
            and deleted_at is null
        )
      )
      or
      (
        entry_type = 'case'
        and entry_id in (
          select id
          from public.cases
          where user_id = auth.uid()
            and deleted_at is null
        )
      )
    )
  );

create policy "upd_own_arcp_links"
  on public.arcp_entry_links
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      (
        entry_type = 'portfolio'
        and entry_id in (
          select id
          from public.portfolio_entries
          where user_id = auth.uid()
            and deleted_at is null
        )
      )
      or
      (
        entry_type = 'case'
        and entry_id in (
          select id
          from public.cases
          where user_id = auth.uid()
            and deleted_at is null
        )
      )
    )
  );

create policy "del_own_arcp_links"
  on public.arcp_entry_links
  for delete
  using (user_id = auth.uid());
