-- ============================================================
-- Stage 13: Platform, Onboarding, Data & Mobile
-- ============================================================

-- 1. Onboarding checklist state on profiles
alter table profiles add column if not exists onboarding_checklist_dismissed boolean not null default false;
alter table profiles add column if not exists onboarding_checklist_completed_items text[] not null default '{}';

-- 2. Email reminder opt-in (notifications)
alter table profiles add column if not exists email_reminders_enabled boolean not null default false;

-- 3. In-app notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('deadline_due', 'share_link_expiring', 'application_window_open')),
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz default now()
);
alter table notifications enable row level security;
create policy "own notifications" on notifications
  for all using (user_id = auth.uid());

-- Index to support fast unread-count queries
create index if not exists notifications_user_unread
  on notifications (user_id, read, created_at desc)
  where read = false;
