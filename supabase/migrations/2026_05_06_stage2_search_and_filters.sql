-- Stage 2 batch 6: search and filtering.
-- Apply manually to Supabase project dldhnstjngendpcywthv (eu-west-2).

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  surface text not null check (surface in ('cases','portfolio','timeline','logs')),
  query jsonb not null,
  created_at timestamptz default now(),
  unique (user_id, name)
);

alter table public.saved_searches enable row level security;

drop policy if exists saved_searches_sel on public.saved_searches;
drop policy if exists saved_searches_ins on public.saved_searches;
drop policy if exists saved_searches_upd on public.saved_searches;
drop policy if exists saved_searches_del on public.saved_searches;

create policy saved_searches_sel on public.saved_searches
  for select using ((select auth.uid()) = user_id);
create policy saved_searches_ins on public.saved_searches
  for insert with check ((select auth.uid()) = user_id);
create policy saved_searches_upd on public.saved_searches
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy saved_searches_del on public.saved_searches
  for delete using ((select auth.uid()) = user_id);

alter table public.custom_competency_themes
  add column if not exists colour text default '#1B6FD9';

create or replace function public.rename_user_tag(p_old text, p_new text, p_field text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_field = 'specialty_tags' then
    update public.portfolio_entries
       set specialty_tags = array_replace(coalesce(specialty_tags, '{}'), p_old, p_new),
           updated_at = now()
     where user_id = v_user
       and specialty_tags @> array[p_old]::text[];

    update public.cases
       set specialty_tags = array_replace(coalesce(specialty_tags, '{}'), p_old, p_new),
           updated_at = now()
     where user_id = v_user
       and specialty_tags @> array[p_old]::text[];
  elsif p_field = 'interview_themes' then
    update public.portfolio_entries
       set interview_themes = array_replace(coalesce(interview_themes, '{}'), p_old, p_new),
           updated_at = now()
     where user_id = v_user
       and interview_themes @> array[p_old]::text[];

    update public.cases
       set interview_themes = array_replace(coalesce(interview_themes, '{}'), p_old, p_new),
           updated_at = now()
     where user_id = v_user
       and interview_themes @> array[p_old]::text[];
  else
    raise exception 'unsupported field %', p_field;
  end if;
end;
$$;
