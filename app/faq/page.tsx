import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function FaqPage() {
  // Logged-out visitors land on the landing FAQ section; logged-in users would
  // otherwise be bounced by middleware to a dead `/dashboard#faq` anchor (F-009
  // minor), so send them to the in-app help page instead.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  redirect(user ? '/help' : '/#faq')
}
