import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import PortfolioPDF from '@/lib/pdf/portfolio-pdf'
import React, { type ReactElement } from 'react'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json()
  const { entryIds, specialty } = body as { entryIds: string[]; specialty: string }

  if (!entryIds?.length) {
    return NextResponse.json({ error: 'No entries selected' }, { status: 400 })
  }

  // Fetch selected entries (RLS ensures they belong to this user)
  const { data: entries, error } = await supabase
    .from('portfolio_entries')
    .select('*')
    .in('id', entryIds)
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (error || !entries?.length) {
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
  }

  // Fetch user name
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Clinidex User'
  const exportedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const element = React.createElement(PortfolioPDF, {
    entries,
    userName,
    specialty: specialty || 'Portfolio',
    exportedAt,
  }) as unknown as ReactElement<DocumentProps>

  const buffer = await renderToBuffer(element)

  const safeSpecialty = specialty.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  const filename = `clinidex-${safeSpecialty}-${new Date().toISOString().split('T')[0]}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
