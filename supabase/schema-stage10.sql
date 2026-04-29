-- ============================================================
-- Clerkfolio — Stage 10 Schema: Add missing cycle_year column
-- Run this in the Supabase SQL Editor after schema-stage9.sql
-- ============================================================

-- ── Add cycle_year to specialty_applications ──────────────────────────────────
-- This column was referenced in app code but omitted from the original schema,
-- causing "Failed to add specialty" on insert.

alter table public.specialty_applications
  add column if not exists cycle_year int not null default 0;

-- Backfill existing rows from the specialty_key (e.g. 'imt_2026' → 2026)
update public.specialty_applications
  set cycle_year = cast(split_part(specialty_key, '_', array_length(string_to_array(specialty_key, '_'), 1)) as int)
  where cycle_year = 0
    and specialty_key ~ '_[0-9]{4}$';
