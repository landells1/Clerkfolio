-- M2: Stripe webhook idempotency.
-- Stores Stripe event IDs before processing so replayed webhooks do not
-- double-apply subscription entitlement updates.

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null default false,
  api_version text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists stripe_webhook_events_event_id_uq
  on public.stripe_webhook_events(event_id);

alter table public.stripe_webhook_events enable row level security;

revoke all on table public.stripe_webhook_events from anon, authenticated;
grant select, insert, update, delete on table public.stripe_webhook_events to service_role;
