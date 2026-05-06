import { NextResponse } from 'next/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import React, { type ReactElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import PortfolioPDF from '@/lib/pdf/portfolio-pdf'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const year = new Date().getFullYear()
  const [{ data: profile }, { data: entries }] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single(),
    supabase
      .from('portfolio_entries')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date', { ascending: false }),
  ])

  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Clerkfolio User'
  const element = React.createElement(PortfolioPDF, {
    entries: entries ?? [],
    userName,
    specialty: `${year} year in review`,
    exportedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    templateName: `${year} year in review`,
    templateSubtitle: 'Your Clerkfolio portfolio entries from this calendar year',
    templateAccent: '#F59E0B',
  }) as unknown as ReactElement<DocumentProps>

  const buffer = await renderToBuffer(element)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="clerkfolio-year-in-review-${year}.pdf"`,
    },
  })
}
