-- Stage 11: Entry templates, interview theme tagging

-- ── Templates table ──────────────────────────────────────────────────────────

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade, -- null = curated
  category text not null,
  name text not null,
  description text,
  field_defaults jsonb not null default '{}',
  guidance_prompts jsonb not null default '{}',
  is_curated boolean not null default false,
  created_at timestamptz default now()
);

alter table templates enable row level security;

create policy "read own and curated" on templates
  for select using (user_id = auth.uid() or user_id is null);

create policy "manage own" on templates
  for all using (user_id = auth.uid());

-- ── Interview theme columns ───────────────────────────────────────────────────

alter table portfolio_entries
  add column if not exists interview_themes text[] not null default '{}';

alter table cases
  add column if not exists interview_themes text[] not null default '{}';

-- ── Curated template seeds ────────────────────────────────────────────────────
-- user_id IS NULL = curated; is_curated = true

-- Audit & QIP
insert into templates (user_id, category, name, description, field_defaults, guidance_prompts, is_curated) values
(null, 'audit_qip', 'Completed Audit Cycle', 'A full audit cycle with re-audit and demonstrated improvement',
  '{"audit_type":"audit","audit_cycle_stage":"completed_loop"}',
  '{"title":"e.g. ''Antibiotic prescribing audit — ITU, City Hospital''","notes":"Describe the clinical standard you audited against, what gap you found, what change you implemented, and the re-audit outcome.","audit_outcome":"e.g. ''Compliance improved from 42% to 89% following introduction of prescribing checklist''"}',
  true),
(null, 'audit_qip', 'Re-audit After Intervention', 'Follow-up audit after implementing a change',
  '{"audit_type":"audit","audit_cycle_stage":"re_audit"}',
  '{"title":"e.g. ''Re-audit: Hand hygiene compliance — Surgical ward''","notes":"Describe what changed after your first cycle and what you found when you re-audited.","audit_outcome":"e.g. ''Compliance rose from 52% to 78% after introducing staff training sessions''"}',
  true),
(null, 'audit_qip', 'Prospective QIP', 'Quality improvement project with defined aim and outcome measures',
  '{"audit_type":"qip"}',
  '{"title":"e.g. ''QIP: Reducing catheter-associated UTIs on medical ward''","notes":"Describe the problem identified, your intervention, and outcome data."}',
  true),

-- Teaching & Presentations
(null, 'teaching', 'Taught Medical Student Bedside Session', 'Bedside clinical teaching session for medical students',
  '{"teaching_type":"taught_session","teaching_audience":"students"}',
  '{"title":"e.g. ''Bedside teaching: cardiovascular examination — 3rd year medical students''","notes":"Describe the learning objectives, how many students, the clinical setting, and any feedback received."}',
  true),
(null, 'teaching', 'Grand Round Presentation', 'Case or topic presentation at a hospital grand round',
  '{"teaching_type":"grand_round","teaching_audience":"consultants"}',
  '{"title":"e.g. ''Grand Round: Unusual presentation of Addisonian crisis''","notes":"Describe the case/topic presented, the key learning points, and the audience size."}',
  true),
(null, 'teaching', 'Regional Poster', 'Poster presented at a regional meeting or conference',
  '{"teaching_type":"poster","teaching_setting":"regional"}',
  '{"title":"e.g. ''Poster: Outcomes of laparoscopic cholecystectomy — Regional Surgical Meeting''","notes":"Include abstract, key findings, and any awards or commendations received."}',
  true),

-- Conferences & Courses
(null, 'conference', 'National Conference Attendee', 'Attendance at a national specialty conference',
  '{"conf_type":"conference","conf_attendance":"attendee","conf_level":"national"}',
  '{"conf_event_name":"e.g. ''RCP Annual Conference 2024''","notes":"Describe the key sessions attended and what you learnt."}',
  true),
(null, 'conference', 'ALS/ATLS Course', 'Advanced life support or trauma course completion',
  '{"conf_type":"course","conf_attendance":"attendee"}',
  '{"conf_event_name":"e.g. ''Advanced Life Support (ALS) — Resuscitation Council UK''","notes":"Include your overall grade/outcome and any specific skills developed."}',
  true),
(null, 'conference', 'Organised Local Teaching Event', 'Organising a local teaching session or study day',
  '{"conf_type":"conference","conf_attendance":"organiser","conf_level":"local"}',
  '{"conf_event_name":"e.g. ''Foundation Year Teaching Day — City Hospital''","notes":"Describe your role in organising the event, the programme content, and attendance numbers."}',
  true),

-- Publications & Research
(null, 'publication', 'Published Case Report', 'Case report accepted and published in a peer-reviewed journal',
  '{"pub_type":"case_report","pub_status":"published"}',
  '{"title":"e.g. ''Atypical presentation of meningitis in an immunocompromised patient''","pub_journal":"e.g. ''BMJ Case Reports''","pub_doi":"https://doi.org/…"}',
  true),
