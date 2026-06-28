import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { CATEGORIES } from '@/lib/types/portfolio'
import { NHS_ROUND_3_2026_DEADLINES, getDeadlinesForSpecialty } from '@/lib/specialties/deadlines'
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { requestIp } from '@/lib/request-ip'

const RL_WINDOW_SECONDS = 60
const RL_MAX_PER_TOKEN = 20
const RL_MAX_PER_IP = 60

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function escapeIcs(value: string | null | undefined) {
  // Normalise CRLF / lone CR to LF first, then escape per RFC 5545. Without
  // the CR normalisation a carriage return inside notes/title would survive
  // into the line and break the fold/line structure for strict parsers.
  return (value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

// `due_date` may arrive as a bare date ('YYYY-MM-DD') or, defensively, with a
// time component. Coerce to date-only before stripping separators so DTSTART
// is always a valid VALUE=DATE (YYYYMMDD).
function icsDate(date: string) {
  return date.slice(0, 10).replace(/-/g, '')
}

// RFC 5545 limits content lines to 75 *octets* (not JS string chars). A
// multi-byte SUMMARY/DESCRIPTION folded on char length can exceed the octet
// limit and break strict calendar clients, so we measure UTF-8 byte length
// and never split inside a multi-byte sequence.
function fold(line: string) {
  const encoder = new TextEncoder()
  const chunks: string[] = []
  let current = ''
  let currentBytes = 0
  let isContinuation = false
  // First line allows 75 octets; continuation lines start with a leading space
  // (1 octet) so they carry 74 octets of content.
  for (const char of line) {
    const charBytes = encoder.encode(char).length
    const limit = isContinuation ? 74 : 75
    if (currentBytes + charBytes > limit) {
      chunks.push(isContinuation ? ` ${current}` : current)
      current = ''
      currentBytes = 0
      isContinuation = true
    }
    current += char
    currentBytes += charBytes
  }
  chunks.push(isContinuation ? ` ${current}` : current)
  return chunks.join('\r\n')
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Two limiters in tandem: per-token (caps a legitimate calendar client polling
  // too aggressively) and per-IP (caps an attacker probing many invalid tokens
  // - without this, each guess would get its own fresh 20/min counter).
  const [tokenLimit, ipLimit] = await Promise.all([
    checkRateLimit({
      key: hashToken(token),
      max: RL_MAX_PER_TOKEN,
      windowSeconds: RL_WINDOW_SECONDS,
      prefix: 'calendar-feed-token',
    }),
    checkRateLimit({
      key: requestIp(req),
      max: RL_MAX_PER_IP,
      windowSeconds: RL_WINDOW_SECONDS,
      prefix: 'calendar-feed-ip',
    }),
  ])
  const blockedLimit = !tokenLimit.success ? tokenLimit : !ipLimit.success ? ipLimit : null
  if (blockedLimit) {
    return new NextResponse(null, {
      status: blockedLimit.unavailable ? 503 : 429,
      headers: rateLimitHeaders(blockedLimit, RL_WINDOW_SECONDS),
    })
  }

  const supabase = createServiceClient()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('calendar_feed_token_hash', hashToken(token))
    .maybeSingle()

  // Fail loud on a genuine query error (vs a clean "no such token"). A silent
  // 200 here would mask an outage and look identical to an unsubscribed feed.
  if (profileError) {
    console.error('calendar feed: profile lookup failed:', profileError.message)
    return NextResponse.json({ error: 'Calendar feed temporarily unavailable' }, { status: 500 })
  }
  if (!profile) return NextResponse.json({ error: 'Calendar feed not found' }, { status: 404 })

  // F-020: the prior select listed `updated_at` (and unused `created_at`), but
  // `deadlines` has no `updated_at` column, so the query errored and the route
  // silently dropped EVERY user-created Timeline deadline from the ICS while
  // still returning 200 with config deadlines only. The VEVENT builder only
  // reads id/title/due_date/details/location, and source_specialty_key feeds
  // the auto-dedupe set - so select exactly those. Any query error now fails
  // loud (500) instead of partial-200, so a future schema drift is caught.
  const { data: deadlines, error: deadlinesError } = await supabase
    .from('deadlines')
    .select('id, title, due_date, details, location, source_specialty_key')
    .eq('user_id', profile.id)
    .eq('completed', false)
    .order('due_date', { ascending: true })

  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('id, category, target_count, due_date, specific, measurable, achievable, relevant, time_bound, created_at')
    .eq('user_id', profile.id)
    .is('completed_at', null)
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true })

  const { data: specialties, error: specialtiesError } = await supabase
    .from('specialty_applications')
    .select('id, specialty_key')
    .eq('user_id', profile.id)
    .eq('is_active', true)

  if (deadlinesError || goalsError || specialtiesError) {
    console.error(
      'calendar feed: event query failed:',
      deadlinesError?.message ?? goalsError?.message ?? specialtiesError?.message
    )
    return NextResponse.json({ error: 'Calendar feed temporarily unavailable' }, { status: 500 })
  }

  const host = req.nextUrl.host
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const persistedAutoKeys = new Set(
    (deadlines ?? [])
      .filter(deadline => deadline.source_specialty_key)
      .map(deadline => `${deadline.source_specialty_key}|${deadline.title}|${deadline.due_date}`)
  )
  const configuredDeadlines = [
    ...NHS_ROUND_3_2026_DEADLINES.map(deadline => ({
      id: `nhs-round-3-${deadline.kind}`,
      title: deadline.label,
      due_date: deadline.date,
      details: [deadline.details, deadline.sourceLabel, deadline.sourceUrl].filter(Boolean).join('\n'),
      location: deadline.sourceUrl,
    })),
    ...(specialties ?? []).flatMap(specialty =>
      getDeadlinesForSpecialty(specialty.specialty_key)
        .filter(deadline => !persistedAutoKeys.has(`${specialty.specialty_key}|${deadline.label}|${deadline.date}`))
        .map(deadline => ({
          id: `${specialty.id}-${deadline.kind}`,
          title: deadline.label,
          due_date: deadline.date,
          details: [deadline.details, deadline.sourceLabel, deadline.sourceUrl].filter(Boolean).join('\n'),
          location: deadline.sourceUrl,
        }))
    ),
  ]

  const goalEvents = (goals ?? []).map(goal => ({
    id: `goal-${goal.id}`,
    title: goal.specific || `${goal.target_count} ${CATEGORIES.find(category => category.value === goal.category)?.label ?? goal.category}`,
    due_date: goal.due_date!,
    details: [goal.measurable, goal.achievable, goal.relevant, goal.time_bound].filter(Boolean).join('\n'),
    location: null,
  }))

  const events = [...configuredDeadlines, ...(deadlines ?? []), ...goalEvents].flatMap(deadline => {
    const start = icsDate(deadline.due_date)
    const endDate = new Date(deadline.due_date)
    endDate.setDate(endDate.getDate() + 1)
    const end = icsDate(endDate.toISOString().split('T')[0])
    return [
      'BEGIN:VEVENT',
      `UID:${deadline.id}@${host}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      fold(`SUMMARY:${escapeIcs(deadline.title)}`),
      deadline.details ? fold(`DESCRIPTION:${escapeIcs(deadline.details)}`) : null,
      deadline.location ? fold(`LOCATION:${escapeIcs(deadline.location)}`) : null,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n')
  })

  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Clerkfolio//Timeline//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Clerkfolio Timeline',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="clerkfolio-timeline.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
