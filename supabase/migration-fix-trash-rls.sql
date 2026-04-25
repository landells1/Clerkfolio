-- ============================================================
-- Fix: Trash page cannot see soft-deleted rows
-- The SELECT RLS policies added in stage9 include `deleted_at IS NULL`,
-- which prevents the trash page from querying deleted rows at all.
-- Application code already handles deleted_at filtering, so we revert
-- the SELECT policies to simply check user ownership.
-- ============================================================

DROP POLICY IF EXISTS "Users can view own cases" ON public.cases;
CREATE POLICY "Users can view own cases"
  ON public.cases FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own portfolio entries" ON public.portfolio_entries;
CREATE POLICY "Users can view own portfolio entries"
  ON public.portfolio_entries FOR SELECT
  USING (auth.uid() = user_id);
