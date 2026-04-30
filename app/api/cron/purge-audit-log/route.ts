import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCronSecret } from '@/lib/cron'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cronError = validateCronSecret(request)
  if (cronError) return cronError

  const supabase = createServiceClient()
  const oneYearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString()
  const { error } = await supabase
    .from('audit_log')
    .delete()
    .lt('created_at', oneYearAgo)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
