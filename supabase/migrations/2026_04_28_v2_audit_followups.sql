-- Follow-ups from the production bug and feature audit.

alter table public.specialty_entry_links
  drop constraint if exists specialty_entry_links_entry_type_check;

alter table public.specialty_entry_links
  add constraint specialty_entry_links_entry_type_check
  check (entry_type = any (array['portfolio'::text, 'case'::text]));

drop index if exists public.entry_revisions_entry_created_idx;

drop policy if exists "manage own" on public.templates;
drop policy if exists "read own and curated" on public.templates;

create policy "read own and curated"
  on public.templates
  for select
  using (user_id = (select auth.uid()) or user_id is null);

create policy "insert own templates"
  on public.templates
  for insert
  with check (user_id = (select auth.uid()));

create policy "update own templates"
  on public.templates
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "delete own templates"
  on public.templates
  for delete
  using (user_id = (select auth.uid()));
