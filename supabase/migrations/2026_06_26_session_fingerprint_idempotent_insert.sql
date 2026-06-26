-- F-021 (Batch 5): make the active session-fingerprint insert idempotent.
--
-- middleware.ts maintains one active fingerprint row per
-- (user_id, ip_hash, user_agent, session_id) with a SELECT-then-INSERT. Two
-- concurrent first-requests for a fresh session both pass the SELECT and both
-- INSERT, so the loser violates the partial unique index
-- `session_fingerprints_active_uq` and Postgres logs a `duplicate key` ERROR.
-- Zero user impact (maintenance is best-effort), but it pollutes the error log
-- during the launch observability window and can bury a genuine error.
--
-- A plain supabase-js .upsert() cannot target that index because it is a
-- *partial expression* index — UNIQUE (user_id, ip_hash, user_agent,
-- COALESCE(session_id,'')) WHERE revoked_at IS NULL — and onConflict only takes
-- bare column names. So we expose a tiny helper that runs a real
-- `INSERT ... ON CONFLICT ... DO NOTHING`, turning the race into a silent no-op
-- instead of a logged ERROR.
--
-- SECURITY INVOKER + service_role-only EXECUTE: the only caller is the
-- service-role middleware client, which already bypasses RLS and can insert
-- directly. anon/authenticated EXECUTE is revoked so the spoofable p_user_id
-- argument can never be abused to write a fingerprint for another account.

create or replace function public.record_active_session_fingerprint(
  p_user_id uuid,
  p_ip_hash text,
  p_user_agent text,
  p_session_id text
)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.session_fingerprints (user_id, ip_hash, user_agent, session_id)
  values (p_user_id, p_ip_hash, p_user_agent, p_session_id)
  on conflict (user_id, ip_hash, user_agent, (coalesce(session_id, ''::text)))
  where revoked_at is null
  do nothing;
$$;

-- Supabase's default privileges grant EXECUTE to anon/authenticated on new
-- public functions, so revoking from PUBLIC alone isn't enough — revoke those
-- roles explicitly. (Their inserts are already RLS-denied — session_fingerprints
-- has no INSERT policy — but least privilege keeps this service_role-only.)
revoke all on function public.record_active_session_fingerprint(uuid, text, text, text) from public;
revoke all on function public.record_active_session_fingerprint(uuid, text, text, text) from anon;
revoke all on function public.record_active_session_fingerprint(uuid, text, text, text) from authenticated;
grant execute on function public.record_active_session_fingerprint(uuid, text, text, text) to service_role;
