-- Stage 2 batch 11: export, import, and portability.
-- Apply manually to Supabase project dldhnstjngendpcywthv (eu-west-2).

alter table public.profiles
  add column if not exists public_slug text,
  add column if not exists public_showcase_enabled boolean default false;

create unique index if not exists profiles_public_slug_uq
  on public.profiles(public_slug)
  where public_slug is not null;

alter table public.profiles
  drop constraint if exists profiles_public_slug_format_check;

alter table public.profiles
  add constraint profiles_public_slug_format_check
  check (
    public_slug is null
    or public_slug ~ '^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$'
  );