(null, 'publication', 'Original Research In Progress', 'Ongoing original research study with your role defined',
  '{"pub_type":"original_research","pub_status":"in_progress"}',
  '{"title":"e.g. ''Predictors of 30-day readmission following hip arthroplasty''","notes":"Describe your role in the study, the research question, and expected completion date."}',
  true),
(null, 'publication', 'Systematic Review', 'Systematic literature review in progress or submitted',
  '{"pub_type":"review","pub_status":"in_progress"}',
  '{"title":"e.g. ''Systematic review: Novel anticoagulants in AF management''","notes":"Describe the PICO question, search strategy, and current stage."}',
  true),

-- Leadership & Societies
(null, 'leadership', 'Medical Society Committee Role', 'Elected or appointed committee role in a medical society',
  '{}',
  '{"leader_role":"e.g. ''President'' / ''Secretary'' / ''Treasurer''","leader_organisation":"e.g. ''Medical Students Association, University of London''"}',
  true),
(null, 'leadership', 'Foundation Doctor Representative', 'Representative role on a foundation training committee',
  '{}',
  '{"leader_role":"e.g. ''FY1 Representative''","leader_organisation":"e.g. ''Foundation Training Committee, City Hospital NHS Trust''","notes":"Describe your responsibilities and any initiatives you led."}',
  true),
(null, 'leadership', 'BMA Role', 'Role within a British Medical Association committee or branch',
  '{}',
  '{"leader_role":"e.g. ''Junior Doctor Representative''","leader_organisation":"e.g. ''British Medical Association — Regional Committee''","notes":"Describe your role and any campaigns or work you have contributed to."}',
  true),

-- Prizes & Awards
(null, 'prize', 'Medical School Prize', 'Prize awarded by a medical school at local level',
  '{"prize_level":"local"}',
  '{"title":"e.g. ''Best Undergraduate Research Prize — Year 4''","prize_body":"e.g. ''University of Manchester Medical School''"}',
  true),
(null, 'prize', 'National Competition Award', 'Award or commendation from a national competition',
  '{"prize_level":"national"}',
  '{"title":"e.g. ''1st place — National Surgical Skills Competition''","prize_body":"e.g. ''Royal College of Surgeons''"}',
  true),

-- Procedures & Clinical Skills
(null, 'procedure', 'Cannula / Venepuncture Log', 'Log of cannulation or venepuncture procedures performed',
  '{"proc_name":"Cannulation / Venepuncture"}',
  '{"proc_setting":"e.g. ''Ward'', ''A&E'', ''Day Surgery''","notes":"Log the number of procedures and any particularly challenging cases."}',
  true),
(null, 'procedure', 'Lumbar Puncture', 'Lumbar puncture procedures performed',
  '{"proc_name":"Lumbar Puncture"}',
  '{"proc_setting":"e.g. ''Neurology ward'', ''AMU''","notes":"Note the clinical indication, technique used, and success rate."}',
  true),
(null, 'procedure', 'Arterial Blood Gas', 'ABG sampling procedures performed',
  '{"proc_name":"Arterial Blood Gas (ABG)"}',
  '{"proc_setting":"e.g. ''ITU'', ''Respiratory ward''","notes":"Note the clinical context and interpretation findings."}',
  true),

-- Reflections & CBDs/DOPs
(null, 'reflection', 'CBD — Acute Presentation', 'Case-based discussion for an acute medicine encounter',
  '{"refl_type":"cbd"}',
  '{"title":"e.g. ''CBD: Acute chest pain management — A&E''","refl_clinical_context":"e.g. ''Acute medicine on-call, 65-year-old with STEMI''"}',
  true),
(null, 'reflection', 'Mini-CEX — Clinic', 'Mini clinical evaluation exercise from an outpatient clinic',
  '{"refl_type":"mini_cex"}',
  '{"title":"e.g. ''Mini-CEX: Diabetic foot examination — Endocrinology clinic''","refl_clinical_context":"e.g. ''Outpatient diabetes clinic, patient with poorly-controlled T2DM''"}',
  true),
(null, 'reflection', 'Free Reflection', 'Unstructured personal reflection on a clinical experience',
  '{"refl_type":"reflection"}',
  '{"title":"e.g. ''Reflection on a difficult conversation with a patient''","notes":"Consider using Gibbs'' Reflective Cycle or Rolfe''s model for structure."}',
  true),

-- Custom
(null, 'custom', 'Generic Achievement', 'A freeform achievement entry',
  '{}',
  '{"title":"e.g. ''Hospital COVID-19 Response Volunteer''","notes":"Describe the achievement, your role, and its impact."}',
  true);
