import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('calendar_feed_token', params.token)
    .single()

  if (!profile) return NextResponse.json({ error: 'Calendar feed not found' }, { status: 404 })

  const { data: deadlines } = await supabase
    .from('deadlines')
    .select('id, title, due_date, details, location, updated_at, created_at')
    .eq('user_id', profile.id)
    .eq('completed', false)
    .order('due_date', { ascending: true })

  const host = req.nextUrl.host
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const events = (deadlines ?? []).flatMap(deadline => {
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
    'PRODID:-//Clinidex//Timeline//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Clinidex Timeline',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="clinidex-timeline.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
