-- ============================================================
-- Security hardening: specialty_entry_links RLS
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================
--
-- Problem: The original "Users manage own specialty entry links" ALL policy only
-- verifies that application_id belongs to the current user. It does NOT verify
-- that entry_id belongs to the same user in the correct source table.
-- A malicious user could create links that reference another user's entries.
--
-- Fix: Replace the single ALL policy with per-operation policies that check
-- BOTH application_id ownership AND entry_id ownership in the correct table.
-- is_checkbox rows are exempt from the entry_id check (they are synthetic claims
-- that may not map 1:1 to a portfolio/case row).
-- ============================================================

-- Drop the existing permissive catch-all policy
DROP POLICY IF EXISTS "Users manage own specialty entry links" ON public.specialty_entry_links;

-- ── SELECT ────────────────────────────────────────────────────────────────────
CREATE POLICY "sel_own_specialty_entry_links"
  ON public.specialty_entry_links
  FOR SELECT
  USING (
    -- application must belong to the current user
    application_id IN (
      SELECT id FROM public.specialty_applications WHERE user_id = auth.uid()
    )
    -- entry must belong to the current user in the correct source table,
    -- unless this is a checkbox claim (is_checkbox = true)
    AND (
      is_checkbox = true
      OR (
        entry_type = 'portfolio'
        AND entry_id IN (
          SELECT id FROM public.portfolio_entries
          WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
      )
      OR (
        entry_type = 'case'
        AND entry_id IN (
          SELECT id FROM public.cases
          WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
      )
    )
  );

-- ── INSERT ────────────────────────────────────────────────────────────────────
CREATE POLICY "ins_own_specialty_entry_links"
  ON public.specialty_entry_links
  FOR INSERT
  WITH CHECK (
    application_id IN (
      SELECT id FROM public.specialty_applications WHERE user_id = auth.uid()
    )
    AND (
      is_checkbox = true
      OR (
        entry_type = 'portfolio'
        AND entry_id IN (
          SELECT id FROM public.portfolio_entries
          WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
      )
      OR (
        entry_type = 'case'
        AND entry_id IN (
          SELECT id FROM public.cases
          WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
      )
    )
  );

-- ── UPDATE ────────────────────────────────────────────────────────────────────
CREATE POLICY "upd_own_specialty_entry_links"
  ON public.specialty_entry_links
  FOR UPDATE
  USING (
    application_id IN (
      SELECT id FROM public.specialty_applications WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    application_id IN (
      SELECT id FROM public.specialty_applications WHERE user_id = auth.uid()
    )
    AND (
      is_checkbox = true
      OR (
        entry_type = 'portfolio'
        AND entry_id IN (
          SELECT id FROM public.portfolio_entries
          WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
      )
      OR (
        entry_type = 'case'
        AND entry_id IN (
          SELECT id FROM public.cases
          WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
      )
    )
  );

-- ── DELETE ────────────────────────────────────────────────────────────────────
-- Ownership of the application is sufficient to delete a link.
CREATE POLICY "del_own_specialty_entry_links"
  ON public.specialty_entry_links
  FOR DELETE
  USING (
    application_id IN (
      SELECT id FROM public.specialty_applications WHERE user_id = auth.uid()
    )
  );
