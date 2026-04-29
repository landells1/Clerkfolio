-- ============================================================
-- Clerkfolio V2 Foundations Migration
-- 2026-04-28
-- Source of truth: HANDOVER_V2.md section 3
-- ============================================================

-- ── 1. New tables ────────────────────────────────────────────────────────────

-- Custom competency themes (user-defined, reusable)
create table if not exists custom_competency_themes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  slug       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);
alter table custom_competency_themes enable row level security;
create policy "manage own custom themes" on custom_competency_themes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Entry revisions (version history; capped at 50 per entry in app code)
create table if not exists entry_revisions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  entry_id   uuid not null,
  entry_type text not null check (entry_type in ('portfolio','case')),
  snapshot   jsonb not null,
  created_at timestamptz not null default now()
);
alter table entry_revisions enable row level security;
create policy "manage own revisions" on entry_revisions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists entry_revisions_entry_idx
  on entry_revisions (entry_id, entry_type, created_at desc);

-- Audit log (service role inserts only — no INSERT policy for regular users)
do $$ begin
  create type audit_action as enum (
    'login',
    'share_link_generated',
    'share_link_viewed',
    'data_export',
    'account_deleted',
    'subscription_changed'
  );
exception when duplicate_object then null; end $$;

create table if not exists audit_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  action     audit_action not null,
  metadata   jsonb,
  created_at timestamptz not null default now()
);
alter table audit_log enable row level security;
create policy "read own audit" on audit_log
  for select using (auth.uid() = user_id);

-- Share views (track public link visits; inserted server-side without user auth)
create table if not exists share_views (
  id              uuid primary key default gen_random_uuid(),
  share_link_id   uuid not null references share_links(id) on delete cascade,
  ip_hash         text,
  viewed_at       timestamptz not null default now()
);
alter table share_views enable row level security;
create policy "read own share views" on share_views
  for select using (
    exists (
      select 1 from share_links sl
      where sl.id = share_link_id and sl.user_id = auth.uid()
    )
  );

-- Referrals
create table if not exists referrals (
  id                uuid primary key default gen_random_uuid(),
  referrer_id       uuid not null references auth.users(id) on delete cascade,
  referred_id       uuid not null references auth.users(id) on delete cascade,
  status            text not null default 'pending'
                      check (status in ('pending','completed','revoked')),
  reward_granted_at timestamptz,
  created_at        timestamptz not null default now(),
  unique (referred_id)
);
alter table referrals enable row level security;
create policy "read own referrals" on referrals
  for select using (auth.uid() = referrer_id or auth.uid() = referred_id);


-- ── 2. Profiles — new tier/referral/usage columns ────────────────────────────

alter table profiles
  add column if not exists tier text not null default 'free'
    check (tier in ('free','pro','student')),
  add column if not exists student_email_verified boolean not null default false,
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references auth.users(id) on delete set null,
  add column if not exists pro_features_used jsonb not null
    default '{"pdf_exports_used":0,"share_links_used":0,"referral_pro_until":null}'::jsonb,
  add column if not exists notification_preferences jsonb not null
    default '{"deadlines":true,"share_link_expiring":true,"activity_nudge":false,"application_window":true}'::jsonb,
  add column if not exists student_grace_until timestamptz;

-- Backfill referral_code for existing users
update profiles
  set referral_code = encode(gen_random_bytes(6), 'hex')
  where referral_code is null;

-- Migrate email_reminders_enabled → notification_preferences.deadlines
update profiles
  set notification_preferences = jsonb_set(
    notification_preferences,
    '{deadlines}',
    to_jsonb(coalesce(email_reminders_enabled, false))
  )
  where email_reminders_enabled is not null;

alter table profiles drop column if exists email_reminders_enabled;

-- trial_started_at no longer drives gating; make it nullable
alter table profiles alter column trial_started_at drop not null;

-- Update handle_new_user to generate referral_code on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, trial_started_at, referral_code)
  values (new.id, now(), encode(gen_random_bytes(6), 'hex'));
  return new;
end;
$$ language plpgsql security definer;


-- ── 3. Share links — scope, pin, view tracking, revoked_at ───────────────────

alter table share_links
  add column if not exists scope text not null default 'specialty'
    check (scope in ('specialty','theme','full')),
  add column if not exists theme_slug text,
  add column if not exists pin_hash text,
  add column if not exists view_count int not null default 0,
  add column if not exists revoked_at timestamptz;


-- ── 4. Evidence files — virus scan status ────────────────────────────────────

alter table evidence_files
  add column if not exists scan_status text not null default 'pending'
    check (scan_status in ('pending','scanning','clean','quarantined')),
  add column if not exists scan_completed_at timestamptz;


-- ── 5. Goals — optional specialty application link ───────────────────────────

alter table goals
  add column if not exists due_date date,
  add column if not exists specialty_application_id uuid
    references specialty_applications(id) on delete set null;


-- ── 6. Specialty entry links — portfolio only (remove cases) ─────────────────

delete from specialty_entry_links where entry_type = 'case';

alter table specialty_entry_links
  drop constraint if exists specialty_entry_links_entry_type_check;
alter table specialty_entry_links
  add constraint specialty_entry_links_entry_type_check
  check (entry_type = 'portfolio');


-- ── 7. ARCP entry links — portfolio only (remove cases) ──────────────────────

delete from arcp_entry_links where entry_type = 'case';

alter table arcp_entry_links
  drop constraint if exists arcp_entry_links_entry_type_check;
alter table arcp_entry_links
  add constraint arcp_entry_links_entry_type_check
  check (entry_type = 'portfolio');

-- Rebuild INSERT/UPDATE policies without the case branch
drop policy if exists "ins_own_arcp_links" on arcp_entry_links;
create policy "ins_own_arcp_links" on arcp_entry_links
  for insert with check (
    user_id = auth.uid()
    and entry_id in (
      select id from portfolio_entries
      where user_id = auth.uid() and deleted_at is null
    )
  );

drop policy if exists "upd_own_arcp_links" on arcp_entry_links;
create policy "upd_own_arcp_links" on arcp_entry_links
  for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and entry_id in (
      select id from portfolio_entries
      where user_id = auth.uid() and deleted_at is null
    )
  );


-- ── 8. ARCP capabilities — curriculum versioning ─────────────────────────────

alter table arcp_capabilities
  add column if not exists curriculum_version text not null default 'FP2021';


-- ── 9. Drop logbook ───────────────────────────────────────────────────────────

drop table if exists logbook_entries cascade;


-- ── 10. Cron jobs (configure in Supabase dashboard → Database → Cron) ────────
--
-- Daily at 02:00 UTC — purge soft-deleted entries older than 30 days:
--   delete from cases where deleted_at < now() - interval '30 days';
--   delete from portfolio_entries where deleted_at < now() - interval '30 days';
--
-- Weekly (Sunday 03:00 UTC) — purge audit logs older than 1 year:
--   delete from audit_log where created_at < now() - interval '1 year';
--
-- Daily at 01:00 UTC — revoke expired share links:
--   update share_links set revoked_at = now()
--     where expires_at < now() and revoked_at is null;
