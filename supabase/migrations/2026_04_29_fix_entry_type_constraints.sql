-- Re-enforce portfolio-only evidence constraints.

delete from public.specialty_entry_links where entry_type = 'case';

alter table public.specialty_entry_links
  drop constraint if exists specialty_entry_links_entry_type_check;

alter table public.specialty_entry_links
  add constraint specialty_entry_links_entry_type_check
  check (entry_type = 'portfolio');

delete from public.arcp_entry_links where entry_type = 'case';

alter table public.arcp_entry_links
  drop constraint if exists arcp_entry_links_entry_type_check;

alter table public.arcp_entry_links
  add constraint arcp_entry_links_entry_type_check
  check (entry_type = 'portfolio');
