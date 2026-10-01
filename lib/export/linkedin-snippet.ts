import { CATEGORIES, type Category } from '@/lib/types/portfolio'

// One-line LinkedIn snippets built ONLY from facts the user recorded in
// structured fields (title, category, date, event, journal, role...).
//
// The old wording added claims nobody had made ("Created and delivered
// teaching with a clear learning impact", "measurable clinical governance
// value") to every entry of a category, and labelled every entry an
// "Achievement" - including a Balint group session logged as a custom entry.
// Free-text notes and reflections are never used: a LinkedIn post is public
// and those fields can carry clinical detail.

export type LinkedInEntry = {
  id: string
  title: string
  category: Category
  date: string
  conf_event_name: string | null
  conf_type?: string | null
  pub_journal: string | null
  pub_status?: string | null
  leader_role: string | null
  leader_organisation: string | null
  prize_body: string | null
  proc_name: string | null
  teaching_type?: string | null
  teaching_audience?: string | null
  teaching_event?: string | null
  audit_type?: string | null
}

const TEACHING_TYPE: Record<string, string> = {
  taught_session: 'Taught session',
  grand_round: 'Grand round presentation',
  poster: 'Poster presentation',
  oral: 'Oral presentation',
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, ' ').trim().slice(0, 120)
  return trimmed || null
}

/** A factual detail from structured fields, or null when there is none. */
export function structuredDetail(entry: LinkedInEntry): string | null {
  switch (entry.category) {
    case 'conference': {
      const event = clean(entry.conf_event_name)
      if (!event) return null
      return entry.conf_type === 'course' ? `Course: ${event}.` : `Attended ${event}.`
    }
    case 'publication': {
      const journal = clean(entry.pub_journal)
      if (!journal) return null
      return entry.pub_status === 'published' ? `Published in ${journal}.` : `${journal}.`
    }
    case 'leadership': {
      const role = clean(entry.leader_role)
      const org = clean(entry.leader_organisation)
      return role && org ? `${role}, ${org}.` : role ? `${role}.` : org ? `${org}.` : null
    }
    case 'prize': return clean(entry.prize_body) ? `Awarded by ${clean(entry.prize_body)}.` : null
    case 'procedure': return clean(entry.proc_name) ? `Clinical skill: ${clean(entry.proc_name)}.` : null
    case 'teaching': {
      const type = entry.teaching_type ? TEACHING_TYPE[entry.teaching_type] ?? null : null
      const audience = clean(entry.teaching_audience)
      const event = clean(entry.teaching_event)
      const parts = [type, audience ? `for ${audience}` : null, event ? `at ${event}` : null].filter(Boolean)
      return parts.length > 0 ? `${parts.join(' ')}.` : null
    }
    case 'audit_qip': return entry.audit_type === 'qip' ? 'Quality improvement project.' : entry.audit_type === 'audit' ? 'Clinical audit.' : null
    default: return null
  }
}

/** "Title. Detail. Category, Month Year." - facts only, no claims. */
export function linkedInSnippet(entry: LinkedInEntry): string {
  const label = CATEGORIES.find(category => category.value === entry.category)?.short ?? 'Portfolio'
  const date = new Date(entry.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  const title = clean(entry.title) ?? 'Portfolio entry'
  const detail = structuredDetail(entry)
  return [`${title.replace(/[.\s]+$/, '')}.`, detail, `${label}, ${date}.`].filter(Boolean).join(' ')
}
