// Single source of truth for Clerkfolio's legal-entity / operator disclosure,
// rendered on the privacy, terms, DPA and footer surfaces (F-006, Batch 8).
//
// Clerkfolio is NOT an incorporated company. It is operated by an individual (a
// sole trader) in the United Kingdom. Do not reintroduce "Ltd" / "registered in
// England and Wales" wording — using "Ltd" without incorporating is prohibited
// (Companies Act 2006 s.65 / the Business Names regime).
//
// OWNER: complete the placeholders below before public launch. Each value
// renders ONLY when non-empty, so a blank is simply omitted — no "[placeholder]"
// text ever reaches users. When trading under the "Clerkfolio" business name,
// the UK Business Names rules expect the proprietor's own name + an address for
// service of documents to be published; the ICO data-protection registration
// reference is a legal requirement for the data controller. Fill these in here
// and they appear automatically on the legal pages.

export const LEGAL_ENTITY = {
  /** Public operating / trading name. */
  operatingName: 'Clerkfolio',
  /** The sole trader's legal name (UK Business Names disclosure). '' = omit. */
  proprietorName: '',
  /** A contactable address for service of documents. '' = omit. */
  addressForService: '',
  /** ICO data-protection registration reference — supplied once issued. '' = omit. */
  icoReference: '',
  /** Monitored contact mailbox (consolidated onto one inbox — F-011). */
  contactEmail: 'admin@clerkfolio.co.uk',
} as const
