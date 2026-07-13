// Single source for the landing-page FAQ so the visible accordion and the
// FAQPage JSON-LD cannot drift apart. Answers are plain text with no markup.
export const LANDING_FAQS = [
  ['How is my data handled?', 'Clerkfolio is UK-hosted in London and encrypted in transit and at rest. You can export a complete ZIP of your records. Deleting your account removes your data from live systems immediately, with backups purged within 30 days.'],
  ['Can I enter patient identifiers?', 'No. Case forms remind you to leave out names, dates of birth, NHS numbers and other patient-identifiable information. You must keep every case entry anonymised.'],
  ['Are you affiliated with the NHS, GMC or any Royal College?', 'No. Clerkfolio is independent. It can help you organise evidence against supported specialty application domains, but it does not replace a portfolio required by your deanery or training programme.'],
  ['Can I import from Horus?', 'Yes. Horus CSV bulk import is available on the Pro plan. Free users can still add entries individually or copy information across by hand.'],
  ['What happens if I stop subscribing?', 'Your records remain available on the Free tier. You can continue to read, edit, log and export them, while Pro-specific storage and usage limits no longer apply. Nothing is deleted because a subscription ends.'],
  ['Does it work on my phone?', 'Yes. Clerkfolio is a responsive web app. You can start an anonymised case entry on your phone and finish it on a laptop. Drafts auto-save as you type.'],
] as const
