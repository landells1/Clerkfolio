-- ============================================================
-- Clinidex — Stage 7 Schema
-- Run this in the Supabase SQL Editor after schema-stage5.sql
-- ============================================================

-- Add Stripe subscription columns to profiles
alter table public.profiles
  add column if not exists stripe_customer_id        text unique,
  add column if not exists stripe_subscription_id    text unique,
  add column if not exists subscription_status       text default 'trial'
    check (subscription_status in ('trial', 'active', 'cancelled', 'past_due')),
  add column if not exists subscription_period_end   timestamptz;

-- Index for webhook lookups by Stripe IDs
create index if not exists profiles_stripe_customer_idx
  on public.profiles(stripe_customer_id);
create index if not exists profiles_stripe_sub_idx
  on public.profiles(stripe_subscription_id);
