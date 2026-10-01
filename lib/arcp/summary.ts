import { spanContains, type RotationSpan } from '@/lib/logs/rotations'
import { countLabel } from '@/lib/utils/plural'

type ArcpLinkLike = { entry_id: string; entry_type: 'portfolio' | 'case'; entry_date?: string | null }

/**
 * Header wording for the ARCP page: the number of capability links and the
 * number of DISTINCT entries/cases behind them. One entry linked to two
 * capabilities is two links but one entry (it used to be counted twice as
 * "linked entries").
 */
export function arcpLinkSummary(links: ArcpLinkLike[]): string {
  const entries = new Set(links.filter(l => l.entry_type === 'portfolio').map(l => l.entry_id)).size
  const cases = new Set(links.filter(l => l.entry_type === 'case').map(l => l.entry_id)).size
  const across = cases > 0
    ? `${countLabel(entries, 'entry', 'entries')} and ${countLabel(cases, 'case')}`
    : countLabel(entries, 'entry', 'entries')
  return `${countLabel(links.length, 'link')} across ${across}`
}

/** Links whose entry/case is dated inside the rotation's span (ongoing = up to today). */
export function linksInRotation<L extends ArcpLinkLike>(links: L[], span: RotationSpan, todayKey: string): L[] {
  return links.filter(link => Boolean(link.entry_date) && spanContains(span, link.entry_date!.slice(0, 10), todayKey))
}
