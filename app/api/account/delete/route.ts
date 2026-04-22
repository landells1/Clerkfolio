import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(_request: NextRequest) {
  // Verify the user is authenticated via their session
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

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

    // 2. Delete all user data rows
    await service.from('evidence_files').delete().eq('user_id', user.id)
    await service.from('portfolio_entries').delete().eq('user_id', user.id)
    await service.from('cases').delete().eq('user_id', user.id)
    await service.from('deadlines').delete().eq('user_id', user.id)
    await service.from('profiles').delete().eq('id', user.id)

    // 3. Delete the auth user (irrecoverable — do this last)
    const { error: authDeleteError } = await service.auth.admin.deleteUser(user.id)
    if (authDeleteError) throw authDeleteError

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Account deletion error:', err)
    return NextResponse.json({ error: 'Deletion failed. Please contact hello@clinidex.co.uk.' }, { status: 500 })
  }
}
