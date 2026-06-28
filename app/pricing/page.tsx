import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function PricingPage() {
  // A logged-out visitor goes to the landing pricing section. A logged-in user
  // would otherwise be bounced by middleware to a dead `/dashboard#pricing`
  // anchor (the fragment points nowhere on the dashboard, F-009 minor), so send
  // them to the in-app plans page instead.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  redirect(user ? '/upgrade' : '/#pricing')
}
