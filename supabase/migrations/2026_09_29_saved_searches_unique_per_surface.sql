-- Saved-search names are unique per page (surface), not per account.
--
-- The 2026-09-28 pre-launch review changed the saved-search bar to overwrite
-- only a same-named search on the SAME surface (select, then update or
-- insert). The table still carried UNIQUE (user_id, name), so reusing a name
-- on another page was rejected. Swap it for UNIQUE (user_id, surface, name).
--
-- Order matters: apply only AFTER the select-then-update/insert client is
-- deployed. The previous client upserted with onConflict 'user_id,name',
-- which needs the old constraint to exist.
--
-- All three columns are NOT NULL, so NULLS NOT DISTINCT is not needed.
-- saved_searches_user_id_idx still covers user_id-only lookups.
--
-- Rollback (only if no user has the same name on two surfaces):
--   ALTER TABLE public.saved_searches DROP CONSTRAINT saved_searches_user_id_surface_name_key;
--   ALTER TABLE public.saved_searches ADD CONSTRAINT saved_searches_user_id_name_key UNIQUE (user_id, name);

ALTER TABLE public.saved_searches
  DROP CONSTRAINT IF EXISTS saved_searches_user_id_name_key;

ALTER TABLE public.saved_searches
  ADD CONSTRAINT saved_searches_user_id_surface_name_key UNIQUE (user_id, surface, name);
