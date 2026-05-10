-- Application Mode (redesign stage 9): mark a single tracked specialty as the
-- user's "target" so the dashboard can surface a deadline-countdown banner.
-- One target per user max; enforced via a partial unique index. Default false.
ALTER TABLE specialty_applications
  ADD COLUMN IF NOT EXISTS is_target BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS specialty_applications_one_target_per_user
  ON specialty_applications (user_id)
  WHERE is_target = true;
