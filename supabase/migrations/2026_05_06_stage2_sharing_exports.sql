-- Stage 2 batch 8: sharing, exports, and multi-portfolio.
-- Apply manually to Supabase project dldhnstjngendpcywthv (eu-west-2).

alter table public.share_links
  add column if not exists hide_notes boolean default false,
  add column if not exists hide_reflection boolean default false,
  add column if not exists redact_tags boolean default false;

alter table public.portfolio_entries
  add column if not exists interview_ready_for text[] default '{}';

alter table public.cases
  add column if not exists interview_ready_for text[] default '{}';
