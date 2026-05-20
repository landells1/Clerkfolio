-- Repeatable smoke test for recompute_profile_tier.
-- Run against any environment that has the phase 3 migrations applied.
-- Exercises the cases Codex's 2026-05-20 audit flagged in finding #7, plus the
-- NHS-verified-before-onboarding gap.
--
-- Returns one row per case showing (name, old_tier, new_tier). Compare with the
-- "expected" comments below; any deviation indicates a regression in the CASE
-- branches inside public.recompute_profile_tier.
--
-- Note: this uses an inline CASE that mirrors the function body so the test
-- works in any project regardless of whether real profiles exist. For an
-- end-to-end function smoke test, pick three real profile IDs and call
-- public.recompute_profile_tier(id) - the function should return the existing
-- tier value for healthy rows.

WITH cases AS (
  SELECT * FROM (VALUES
    -- name                       old_tier      verified due_date              email                     career_stage  grad_date
    ('pro_stays_pro',             'pro',        true,    CURRENT_DATE + 30,    'student@imperial.ac.uk', 'FY1',        NULL::date),    -- expect pro
    ('free_no_verify',            'free',       false,   NULL,                 NULL,                     'Y3',         CURRENT_DATE + 365), -- expect free
    ('student_valid',             'free',       true,    CURRENT_DATE + 30,    'med@imperial.ac.uk',     'Y3',         CURRENT_DATE + 365), -- expect student
    ('student_expired',           'student',    true,    CURRENT_DATE - 1,     'med@imperial.ac.uk',     'Y3',         CURRENT_DATE + 365), -- expect free
    ('student_graduated',         'student',    true,    CURRENT_DATE + 30,    'med@imperial.ac.uk',     'Y3',         CURRENT_DATE - 1),   -- expect free
    ('foundation_valid',          'free',       true,    CURRENT_DATE + 30,    'nurse@nhs.net',          'FY1',        NULL),               -- expect foundation
    ('foundation_expired',        'foundation', true,    CURRENT_DATE - 1,     'nurse@nhs.net',          'FY1',        NULL),               -- expect free (Codex #7)
    ('nhs_before_onboarding',     'free',       true,    CURRENT_DATE + 30,    'nurse@nhs.net',          NULL,         NULL),               -- expect free (recompute again after career_stage write)
    ('student_moved_to_fy1',      'student',    true,    CURRENT_DATE + 30,    'med@imperial.ac.uk',     'FY1',        CURRENT_DATE + 365)  -- expect foundation
  ) AS t(name, tier, verified, due_date, email, career_stage, grad_date)
)
SELECT
  name,
  tier AS old_tier,
  CASE
    WHEN tier = 'pro' THEN 'pro'
    WHEN verified
      AND (due_date IS NOT NULL AND due_date >= CURRENT_DATE)
      AND email LIKE '%.ac.uk'
      AND COALESCE(career_stage, '') NOT IN ('FY1','FY2','POST_FY')
      AND (grad_date IS NULL OR grad_date >= CURRENT_DATE)
      THEN 'student'
    WHEN verified
      AND (due_date IS NOT NULL AND due_date >= CURRENT_DATE)
      AND COALESCE(career_stage, '') IN ('FY1','FY2','POST_FY')
      THEN 'foundation'
    ELSE 'free'
  END AS new_tier
FROM cases
ORDER BY name;
