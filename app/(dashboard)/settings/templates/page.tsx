import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TemplatesManager from '@/components/settings/templates-manager'
import type { Template } from '@/lib/types/templates'

export default async function TemplatesSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/settings/templates')

  const { data: templates } = await supabase
    .from('templates')
    .select('*')
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order('created_at', { ascending: false })

  return <TemplatesManager initialTemplates={(templates ?? []) as Template[]} />
}
