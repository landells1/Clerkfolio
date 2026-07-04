-- Covering index for the consumed_institutional_emails.user_id foreign key.
--
-- The performance advisor (unindexed_foreign_keys) flags this FK
-- (consumed_institutional_emails_user_id_fkey) as having no covering index.
-- The table is small today, but the fix is trivial and additive: an index on
-- the referencing column lets Postgres satisfy the FK's referential-action
-- lookups (ON DELETE SET NULL when a user is deleted) without a sequential
-- scan. Additive/backward-compatible; coordinated with the shared prod deploy.
create index if not exists consumed_institutional_emails_user_id_idx
  on public.consumed_institutional_emails (user_id);
