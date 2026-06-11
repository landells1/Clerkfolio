-- AUDIT-18 (2026-06-10 audit): audit share-link expiry extensions.
--
-- PATCH /api/share lets the owner extend a link's expiry (now + <=90 days)
-- with no count limit. That is intended behaviour, but the audit trail
-- previously recorded only generated/viewed/revoked, so a link "created for
-- 7 days" could be kept alive forever with no trace. The route now inserts a
-- 'share_link_extended' audit row; this extends the enum to accept it.
--
-- ADD VALUE IF NOT EXISTS is idempotent, so re-running is a no-op.
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'share_link_extended';
