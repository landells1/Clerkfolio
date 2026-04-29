-- ============================================================
-- Clerkfolio — Stage 5 Schema
-- Run this in the Supabase SQL Editor after schema-stage4.sql
-- ============================================================

-- Track uploaded evidence files (portfolio entries + cases share this table)
create table public.evidence_files (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  entry_id    uuid not null,
  entry_type  text not null check (entry_type in ('portfolio', 'case')),
  file_name   text not null,
  file_path   text not null,   -- storage object path
  file_size   bigint not null, -- bytes
  mime_type   text,
  created_at  timestamptz default now()
);

alter table public.evidence_files enable row level security;

create policy "Users can view own evidence files"
  on public.evidence_files for select
  using (auth.uid() = user_id);

create policy "Users can insert own evidence files"
  on public.evidence_files for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own evidence files"
  on public.evidence_files for delete
  using (auth.uid() = user_id);

create index evidence_files_user_id_idx  on public.evidence_files(user_id);
create index evidence_files_entry_id_idx on public.evidence_files(entry_id);

-- ============================================================
-- Supabase Storage bucket + policies
-- ============================================================

-- Create the private evidence bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  52428800, -- 50 MB per file
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
);

-- Users can upload to their own folder only
create policy "Users can upload own evidence"
  on storage.objects for insert
  with check (
    bucket_id = 'evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own files
create policy "Users can view own evidence"
  on storage.objects for select
  using (
    bucket_id = 'evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own files
create policy "Users can delete own evidence"
  on storage.objects for delete
  using (
    bucket_id = 'evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
