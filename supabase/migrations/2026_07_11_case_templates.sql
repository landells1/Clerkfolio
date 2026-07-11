-- Case templates (2026-07-11)
--
-- Extends the existing `templates` table (portfolio entry templates: curated
-- rows have user_id IS NULL + is_curated = true, personal rows are user-owned)
-- so it can also hold clinical CASE templates, discriminated by a new
-- `entry_type` column.
--
-- Additive and backward-compatible with the currently deployed code:
--   * `entry_type` is NOT NULL DEFAULT 'portfolio', so every existing row
--     (all portfolio templates today) is backfilled to 'portfolio' by the
--     default, and deployed inserts that do not mention the column keep
--     working (they get the default).
--   * Deployed reads (`select *`) simply carry the extra column; nothing
--     reads it until the new code ships.
--   * THE CATEGORY QUESTION: `category` is text NOT NULL with no CHECK
--     constraint (created in the stage-11 schema; the app validates it in
--     /api/templates instead). Cases have no category concept, so case
--     template rows store the sentinel value 'case' in `category` rather
--     than reusing a portfolio category or making the column nullable
--     (deployed code types `category` as required, so nullable was rejected;
--     reusing a portfolio value was rejected because the deployed entry
--     picker would then surface the curated case rows seeded below in the
--     window between this migration applying and the new code deploying).
--     Every deployed grouping UI iterates the portfolio CATEGORIES list, so
--     rows whose category is 'case' are invisible to deployed clients until
--     the entry_type-aware code ships. If a CHECK on category did exist in
--     prod, the seed inserts below would fail loudly and roll this whole
--     migration back atomically - nothing partial can land.
--   * RLS is unchanged: the existing "read own and curated"
--     (user_id = auth.uid() OR user_id IS NULL) and "manage own" policies
--     are row-based and cover the new column and rows without modification.
--     No grant changes: column-level grants are not used on this table.
--   * No new index: templates is a small per-user table queried through the
--     RLS user_id filter; an entry_type index would not pay for itself.

alter table public.templates
  add column if not exists entry_type text not null default 'portfolio'
    check (entry_type in ('portfolio', 'case'));

-- Curated case templates for FY1/FY2 doctors. Idempotent: each row is
-- skipped if a curated case template with the same name already exists.
-- Content is neutral scaffolding only - headings and prompts, with
-- anonymisation reminders wherever clinical detail goes. No clinical facts,
-- no advice or verdict language.

insert into public.templates (user_id, entry_type, category, name, description, field_defaults, guidance_prompts, is_curated)
select v.user_id, v.entry_type, v.category, v.name, v.description, v.field_defaults::jsonb, v.guidance_prompts::jsonb, v.is_curated
from (
  values
    (null::uuid, 'case', 'case', 'Acute Presentation Clerking',
      'Structured write-up of an acute presentation you assessed',
      '{"notes":"Presentation (anonymised - no names, dates of birth or NHS numbers):\n\nAssessment and differential:\n\nInvestigations:\n\nManagement and escalation:\n\nOutcome:\n\nWhat I learned:"}',
      '{"title":"e.g. ''Chest pain assessment - acute medical take''"}',
      true),
    (null::uuid, 'case', 'case', 'Procedure Log',
      'A procedure you performed or assisted with',
      '{"notes":"Procedure:\n\nIndication (anonymised - no patient identifiers):\n\nSupervision level:\n\nTechnique and approach:\n\nComplications, if any:\n\nOutcome and learning points:"}',
      '{"title":"e.g. ''Ascitic drain insertion - medical ward''"}',
      true),
    (null::uuid, 'case', 'case', 'Ward Round Learning Point',
      'A quick record of something you learned on a ward round',
      '{"notes":"Clinical context (anonymised - no patient identifiers):\n\nDecision made and rationale discussed:\n\nWhat I learned:\n\nHow this will change my practice:"}',
      '{"title":"e.g. ''Steroid weaning decision - respiratory ward round''"}',
      true),
    (null::uuid, 'case', 'case', 'Structured Case Reflection',
      'A fuller reflection on a memorable or challenging case',
      '{"notes":"What happened (anonymised - no names, dates of birth or NHS numbers):\n\nWhat went well:\n\nWhat was challenging:\n\nWhat I would do differently:\n\nLearning points:"}',
      '{"title":"e.g. ''Reflection on a deteriorating patient overnight''"}',
      true),
    (null::uuid, 'case', 'case', 'Clinic Case Summary',
      'A case seen in clinic, written up like a structured clinic letter',
      '{"notes":"Reason for attendance (anonymised - no patient identifiers):\n\nRelevant background:\n\nFindings:\n\nImpression:\n\nPlan agreed:\n\nWhat I learned:"}',
      '{"title":"e.g. ''New patient assessment - dermatology clinic''"}',
      true)
) as v(user_id, entry_type, category, name, description, field_defaults, guidance_prompts, is_curated)
where not exists (
  select 1 from public.templates t
  where t.is_curated
    and t.entry_type = 'case'
    and t.name = v.name
);
