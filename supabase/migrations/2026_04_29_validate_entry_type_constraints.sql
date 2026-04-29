-- Clean any legacy case evidence links and validate the portfolio-only checks
-- in environments where the earlier non-destructive migration has already run.

delete from public.specialty_entry_links where entry_type = 'case';
delete from public.arcp_entry_links where entry_type = 'case';

alter table public.specialty_entry_links
  validate constraint specialty_entry_links_entry_type_check;

alter table public.arcp_entry_links
  validate constraint arcp_entry_links_entry_type_check;
