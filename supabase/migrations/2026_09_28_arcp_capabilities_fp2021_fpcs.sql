-- Pre-launch review 2026-09-28: the ARCP tracker listed 17 capabilities
-- labelled FP2021 ("Clinical Procedures", "Infection Prevention & Control",
-- ...) that are not the UK Foundation Programme Curriculum 2021. That
-- curriculum has 13 Foundation Professional Capabilities (FPCs) under 3 Higher
-- Level Outcomes (HLOs) - as the site's own ARCP guide
-- (lib/guides/content/foundation-arcp-evidence-requirements.ts, verified
-- against UKFPO sources 2026-07-13) already states. Users were mapping evidence
-- to categories that do not exist in Horus/Turas.
--
-- Re-seed with the 13 FPCs. arcp_entry_links had ZERO rows when this was
-- written, so no user mapping is lost; links key on capability_key (no FK),
-- and any link to a retired key would simply stop being displayed.
--
-- The category CHECK only allows the four legacy values, and the deployed
-- page groups by them, so the HLOs are stored in three of them (HLO 1 ->
-- clinical, HLO 2 -> professional, HLO 3 -> development; 'safety' is unused).
-- The app relabels those groups as the HLOs. This keeps the migration
-- backward-compatible with the code deployed before it.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.arcp_entry_links WHERE capability_key NOT LIKE 'fpc%') THEN
    RAISE EXCEPTION 'arcp_entry_links reference retired capability keys - map them to FPCs before re-seeding';
  END IF;
END $$;

DELETE FROM public.arcp_capabilities
WHERE capability_key NOT LIKE 'fpc%';

INSERT INTO public.arcp_capabilities (capability_key, name, description, category, sort_order, curriculum_version) VALUES
  ('fpc01_clinical_assessment', 'FPC 1: Clinical assessment', 'Assess patients in a range of settings, including the acutely unwell, gathering and interpreting clinical information to reach a working diagnosis.', 'clinical', 10, 'FP2021'),
  ('fpc02_clinical_prioritisation', 'FPC 2: Clinical prioritisation', 'Recognise and prioritise the needs of patients, including the deteriorating patient, and escalate appropriately.', 'clinical', 20, 'FP2021'),
  ('fpc03_holistic_planning', 'FPC 3: Holistic planning', 'Make individualised management plans, including safe prescribing, that take account of the whole patient.', 'clinical', 30, 'FP2021'),
  ('fpc04_communication_and_care', 'FPC 4: Communication and care', 'Communicate clearly and compassionately with patients, relatives and colleagues, supporting shared decision-making.', 'clinical', 40, 'FP2021'),
  ('fpc05_continuity_of_care', 'FPC 5: Continuity of care', 'Contribute to safe ongoing care in and out of hours, including clear handover and discharge planning.', 'clinical', 50, 'FP2021'),
  ('fpc06_sharing_the_vision', 'FPC 6: Sharing the vision', 'Work effectively in multidisciplinary teams and show leadership and followership in delivering care.', 'professional', 60, 'FP2021'),
  ('fpc07_fitness_to_practise', 'FPC 7: Fitness to practise', 'Look after your own health and wellbeing, work within your competence and act when fitness to practise is a concern.', 'professional', 70, 'FP2021'),
  ('fpc08_upholding_values', 'FPC 8: Upholding values', 'Act in line with professional values and the GMC''s standards in everyday practice.', 'professional', 80, 'FP2021'),
  ('fpc09_quality_improvement', 'FPC 9: Quality improvement', 'Contribute to quality improvement and patient safety, including audit, QI projects and learning from incidents.', 'professional', 90, 'FP2021'),
  ('fpc10_teaching_the_teacher', 'FPC 10: Teaching the teacher', 'Plan, deliver and reflect on teaching for colleagues and students, and seek feedback on it.', 'professional', 100, 'FP2021'),
  ('fpc11_ethics_and_law', 'FPC 11: Ethics and law', 'Practise within ethical and legal frameworks, including consent, capacity, confidentiality and safeguarding.', 'development', 110, 'FP2021'),
  ('fpc12_continuing_professional_development', 'FPC 12: Continuing professional development', 'Take responsibility for your own learning through reflection, feedback, supervision and portfolio development.', 'development', 120, 'FP2021'),
  ('fpc13_understanding_medicine', 'FPC 13: Understanding medicine', 'Apply scientific knowledge, evidence-based practice and research awareness to patient care.', 'development', 130, 'FP2021')
ON CONFLICT (capability_key) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order,
      curriculum_version = EXCLUDED.curriculum_version;

-- Rollback reference: the 17 rows this migration removed (they were not in any
-- repo migration). To restore, delete the fpc% rows and re-insert these:
-- (capability_key, name, category, sort_order, curriculum_version='FP2021')
--   clinical_assessment   | Clinical Assessment                  | clinical     | 10
--   clinical_management   | Clinical Management                  | clinical     | 20
--   clinical_procedures   | Clinical Procedures                  | clinical     | 30
--   time_management       | Time Management & Decision Making    | clinical     | 40
--   safeguarding          | Safeguarding                         | safety       | 50
--   infection_control     | Infection Prevention & Control       | safety       | 60
--   prescribing_safety    | Prescribing Safety                   | safety       | 70
--   clinical_governance   | Clinical Governance & Patient Safety | safety       | 80
--   communication         | Communication                        | professional | 90
--   teamworking           | Teamworking                          | professional | 100
--   teaching_training     | Teaching & Training                  | professional | 110
--   leadership            | Leadership                           | professional | 120
--   professionalism       | Professionalism & Ethics             | professional | 130
--   research_scholarship  | Research & Scholarship               | development  | 140
--   quality_improvement   | Quality Improvement & Audit          | development  | 150
--   maintaining_gmp       | Maintaining Good Medical Practice    | development  | 160
--   health_promotion      | Health Promotion & Public Health     | development  | 170
