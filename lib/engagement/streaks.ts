const LONDON_TIME_ZONE = 'Europe/London'

type DateParts = {
  year: number
  month: number
  day: number
}

export function londonDateParts(value: Date | string): DateParts {
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TIME_ZONE,
    year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hourCycle: 'h23',
  }).formatToParts(date)

  return {
    year: Number(parts.find(part => part.type === 'year')?.value),
    month: Number(parts.find(part => part.type === 'month')?.value),
    day: Number(parts.find(part => part.type === 'day')?.value),
  }
}

export function londonDateStartUtc(parts: DateParts) {
  const desiredUtc = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0)
  const guess = new Date(desiredUtc)
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(guess)
  const actualAsUtc = Date.UTC(
    Number(formatted.find(part => part.type === 'year')?.value),
    Number(formatted.find(part => part.type === 'month')?.value) - 1,
    Number(formatted.find(part => part.type === 'day')?.value),
    Number(formatted.find(part => part.type === 'hour')?.value),
    Number(formatted.find(part => part.type === 'minute')?.value),
    Number(formatted.find(part => part.type === 'second')?.value)
  )
  return new Date(guess.getTime() - (actualAsUtc - desiredUtc))
}

function addUtcDays(parts: DateParts, days: number): DateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

export function currentLondonWeekWindow(now = new Date()) {
  const parts = londonDateParts(now)
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  const day = date.getUTCDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const startParts = addUtcDays(parts, mondayOffset)
  const endParts = addUtcDays(startParts, 7)
  return {
    start: londonDateStartUtc(startParts),
    end: londonDateStartUtc(endParts),
  }
}

export function previousLondonMonthWindow(now = new Date()) {
  const parts = londonDateParts(now)
  const startThisMonth = { year: parts.year, month: parts.month, day: 1 }
  const previous = new Date(Date.UTC(parts.year, parts.month - 2, 1))
  const startPreviousMonth = { year: previous.getUTCFullYear(), month: previous.getUTCMonth() + 1, day: 1 }
  const label = previous.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return {
    start: londonDateStartUtc(startPreviousMonth),
    end: londonDateStartUtc(startThisMonth),
    label,
  }
}

function isoWeekKeyFromParts(parts: DateParts) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const weekYear = date.getUTCFullYear()
  const yearStart = new Date(Date.UTC(weekYear, 0, 1))
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${weekYear}-W${String(week).padStart(2, '0')}`
}

function isoWeekKeyForOffset(offsetWeeks: number, now = new Date()) {
  const date = new Date(now)
  date.setUTCDate(date.getUTCDate() + offsetWeeks * 7)
  return isoWeekKeyFromParts(londonDateParts(date))
}

export function londonDateKey(value: Date | string) {
  const parts = londonDateParts(value)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

export function isoWeekKey(value: Date | string) {
  return isoWeekKeyFromParts(londonDateParts(value))
}

export function buildActiveWeekCache(createdAtValues: string[], now = new Date()) {
  const earliest = new Date(now)
  earliest.setUTCDate(earliest.getUTCDate() - 370)

  const weeks = Array.from(new Set(
    createdAtValues
      .filter(value => new Date(value).getTime() >= earliest.getTime())
      .map(isoWeekKey)
  )).sort()

  return weeks.slice(-52)
}

export function currentStreakFromActiveWeeks(activeWeeks: string[], now = new Date()) {
  const active = new Set(activeWeeks)
  let streak = 0
  for (let offset = 0; offset > -52; offset--) {
    const key = isoWeekKeyForOffset(offset, now)
    if (!active.has(key)) {
      if (offset === 0) continue
      break
    }
    streak++
  }
  return streak
}

export function activeWeeksYearToDate(activeWeeks: string[], now = new Date()) {
  const year = londonDateParts(now).year
  return activeWeeks.filter(key => key.startsWith(`${year}-W`)).length
}
