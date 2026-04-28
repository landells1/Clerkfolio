-- Production hardening for V2 data integrity and public share safety.

-- De-duplicate before enforcing one active tracker per user/specialty.
delete from specialty_applications a
using specialty_applications b
where a.user_id = b.user_id
  and a.specialty_key = b.specialty_key
  and a.created_at > b.created_at;

create unique index if not exists specialty_apps_user_key_unique_idx
  on specialty_applications (user_id, specialty_key);

create index if not exists share_links_token_idx
  on share_links (token);

create index if not exists share_links_user_active_idx
  on share_links (user_id, revoked_at, expires_at desc);

create index if not exists share_views_link_viewed_idx
  on share_views (share_link_id, viewed_at desc);

create index if not exists entry_revisions_entry_created_idx
  on entry_revisions (entry_id, entry_type, created_at desc);

create index if not exists evidence_files_entry_idx
  on evidence_files (entry_id, entry_type, created_at);

create unique index if not exists deadlines_auto_unique_idx
  on deadlines (user_id, source_specialty_key, title, due_date)
  where is_auto = true and source_specialty_key is not null;

create table if not exists share_access_attempts (
  id            uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references share_links(id) on delete cascade,
  ip_hash       text not null,
  success       boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table share_access_attempts enable row level security;

drop policy if exists "read own share attempts" on share_access_attempts;
create policy "read own share attempts" on share_access_attempts
  for select using (
    exists (
      select 1 from share_links sl
      where sl.id = share_link_id and sl.user_id = auth.uid()
    )
  );

create index if not exists share_attempts_link_ip_created_idx
  on share_access_attempts (share_link_id, ip_hash, created_at desc);

