import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params
  const code = rawCode.trim().toUpperCase()
  const url = req.nextUrl.clone()
  url.pathname = '/signup'
  url.search = ''
  url.searchParams.set('ref', code)
  return NextResponse.redirect(url)
}
