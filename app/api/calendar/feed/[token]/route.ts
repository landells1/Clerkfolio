import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { getSpecialtyConfig } from '@/lib/specialties'
import { NHS_ROUND_3_2026_DEADLINES, getDeadlinesForSpecialty } from '@/lib/specialties/deadlines'

const rlMap = new Map<string, { count: number; resetAt: number }>()
const RL_WINDOW = 60_000
const RL_MAX_PER_TOKEN = 20
const RL_MAX_PER_IP = 60

function checkRateLimit(key: string, max: number): boolean {
  const now = Date.now()
  const entry = rlMap.get(key)
  if (!entry || entry.resetAt < now) {
    rlMap.set(key, { count: 1, resetAt: now + RL_WINDOW })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function clientIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

function escapeIcs(value: string | null | undefined) {
  return (value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function icsDate(date: string) {
  return date.replace(/-/g, '')
}

function fold(line: string) {
  const chunks: string[] = []
  let rest = line
  while (rest.length > 74) {
    chunks.push(rest.slice(0, 74))
    rest = ` ${rest.slice(74)}`
  }
  chunks.push(rest)
  return chunks.join('\r\n')
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Two limiters in tandem: per-token (caps a legitimate calendar client polling
  // too aggressively) and per-IP (caps an attacker probing many invalid tokens
  // — without this, each guess would get its own fresh 20/min counter).
  if (!checkRateLimit(`token:${token}`, RL_MAX_PER_TOKEN) || !checkRateLimit(`ip:${clientIp(req)}`, RL_MAX_PER_IP)) {
    return new NextResponse(null, { status: 429, headers: { 'Retry-After': '60' } })
  }

  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('calendar_feed_token_hash', hashToken(token))
    .single()

  if (!profile) return NextResponse.json({ error: 'Calendar feed not found' }, { status: 404 })

  const { data: deadlines } = await supabase
    .from('deadlines')
    .select('id, title, due_date, details, location, updated_at, created_at')
    .eq('user_id', profile.id)
    .eq('completed', false)
    .order('due_date', { ascending: true })

  const { data: goals } = await supabase
    .from('goals')
    .select('id, category, target_count, due_date, specific, measurable, achievable, relevant, time_bound, created_at')
    .eq('user_id', profile.id)
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true })

  const { data: specialties } = await supabase
    .from('specialty_applications')
    .select('id, specialty_key')
    .eq('user_id', profile.id)
    .eq('is_active', true)

  const host = req.nextUrl.host
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const configuredDeadlines = [
    ...NHS_ROUND_3_2026_DEADLINES.map(deadline => ({
      id: `nhs-round-3-${deadline.kind}`,
      title: deadline.label,
      due_date: deadline.date,
      details: [deadline.details, deadline.sourceLabel, deadline.sourceUrl].filter(Boolean).join('\n'),
      location: deadline.sourceUrl,
      updated_at: null,
      created_at: null,
    })),
    ...(specialties ?? []).flatMap(specialty => {
      const config = getSpecialtyConfig(specialty.specialty_key)
      return getDeadlinesForSpecialty(specialty.specialty_key).map(deadline => ({
        id: `${specialty.id}-${deadline.kind}`,
        title: deadline.label,
        due_date: deadline.date,
        details: [deadline.details, deadline.sourceLabel, deadline.sourceUrl].filter(Boolean).join('\n'),
        location: deadline.sourceUrl,
        updated_at: null,
        created_at: config?.key ?? null,
      }))
    }),
  ]

  const goalEvents = (goals ?? []).map(goal => ({
    id: `goal-${goal.id}`,
    title: goal.specific || `${goal.target_count} ${goal.category.replace(/_/g, ' ')}`,
    due_date: goal.due_date!,
    details: [goal.measurable, goal.achievable, goal.relevant, goal.time_bound].filter(Boolean).join('\n'),
    location: null,
    updated_at: null,
    created_at: goal.created_at,
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
