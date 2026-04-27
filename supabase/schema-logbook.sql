-- Logbook entries: personal operative reflection notes
-- NOT an official logbook substitute (no patient IDs, no verified sign-off)
-- Apply in Supabase SQL editor

CREATE TABLE IF NOT EXISTS logbook_entries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date               DATE NOT NULL,
  procedure_name     TEXT NOT NULL,
  surgical_specialty TEXT NOT NULL,
  role               TEXT NOT NULL,
  supervision        TEXT,
  supervisor_name    TEXT,
  learning_points    TEXT,
  specialty_tags     TEXT[] NOT NULL DEFAULT '{}',
  pinned             BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE logbook_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logbook_entries_user_access" ON logbook_entries
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
