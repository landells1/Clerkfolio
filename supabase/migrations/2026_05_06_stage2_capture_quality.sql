-- Stage 2 batch 4: capture quality.
-- Apply manually to Supabase project dldhnstjngendpcywthv (eu-west-2).

alter table public.portfolio_entries
  add column if not exists refl_framework text;

create table if not exists public.snippets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shortcut text not null,
  body text not null,
  created_at timestamptz default now(),
  unique (user_id, shortcut)
);

alter table public.snippets enable row level security;

drop policy if exists snippets_select on public.snippets;
drop policy if exists snippets_insert on public.snippets;
drop policy if exists snippets_update on public.snippets;
drop policy if exists snippets_delete on public.snippets;

create policy snippets_select on public.snippets
  for select using ((select auth.uid()) = user_id);
create policy snippets_insert on public.snippets
  for insert with check ((select auth.uid()) = user_id);
create policy snippets_update on public.snippets
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy snippets_delete on public.snippets
  for delete using ((select auth.uid()) = user_id);
