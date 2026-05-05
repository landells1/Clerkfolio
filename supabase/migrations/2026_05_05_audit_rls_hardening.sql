-- =====================================================================
-- 2026_05_05_audit_rls_hardening
--
-- Tightens RLS write protection on tables that should be service-role
-- only and adds the missing UPDATE policy on evidence_files plus a few
-- hot-path indexes.
--
-- Idempotent: every CREATE POLICY is preceded by DROP POLICY IF EXISTS,
-- and CREATE INDEX uses IF NOT EXISTS. Safe to re-run.
--
-- NOT changed in this migration (see follow-ups):
--  * entry_revisions FOR ALL policy is left alone — the client-side
--    prune in entry-form / case-form depends on user-side DELETE.
--    Move pruning to a server-side function before tightening.
--  * audit_log partitioning / pg_cron purge already runs as a Vercel
--    cron; partition refactor is a separate change.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. evidence_files: add UPDATE policy so client-side metadata edits
--    (e.g. future rename) work via RLS instead of silently failing.
--    Service-role writes (scan status) continue to bypass RLS.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own evidence files" ON evidence_files;
CREATE POLICY "Users can update own evidence files"
  ON evidence_files
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 2. arcp_capabilities: read-only seed data. Block user-side writes
--    explicitly so a future RLS regression cannot let users mutate it.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Block user inserts on arcp_capabilities" ON arcp_capabilities;
CREATE POLICY "Block user inserts on arcp_capabilities"
  ON arcp_capabilities
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block user updates on arcp_capabilities" ON arcp_capabilities;
CREATE POLICY "Block user updates on arcp_capabilities"
  ON arcp_capabilities
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block user deletes on arcp_capabilities" ON arcp_capabilities;
CREATE POLICY "Block user deletes on arcp_capabilities"
  ON arcp_capabilities
  FOR DELETE
  USING (false);

-- ---------------------------------------------------------------------
-- 3. share_views: writes are service-role only (the access route uses
--    the service client). Block user-side writes so misuse from the
--    browser fails loudly rather than silently no-oping.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Block user inserts on share_views" ON share_views;
CREATE POLICY "Block user inserts on share_views"
  ON share_views
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block user updates on share_views" ON share_views;
CREATE POLICY "Block user updates on share_views"
  ON share_views
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block user deletes on share_views" ON share_views;
CREATE POLICY "Block user deletes on share_views"
  ON share_views
  FOR DELETE
  USING (false);

-- ---------------------------------------------------------------------
-- 4. share_access_attempts: same model as share_views.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Block user inserts on share_access_attempts" ON share_access_attempts;
CREATE POLICY "Block user inserts on share_access_attempts"
  ON share_access_attempts
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block user updates on share_access_attempts" ON share_access_attempts;
CREATE POLICY "Block user updates on share_access_attempts"
  ON share_access_attempts
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block user deletes on share_access_attempts" ON share_access_attempts;
CREATE POLICY "Block user deletes on share_access_attempts"
  ON share_access_attempts
  FOR DELETE
  USING (false);

-- ---------------------------------------------------------------------
-- 5. Hot-path index for evidence_files quota lookups.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS evidence_files_user_scan_idx
  ON evidence_files(user_id, scan_status);

-- ---------------------------------------------------------------------
-- 6. Defensive index on referrals(referred_id, status) — entitlements
--    function joins on these fields when granting referral pro time.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS referrals_referred_status_idx
  ON referrals(referred_id, status);
