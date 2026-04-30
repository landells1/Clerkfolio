export const PRICING_TIERS = [
  {
    name: 'Free',
    price: 'GBP 0',
    marketingPrice: 'GBP 0 forever',
    description: 'Core portfolio tools for getting started.',
    marketingDescription: 'Everything you need to log a portfolio.',
    storage: '100 MB',
    highlight: false,
  },
  {
    name: 'Student',
    price: 'GBP 0',
    marketingPrice: 'GBP 0 verified .ac.uk',
    description: 'Extra storage for verified .ac.uk users.',
    marketingDescription: "More room while you're still studying.",
    storage: '1 GB',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'GBP 10/year',
    marketingPrice: 'GBP 10 per year',
    description: 'More room and fewer limits for application season.',
    marketingDescription: 'For application season and beyond.',
    storage: '5 GB',
    highlight: true,
  },
] as const

export const PRICING_FEATURES = [
  { label: 'Portfolio entries, cases, timeline, and ARCP organisation', free: true, student: true, pro: true },
  { label: 'Personal data backup', free: true, student: true, pro: true },
  { label: 'Storage allowance', free: '100 MB', student: '1 GB', pro: '5 GB' },
  { label: 'PDF exports', free: '1', student: '1', pro: 'Unlimited' },
  { label: 'Portfolio share links', free: '1', student: '1', pro: 'Unlimited' },
  { label: 'Tracked specialties', free: '1 active', student: '1 active', pro: 'Unlimited' },
  { label: 'Bulk import where available', free: false, student: false, pro: true },
  { label: 'Institution-verified referral rewards', free: true, student: true, pro: true },
] as const

export const MARKETING_PRICING_FEATURES = {
  Free: ['100 MB storage', '1 PDF export', '1 share link', '1 tracked specialty', 'Full data backup'],
  Student: ['1 GB storage', '1 PDF export', '1 share link', '1 tracked specialty', 'Full data backup'],
  Pro: [
    '5 GB storage',
    'Unlimited PDF exports',
    'Unlimited share links',
    'Unlimited tracked specialties',
    'Bulk import (Horus CSV)',
    'Full data backup',
  ],
} as const
