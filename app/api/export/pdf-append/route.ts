import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { PDFDocument } from 'pdf-lib'
import React, { type ReactElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'
import PortfolioPDF from '@/lib/pdf/portfolio-pdf'

export async function POST(req: NextRequest) {
  const originError = validateOrigin(req)
  if (originError) return originError

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('pdf')
  let entryIds: string[]
  try {
    const parsed = JSON.parse(String(form.get('entryIds') ?? '[]'))
    entryIds = Array.isArray(parsed) ? parsed : []
  } catch {
    return NextResponse.json({ error: 'Invalid entryIds format.' }, { status: 400 })
  }

  if (!(file instanceof File) || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Upload an existing PDF.' }, { status: 400 })
  }
  if (!entryIds.length || entryIds.length > 500) {
    return NextResponse.json({ error: 'Choose between 1 and 500 entries to append.' }, { status: 400 })
  }

  const [{ data: profile }, { data: entries, error }] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single(),
    supabase
      .from('portfolio_entries')
      .select('*')
      .in('id', entryIds)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('date', { ascending: false }),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!entries?.length) return NextResponse.json({ error: 'No entries found.' }, { status: 404 })

  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Clerkfolio User'
  const exportedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const element = React.createElement(PortfolioPDF, {
    entries,
    userName,
    specialty: 'Append-only export',
    exportedAt,
  }) as unknown as ReactElement<DocumentProps>

  const appendedBuffer = await renderToBuffer(element)
  const existing = await PDFDocument.load(await file.arrayBuffer())
  const appended = await PDFDocument.load(appendedBuffer)
  const copiedPages = await existing.copyPages(appended, appended.getPageIndices())
  copiedPages.forEach(page => existing.addPage(page))

  const merged = await existing.save()
  const body = new ArrayBuffer(merged.byteLength)
  new Uint8Array(body).set(merged)
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="clerkfolio-appended-${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  })
}
