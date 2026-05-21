-- Audit remediation - 2026-05-21 phase 4b
-- Closes remaining DB-level findings:
--   #18 session_fingerprints_active_uq missing session_id
--   #22 student_graduation_date lacks server-side sanity bounds

-- ────────────────────────────────────────────────────────────────────────────
-- #18. session_fingerprints: extend unique index to include session_id.
--
-- The existing index (user_id, ip_hash, user_agent) WHERE revoked_at IS NULL
-- caused collisions when two sessions from the same browser/IP shared a
-- fingerprint. Adding COALESCE(session_id, '') to the index ensures each
-- Supabase session gets its own row, so revoke targets one session not all.
-- ────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS public.session_fingerprints_active_uq;

CREATE UNIQUE INDEX session_fingerprints_active_uq
  ON public.session_fingerprints (user_id, ip_hash, user_agent, COALESCE(session_id, ''))
  WHERE revoked_at IS NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- #22. student_graduation_date: add sanity bounds.
--
-- A date more than 2 years in the past or more than 8 years in the future is
-- almost certainly a data-entry error or a crafted payload. The range covers
-- all realistic UK medical school programmes (4–6 years) plus some slack for
-- graduate-entry programmes.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS student_graduation_date_bounds;

ALTER TABLE public.profiles
  ADD CONSTRAINT student_graduation_date_bounds CHECK (
    student_graduation_date IS NULL
    OR (
      student_graduation_date >= current_date - interval '2 years'
      AND student_graduation_date <= current_date + interval '8 years'
    )
  );

NOTIFY pgrst, 'reload schema';
