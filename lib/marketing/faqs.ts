// Single source for the landing-page FAQ so the visible accordion and the
// FAQPage JSON-LD can never drift apart (structured data must match visible
// content). Answers are plain text — no markup.
export const LANDING_FAQS = [
  ['Is my data really private?', 'Yes. UK-hosted (London), encrypted in transit and at rest, GDPR-aligned. You own your data and can export the lot as a ZIP at any time. Deleting your account removes your data from live systems straight away; backups purge within 30 days.'],
  ['Will it accept patient identifiers?', 'No. Every case form reminds you to leave out identifiers - no names, dates of birth or NHS numbers - and we ask you not to enter any patient-identifiable data.'],
  ['Are you affiliated with the NHS, GMC or any Royal College?', "No. Clerkfolio is independent. We map onto specialty self-assessment criteria where each specialty publishes them - but we don't replace official portfolios required by deaneries."],
  ['Can I import from Horus?', 'Yes - Horus CSV bulk import is available on the Pro plan. Free users can still add entries one at a time, or copy across by hand.'],
  ['What happens to my portfolio if I stop subscribing?', 'Your data stays on the Free tier - read, edit, log, export, all free. You only lose Pro-tier limits (storage, unlimited exports, multiple tracked specialties). Nothing gets deleted.'],
  ['Does it work on my phone?', 'Yes. Clerkfolio is a responsive web app - log a case from your phone between patients, finish writing it up on a laptop later. Drafts auto-save as you type, so you can pick up exactly where you left off.'],
] as const
