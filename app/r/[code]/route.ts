import { NextRequest, NextResponse } from 'next/server'

export function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const code = params.code.trim().toUpperCase()
  const url = req.nextUrl.clone()
  url.pathname = '/signup'
  url.search = ''
  url.searchParams.set('ref', code)
  return NextResponse.redirect(url)
}
