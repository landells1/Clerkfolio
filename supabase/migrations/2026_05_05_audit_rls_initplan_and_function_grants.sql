-- =====================================================================
-- 2026_05_05_audit_rls_initplan_and_function_grants
--
-- 1. Revoke EXECUTE from PUBLIC on get_profile_entitlements.
--    The earlier per-role REVOKE FROM anon was overridden by the implicit
--    GRANT EXECUTE TO PUBLIC. Explicit revoke from PUBLIC closes the hole.
--    Authenticated + service_role + postgres retain explicit grants.
--
-- 2. Rewrite every RLS policy that re-evaluates auth.uid() / auth.role()
--    per row. Postgres caches the (select auth.uid()) initplan once per
--    query, eliminating the per-row function call. With zero real users
--    today, this is also the cheapest moment to make the change.
--    Cleared 37 auth_rls_initplan WARN advisories in one pass.
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.get_profile_entitlements(uuid) FROM PUBLIC;

-- profiles
ALTER POLICY "Users can view own profile"   ON public.profiles  USING ((select auth.uid()) = id);
ALTER POLICY "Users can insert own profile" ON public.profiles  WITH CHECK ((select auth.uid()) = id);
ALTER POLICY "Users can update own profile" ON public.profiles  USING ((select auth.uid()) = id);

-- portfolio_entries
ALTER POLICY "Users can view own portfolio entries"   ON public.portfolio_entries USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own portfolio entries" ON public.portfolio_entries WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own portfolio entries" ON public.portfolio_entries USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own portfolio entries" ON public.portfolio_entries USING ((select auth.uid()) = user_id);

-- cases
ALTER POLICY "Users can view own cases"   ON public.cases USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own cases" ON public.cases WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own cases" ON public.cases USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own cases" ON public.cases USING ((select auth.uid()) = user_id);

-- deadlines
ALTER POLICY "Users can view own deadlines"   ON public.deadlines USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own deadlines" ON public.deadlines WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own deadlines" ON public.deadlines USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own deadlines" ON public.deadlines USING ((select auth.uid()) = user_id);

-- evidence_files
ALTER POLICY "Users can view own evidence files"   ON public.evidence_files USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own evidence files" ON public.evidence_files WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own evidence files" ON public.evidence_files USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own evidence files" ON public.evidence_files
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- arcp_entry_links
ALTER POLICY "del_own_arcp_links" ON public.arcp_entry_links USING (user_id = (select auth.uid()));
ALTER POLICY "sel_own_arcp_links" ON public.arcp_entry_links USING (user_id = (select auth.uid()));
ALTER POLICY "ins_own_arcp_links" ON public.arcp_entry_links
  WITH CHECK (
    user_id = (select auth.uid())
    AND entry_id IN (
      SELECT id FROM public.portfolio_entries
      WHERE user_id = (select auth.uid()) AND deleted_at IS NULL
    )
  );
ALTER POLICY "upd_own_arcp_links" ON public.arcp_entry_links
  USING (user_id = (select auth.uid()))
  WITH CHECK (
    user_id = (select auth.uid())
    AND entry_id IN (
      SELECT id FROM public.portfolio_entries
      WHERE user_id = (select auth.uid()) AND deleted_at IS NULL
    )
  );

-- custom_competency_themes
ALTER POLICY "manage own custom themes" ON public.custom_competency_themes
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- entry_revisions
ALTER POLICY "manage own revisions" ON public.entry_revisions
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- audit_log
ALTER POLICY "read own audit" ON public.audit_log USING ((select auth.uid()) = user_id);

-- share_views
ALTER POLICY "read own share views" ON public.share_views
  USING (EXISTS (
    SELECT 1 FROM public.share_links sl
    WHERE sl.id = share_views.share_link_id
      AND sl.user_id = (select auth.uid())
  ));

-- share_access_attempts
ALTER POLICY "read own share attempts" ON public.share_access_attempts
  USING (EXISTS (
    SELECT 1 FROM public.share_links sl
    WHERE sl.id = share_access_attempts.share_link_id
      AND sl.user_id = (select auth.uid())
  ));

-- referrals
ALTER POLICY "read own referrals" ON public.referrals
  USING ((select auth.uid()) = referrer_id OR (select auth.uid()) = referred_id);

-- specialty_applications
ALTER POLICY "Users manage own specialty applications" ON public.specialty_applications
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- specialty_entry_links
ALTER POLICY "sel_own_specialty_entry_links" ON public.specialty_entry_links
  USING (
    application_id IN (SELECT id FROM public.specialty_applications WHERE user_id = (select auth.uid()))
    AND (
      is_checkbox = true
      OR entry_id IS NULL
      OR entry_id IN (
        SELECT id FROM public.portfolio_entries
        WHERE user_id = (select auth.uid()) AND deleted_at IS NULL
      )
    )
  );
ALTER POLICY "ins_own_specialty_entry_links" ON public.specialty_entry_links
  WITH CHECK (
    application_id IN (SELECT id FROM public.specialty_applications WHERE user_id = (select auth.uid()))
    AND (
      is_checkbox = true
      OR entry_id IS NULL
      OR entry_id IN (
        SELECT id FROM public.portfolio_entries
        WHERE user_id = (select auth.uid()) AND deleted_at IS NULL
      )
    )
  );
ALTER POLICY "upd_own_specialty_entry_links" ON public.specialty_entry_links
  USING (
    application_id IN (SELECT id FROM public.specialty_applications WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    application_id IN (SELECT id FROM public.specialty_applications WHERE user_id = (select auth.uid()))
    AND (
      is_checkbox = true
      OR entry_id IS NULL
      OR entry_id IN (
        SELECT id FROM public.portfolio_entries
        WHERE user_id = (select auth.uid()) AND deleted_at IS NULL
      )
    )
  );
ALTER POLICY "del_own_specialty_entry_links" ON public.specialty_entry_links
  USING (
    application_id IN (SELECT id FROM public.specialty_applications WHERE user_id = (select auth.uid()))
  );

-- arcp_capabilities
ALTER POLICY "arcp capabilities readable by authenticated users" ON public.arcp_capabilities
  USING ((select auth.role()) = 'authenticated'::text);

-- share_links
ALTER POLICY "own share links" ON public.share_links
  USING (user_id = (select auth.uid()));

-- notifications
ALTER POLICY "own notifications" ON public.notifications
  USING (user_id = (select auth.uid()));

-- goals
ALTER POLICY "Users manage their own goals" ON public.goals
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
