import type { CaseTemplate, PortfolioTemplate, Template } from '@/lib/types/templates'

// The entry picker and the case picker must each show only their own kind.
// Rows that predate the entry_type column are portfolio templates (the
// migration backfills them via the column default), so anything that is not
// explicitly 'case' is treated as a portfolio template.

export function portfolioTemplates(templates: Template[]): PortfolioTemplate[] {
  return templates.filter((t): t is PortfolioTemplate => t.entry_type !== 'case')
}

export function caseTemplates(templates: Template[]): CaseTemplate[] {
  return templates.filter((t): t is CaseTemplate => t.entry_type === 'case')
}
