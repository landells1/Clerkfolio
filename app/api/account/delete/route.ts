import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { validateOrigin } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  const originError = validateOrigin(request)
  if (originError) return originError

  // Verify the user is authenticated via their session
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Require explicit confirmation text in the request body
  let body: { confirm?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (body.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Confirmation text required' }, { status: 400 })
  }

  // Use service role for all deletion operations (bypasses RLS)
  const service = createServiceClient()

  try {
    // 1. Delete storage objects (evidence files from Supabase Storage)
    const { data: files } = await service
      .from('evidence_files')
      .select('file_path')
      .eq('user_id', user.id)

    if (files && files.length > 0) {
      const paths = files.map((f: { file_path: string }) => f.file_path)
      await service.storage.from('evidence').remove(paths)
    }

    // 2. Delete all user data rows — check each individually before touching auth
    const deleteOps = [
      service.from('evidence_files').delete().eq('user_id', user.id),
      service.from('portfolio_entries').delete().eq('user_id', user.id),
      service.from('cases').delete().eq('user_id', user.id),
      service.from('deadlines').delete().eq('user_id', user.id),
      service.from('profiles').delete().eq('id', user.id),
    ]
    const deleteResults = await Promise.all(deleteOps)
    const deleteError = deleteResults.find(r => r.error)?.error
    if (deleteError) throw deleteError

    // 3. Delete the auth user (irrecoverable — do this last)
    const { error: authDeleteError } = await service.auth.admin.deleteUser(user.id)
    if (authDeleteError) throw authDeleteError

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Account deletion error:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Deletion failed. Please contact hello@clinidex.co.uk.' }, { status: 500 })
  }
}
