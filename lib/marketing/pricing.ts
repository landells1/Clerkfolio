export const PRICING_TIERS = [
  {
    name: 'Free',
    price: 'Free',
    marketingPrice: 'Free forever',
    description: 'Core portfolio tools for getting started.',
    marketingDescription: 'Everything you need to log a portfolio.',
    storage: '100 MB',
    highlight: false,
  },
  {
    name: 'Verified',
    price: 'Free',
    marketingPrice: 'Free with a verified .ac.uk or NHS email',
    description: 'Extra storage for verified students and NHS doctors.',
    marketingDescription: 'More room once you verify your institution.',
    storage: '600 MB',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '£9.99/year',
    marketingPrice: '£9.99 per year',
    description: 'More room and fewer limits for application season.',
    marketingDescription: 'For application season and beyond.',
    storage: '5 GB',
    highlight: true,
  },
] as const

export const PRICING_FEATURES = [
  { label: 'Portfolio entries, cases, timeline, and ARCP organisation', free: true, verified: true, pro: true },
  { label: 'Personal data backup', free: true, verified: true, pro: true },
  { label: 'Storage allowance', free: '100 MB', verified: '600 MB', pro: '5 GB' },
  { label: 'PDF exports', free: '1', verified: '1', pro: 'Unlimited' },
  { label: 'Portfolio share links', free: '1', verified: '1', pro: 'Unlimited' },
  { label: 'Tracked specialties', free: '1 active', verified: '1 active', pro: 'Unlimited' },
  { label: 'Create and organise entries', free: true, verified: true, pro: true },
  { label: 'Bulk import (Horus CSV)', free: false, verified: false, pro: true },
  { label: 'Referral rewards (+1 PDF & +1 share per referral)', free: true, verified: true, pro: true },
] as const

export const MARKETING_PRICING_FEATURES = {
  Free: ['100 MB storage', '1 PDF export', '1 share link', '1 tracked specialty', 'Create and organise entries', 'Full data backup'],
  Verified: ['600 MB storage (100 MB + 500 MB verified)', '1 PDF export', '1 share link', '1 tracked specialty', 'Create and organise entries', 'Full data backup'],
  Pro: [
    '5 GB storage',
    'Unlimited PDF exports',
    'Unlimited share links',
    'Unlimited tracked specialties',
    'Bulk import (Horus CSV)',
    'Full data backup',
  ],
} as const
