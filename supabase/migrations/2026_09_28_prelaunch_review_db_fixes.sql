-- Pre-launch review 2026-09-28.
--
-- 1. claim_free_pdf_export still hard-coded `pdf_exports_used < 1`, while
--    get_profile_entitlements (Batch 1) grants free users 1 + rewarded
--    referrals PDF exports. A referrer with an earned 2nd export saw the
--    download enabled, the server rendered the PDF, then the claim returned
--    null and the route answered 403 limit_reached. Align the claim with the
--    entitlement formula (1 + completed referrals). Signature, SECURITY
--    DEFINER posture and grants are unchanged (CREATE OR REPLACE keeps them).
--
-- 2. rename_user_tag used array_replace, which produces [IMT, IMT] when an
--    entry already carries the merge target. De-duplicate while preserving the
--    original order. Signature, auth check and grants unchanged.
--
-- 3. audit_action had no 'password_reset' value, so the reset-link password
--    change (POST /api/account/password-reset-complete) failed its audit insert
--    with 22P02 and the reset never appeared in Settings > Audit log - the very
--    page the "your password was changed" email points to. Additive enum value.
--
-- 4. handle_institutional_email_on_auth_change only matched '%.nhs.scot', so a
--    bare NHS Scotland address (name@nhs.scot, the standard format) was never
--    auto-claimed on an email change. Match the bare domain too, as the TS
--    validator now does. CREATE OR REPLACE keeps the locked-down EXECUTE grants.

ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'password_reset';

CREATE OR REPLACE FUNCTION public.claim_free_pdf_export(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE profiles
  SET pro_features_used = jsonb_set(
    COALESCE(pro_features_used, '{}'::jsonb),
    '{pdf_exports_used}',
    to_jsonb(COALESCE((pro_features_used->>'pdf_exports_used')::int, 0) + 1)
  )
  WHERE id = p_user_id
    AND auth.uid() = p_user_id
    AND COALESCE((pro_features_used->>'pdf_exports_used')::int, 0) < 1 + (
      SELECT count(*)::int FROM public.referrals r
      WHERE r.referrer_id = p_user_id AND r.status = 'completed'
    )
  RETURNING true;
$function$;

CREATE OR REPLACE FUNCTION public.rename_user_tag(p_old text, p_new text, p_field text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_field not in ('specialty_tags', 'interview_themes') then
    raise exception 'unsupported field: %', p_field;
  end if;

  if p_field = 'specialty_tags' then
    update public.portfolio_entries
      set specialty_tags = array(
        select t.tag from unnest(array_replace(specialty_tags, p_old, p_new)) with ordinality as t(tag, ord)
        group by t.tag order by min(t.ord))
      where user_id = v_user and p_old = any(specialty_tags);

    update public.cases
      set specialty_tags = array(
        select t.tag from unnest(array_replace(specialty_tags, p_old, p_new)) with ordinality as t(tag, ord)
        group by t.tag order by min(t.ord))
      where user_id = v_user and p_old = any(specialty_tags);

  elsif p_field = 'interview_themes' then
    update public.portfolio_entries
      set interview_themes = array(
        select t.tag from unnest(array_replace(interview_themes, p_old, p_new)) with ordinality as t(tag, ord)
        group by t.tag order by min(t.ord))
      where user_id = v_user and p_old = any(interview_themes);

    update public.cases
      set interview_themes = array(
        select t.tag from unnest(array_replace(interview_themes, p_old, p_new)) with ordinality as t(tag, ord)
        group by t.tag order by min(t.ord))
      where user_id = v_user and p_old = any(interview_themes);
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_institutional_email_on_auth_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old text := lower(coalesce(old.email, ''));
  v_new text := lower(coalesce(new.email, ''));
  v_profile profiles%ROWTYPE;
  v_old_hash text;
  v_new_hash text;
  v_consumed_uid uuid;
  v_consumed_found boolean;
  v_new_is_inst boolean;
BEGIN
  IF tg_op <> 'UPDATE' OR old.email IS NOT DISTINCT FROM new.email THEN
    RETURN new;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = new.id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN new;
  END IF;

  -- (1) Verification was tied to the released primary email.
  IF v_profile.student_email_verified
     AND v_profile.student_email IS NOT NULL
     AND v_old <> ''
     AND lower(v_profile.student_email) = v_old THEN
    v_old_hash := encode(extensions.digest(v_old, 'sha256'), 'hex');
    INSERT INTO public.consumed_institutional_emails (email_hash, user_id)
    VALUES (v_old_hash, new.id)
    ON CONFLICT (email_hash) DO NOTHING;

    UPDATE public.profiles
       SET student_email = NULL,
           student_email_verified = false,
           student_email_verified_at = NULL,
           student_email_verification_due_at = NULL,
           student_email_verification_sent_at = NULL
     WHERE id = new.id;

    SELECT * INTO v_profile FROM public.profiles WHERE id = new.id;
  END IF;

  -- (2) Auto-claim a new institutional primary email.
  v_new_is_inst :=
    v_new LIKE '%.ac.uk'
    OR split_part(v_new, '@', 2) IN ('nhs.net', 'hscni.net', 'nhs.scot')
    OR v_new LIKE '%.nhs.uk'
    OR v_new LIKE '%.nhs.scot';

  IF v_new <> '' AND v_new_is_inst AND NOT v_profile.student_email_verified THEN
    v_new_hash := encode(extensions.digest(v_new, 'sha256'), 'hex');

    SELECT user_id INTO v_consumed_uid
    FROM public.consumed_institutional_emails
    WHERE email_hash = v_new_hash;
    v_consumed_found := FOUND;

    IF (NOT v_consumed_found OR v_consumed_uid = new.id)
       AND NOT EXISTS (
         SELECT 1 FROM public.profiles
         WHERE student_email_verified
           AND student_email IS NOT NULL
           AND lower(student_email) = v_new
           AND id <> new.id
       ) THEN
      UPDATE public.profiles
         SET student_email = v_new,
             student_email_verified = true,
             student_email_verified_at = now(),
             student_email_verification_due_at = (now() + interval '1 year')::date
       WHERE id = new.id;

      INSERT INTO public.consumed_institutional_emails (email_hash, user_id)
      VALUES (v_new_hash, new.id)
      ON CONFLICT (email_hash) DO NOTHING;
    END IF;
  END IF;

  PERFORM public.recompute_profile_tier(new.id);
  RETURN new;
END;
$function$;
