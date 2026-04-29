-- Re-enforce portfolio-only evidence constraints for new writes.
-- Existing non-portfolio rows are left untouched here to avoid destructive data
-- loss; clean-up can be handled separately if any legacy rows exist.

alter table public.specialty_entry_links
  drop constraint if exists specialty_entry_links_entry_type_check;

alter table public.specialty_entry_links
  add constraint specialty_entry_links_entry_type_check
  check (entry_type = 'portfolio') not valid;

alter table public.arcp_entry_links
  drop constraint if exists arcp_entry_links_entry_type_check;

alter table public.arcp_entry_links
  add constraint arcp_entry_links_entry_type_check
  check (entry_type = 'portfolio') not valid;
