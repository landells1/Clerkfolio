-- Widen the profiles.career_stage CHECK to include post-foundation
-- non-training stages: F3 (a year out after FY2) and OUT_OF_TRAINING
-- (SAS / non-training post / career break). Additive/backward-compatible:
-- existing values still pass; only two new allowed values are added.
-- Applied to prod 2026-07-12; advisors unchanged.
alter table public.profiles
  drop constraint if exists profiles_career_stage_check;

alter table public.profiles
  add constraint profiles_career_stage_check
  check (
    career_stage is null
    or career_stage = any (array[
      'Y1','Y2','Y3','Y4','Y5_PLUS','FY1','FY2','F3','OUT_OF_TRAINING','POST_FY'
    ]::text[])
  );
