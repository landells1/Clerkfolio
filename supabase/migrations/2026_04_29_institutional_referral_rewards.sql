-- Support referral reward gating by referrer, status, and reward date.

create index if not exists referrals_referrer_status_reward_idx
  on public.referrals (referrer_id, status, reward_granted_at desc);
