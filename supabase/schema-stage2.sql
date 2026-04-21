-- ============================================================
-- Clinidex — Stage 2 Schema
-- Run this in the Supabase SQL Editor after schema.sql
-- ============================================================

create table public.portfolio_entries (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  category    text not null check (category in (
                'audit_qip','teaching','conference','publication',
                'leadership','prize','procedure','reflection','custom'
              )),
  title       text not null,
  date        date not null,
  specialty_tags text[] default '{}',
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  -- Audit & QIP
  audit_type         text check (audit_type in ('audit','qip')),
  audit_role         text,
  audit_cycle_stage  text check (audit_cycle_stage in ('1st_cycle','re_audit','completed_loop')),
  audit_trust        text,
  audit_outcome      text,
  audit_presented    boolean,

  -- Teaching & Presentations
  teaching_type      text check (teaching_type in ('taught_session','grand_round','poster','oral')),
  teaching_audience  text check (teaching_audience in ('students','peers','consultants','public')),
  teaching_setting   text check (teaching_setting in ('local','regional','national','international')),
  teaching_event     text,
  teaching_invited   boolean,

  -- Conferences & Courses
  conf_type          text check (conf_type in ('conference','course')),
  conf_event_name    text,
  conf_attendance    text check (conf_attendance in ('attendee','presenter','organiser')),
  conf_level         text check (conf_level in ('local','regional','national','international')),
  conf_cpd_hours     numeric,
  conf_certificate   boolean,

  -- Publications & Research
  pub_type           text check (pub_type in ('original_research','case_report','review','letter','book_chapter')),
  pub_journal        text,
  pub_authors        text,
  pub_status         text check (pub_status in ('in_progress','submitted','published')),
  pub_doi            text,

  -- Leadership & Societies
  leader_role         text,
  leader_organisation text,
  leader_start_date   date,
  leader_end_date     date,
  leader_ongoing      boolean,

  -- Prizes & Awards
  prize_body         text,
  prize_level        text check (prize_level in ('local','regional','national','international')),
  prize_description  text,

  -- Procedures & Clinical Skills
  proc_name          text,
  proc_setting       text,
  proc_supervision   text check (proc_supervision in ('supervised','unsupervised')),
  proc_count         integer,

  -- Reflections & CBDs/DOPs
  refl_type          text check (refl_type in ('cbd','dop','mini_cex','reflection')),
  refl_clinical_context text,
  refl_supervisor    text,
  refl_free_text     text,

  -- Custom
  custom_free_text   text
);

-- Row-level security
alter table public.portfolio_entries enable row level security;

create policy "Users can view own portfolio entries"
  on public.portfolio_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own portfolio entries"
  on public.portfolio_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own portfolio entries"
  on public.portfolio_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own portfolio entries"
  on public.portfolio_entries for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create trigger on_portfolio_entry_updated
  before update on public.portfolio_entries
  for each row execute procedure public.handle_updated_at();

-- Index for fast user queries
create index portfolio_entries_user_id_idx on public.portfolio_entries(user_id);
create index portfolio_entries_category_idx on public.portfolio_entries(user_id, category);
