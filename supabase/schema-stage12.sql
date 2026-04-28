-- ============================================================
-- Stage 12: Specialty Tracking, ARCP & Application Readiness
-- ============================================================

-- 1. Auto-populated deadlines columns
alter table deadlines add column if not exists source_specialty_key text;
alter table deadlines add column if not exists is_auto boolean not null default false;

-- 2. Specialty applications: cycle migration columns
alter table specialty_applications add column if not exists is_active boolean not null default true;
alter table specialty_applications add column if not exists archived_at timestamptz;

-- 3. ARCP capabilities (seeded, read-only for users)
create table if not exists arcp_capabilities (
  id uuid primary key default gen_random_uuid(),
  capability_key text unique not null,
  name text not null,
  description text,
  category text not null check (category in ('clinical', 'safety', 'professional', 'development')),
  sort_order int not null default 0
);
alter table arcp_capabilities enable row level security;
-- Authenticated users can read capabilities; nobody can write via the API (admin-seeded only)
create policy "arcp capabilities readable by authenticated users" on arcp_capabilities
  for select using (auth.role() = 'authenticated');

-- 4. ARCP entry links (user's evidence links)
create table if not exists arcp_entry_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  capability_key text not null,
  entry_id uuid not null,
  entry_type text not null check (entry_type in ('portfolio', 'case')),
  notes text,
  created_at timestamptz default now(),
  unique(user_id, capability_key, entry_id, entry_type)
);
alter table arcp_entry_links enable row level security;
create policy "own arcp links" on arcp_entry_links
  for all using (user_id = auth.uid());

-- 5. Share links (shareable read-only specialty views)
create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  specialty_key text,              -- null = full portfolio (future); set = specialty view
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked boolean not null default false,
  created_at timestamptz default now()
);
alter table share_links enable row level security;
create policy "own share links" on share_links
  for all using (user_id = auth.uid());

-- 6. Seed ARCP capabilities (Foundation Programme Curriculum 2021)
--    Source: https://www.fparcp.co.uk/employers/curriculum
insert into arcp_capabilities (capability_key, name, description, category, sort_order) values
  -- Clinical
  ('clinical_assessment',
   'Clinical Assessment',
   'Gather clinical information through history taking, physical examination and appropriate investigations, and synthesise findings to formulate a differential diagnosis.',
   'clinical', 10),
  ('clinical_management',
   'Clinical Management',
   'Formulate and implement appropriate management plans, prioritising patient safety and applying evidence-based medicine.',
   'clinical', 20),
  ('clinical_procedures',
   'Clinical Procedures',
   'Perform clinical procedures safely and effectively, within the scope of Foundation training.',
   'clinical', 30),
  ('time_management',
   'Time Management & Decision Making',
   'Organise and prioritise workload effectively; make appropriate and timely clinical decisions.',
   'clinical', 40),

  -- Safety
  ('safeguarding',
   'Safeguarding',
   'Recognise and respond appropriately to safeguarding concerns for children and vulnerable adults.',
   'safety', 50),
  ('infection_control',
   'Infection Prevention & Control',
   'Apply standard infection prevention and control principles consistently across all clinical settings.',
   'safety', 60),
  ('prescribing_safety',
   'Prescribing Safety',
   'Prescribe drugs safely, effectively and economically, including recognising and managing adverse drug reactions.',
   'safety', 70),
  ('clinical_governance',
   'Clinical Governance & Patient Safety',
   'Participate in clinical governance activities; contribute to and promote a culture of patient safety and learning from errors.',
   'safety', 80),

  -- Professional
  ('communication',
   'Communication',
   'Communicate effectively with patients, carers and colleagues using verbal, non-verbal and written skills, including breaking bad news.',
   'professional', 90),
  ('teamworking',
   'Teamworking',
   'Work effectively as a member and leader of the multidisciplinary healthcare team.',
   'professional', 100),
  ('teaching_training',
   'Teaching & Training',
   'Contribute to the education and training of medical students, junior colleagues and other healthcare professionals.',
   'professional', 110),
  ('leadership',
   'Leadership',
   'Demonstrate appropriate leadership behaviours; support colleagues and contribute to service improvement.',
   'professional', 120),
  ('professionalism',
   'Professionalism & Ethics',
   'Maintain professional standards, demonstrate integrity, act in patients'' best interests and adhere to GMC Good Medical Practice.',
   'professional', 130),

  -- Development
  ('research_scholarship',
   'Research & Scholarship',
   'Apply research skills and evidence-based medicine in clinical practice; participate in or support research activity.',
   'development', 140),
  ('quality_improvement',
   'Quality Improvement & Audit',
   'Engage in audit cycles and quality improvement projects that contribute to better patient care or service delivery.',
   'development', 150),
  ('maintaining_gmp',
   'Maintaining Good Medical Practice',
   'Maintain fitness to practise; engage in reflection, appraisal and revalidation processes.',
   'development', 160),
  ('health_promotion',
   'Health Promotion & Public Health',
   'Apply population health and public health principles; advise patients on preventive health and health-promoting behaviours.',
   'development', 170)
on conflict (capability_key) do nothing;
