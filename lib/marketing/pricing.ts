import {
  BASE_STORAGE_MB,
  VERIFIED_STORAGE_MB,
  VERIFIED_BONUS_MB,
  PRO_STORAGE_MB,
  formatStorageQuota,
} from '@/lib/entitlements/limits'

// Storage strings are computed from the entitlement constants so the marketing
// copy can never drift from what the RPC actually grants.
const FREE_STORAGE = formatStorageQuota(BASE_STORAGE_MB)
const VERIFIED_STORAGE = formatStorageQuota(VERIFIED_STORAGE_MB)
const PRO_STORAGE = formatStorageQuota(PRO_STORAGE_MB)

export const PRICING_TIERS = [
  {
    name: 'Free',
    price: 'Free',
    marketingPrice: 'Free forever',
    description: 'Core portfolio tools for getting started.',
    marketingDescription: 'The core tools for logging your portfolio.',
    storage: FREE_STORAGE,
    highlight: false,
  },
  {
    name: 'Verified',
    price: 'Free',
    marketingPrice: 'Free with a verified .ac.uk or NHS email',
    description: 'Extra storage for verified students and NHS doctors.',
    marketingDescription: 'More room once you verify your institution.',
    storage: VERIFIED_STORAGE,
    highlight: false,
  },
  {
    name: 'Pro',
    price: '£9.99/year',
    marketingPrice: '£9.99 per year',
    description: 'More room and fewer limits for application season.',
    marketingDescription: 'For application season.',
    storage: PRO_STORAGE,
    highlight: true,
  },
] as const

export const PRICING_FEATURES = [
  { label: 'Portfolio entries, cases, timeline, and ARCP organisation', free: true, verified: true, pro: true },
  { label: 'Personal data backup', free: true, verified: true, pro: true },
  { label: 'Storage allowance', free: FREE_STORAGE, verified: VERIFIED_STORAGE, pro: PRO_STORAGE },
  { label: 'PDF exports', free: '1', verified: '1', pro: 'Unlimited' },
  { label: 'Portfolio share links', free: '1', verified: '1', pro: 'Unlimited' },
  { label: 'Tracked specialties', free: '1 active', verified: '1 active', pro: 'Unlimited' },
  { label: 'Create and organise entries', free: true, verified: true, pro: true },
  { label: 'Bulk import (Horus CSV)', free: false, verified: false, pro: true },
  { label: 'Referral rewards (+1 PDF & +1 share per referral)', free: true, verified: true, pro: true },
] as const

export const MARKETING_PRICING_FEATURES = {
  Free: [`${FREE_STORAGE} storage`, '1 PDF export', '1 share link', '1 tracked specialty', 'Create and organise entries', 'Full data backup'],
  Verified: [`${VERIFIED_STORAGE} storage (${formatStorageQuota(BASE_STORAGE_MB)} + ${VERIFIED_BONUS_MB} MB verified)`, '1 PDF export', '1 share link', '1 tracked specialty', 'Create and organise entries', 'Full data backup'],
  Pro: [
    `${PRO_STORAGE} storage`,
    'Unlimited PDF exports',
    'Unlimited share links',
    'Unlimited tracked specialties',
    'Bulk import (Horus CSV)',
    'Full data backup',
  ],
} as const
