-- ============================================================
-- Clerkfolio — Stage 6 Schema
-- Run this in the Supabase SQL Editor after schema-stage4.sql
-- ============================================================

-- Add completed flag and notes to deadlines
alter table public.deadlines add column if not exists completed boolean default false not null;
alter table public.deadlines add column if not exists notes text;

-- GIN indexes for full-text search on title
create index if not exists portfolio_entries_title_gin_idx
  on public.portfolio_entries using gin(to_tsvector('english', title));

create index if not exists cases_title_gin_idx
  on public.cases using gin(to_tsvector('english', title));

-- Index for cases domain filter
create index if not exists cases_domain_idx
  on public.cases(user_id, clinical_domain)
  where clinical_domain is not null;

-- GIN index for specialty tag overlap queries
create index if not exists cases_specialty_tags_gin_idx
  on public.cases using gin(specialty_tags);

create index if not exists portfolio_specialty_tags_gin_idx
  on public.portfolio_entries using gin(specialty_tags);

-- Index for deadline completion queries
create index if not exists deadlines_user_completed_idx
  on public.deadlines(user_id, completed, due_date asc);
