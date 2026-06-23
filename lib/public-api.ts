import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { authenticateApiKey } from '@/lib/api-keys'

export type PublicApiResource = 'cases' | 'portfolio' | 'specialties' | 'deadlines' | 'goals'

type PublicQuery = (
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
) => Promise<{ data: unknown; error: { message: string } | null }>

// Explicit column allowlists per resource. The data is the key owner's own,
// but selecting '*' here would ship any future internal column (moderation
// flags, soft-link ids, ...) to API consumers by default. Keep user_id out of
// these lists; add new columns deliberately, never by widening to '*'.
const CASE_COLUMNS =
  'id, title, date, clinical_domain, clinical_domains, specialty_tags, interview_themes, interview_ready_for, notes, pinned, importance, is_demo, deleted_at, created_at, updated_at'

const PORTFOLIO_COLUMNS =
  'id, category, title, date, specialty_tags, interview_themes, interview_ready_for, notes, pinned, importance, is_demo, '
  // (Batch 3 / F-016: the auto `completeness_score` field was removed from the
  //  public API; `importance` replaces it as the user-set rating.)
  + 'audit_type, audit_role, audit_cycle_stage, audit_trust, audit_outcome, audit_presented, '
  + 'teaching_type, teaching_audience, teaching_setting, teaching_event, teaching_invited, '
  + 'conf_type, conf_event_name, conf_attendance, conf_level, conf_cpd_hours, conf_certificate, '
  + 'pub_type, pub_journal, pub_authors, pub_status, pub_doi, '
  + 'leader_role, leader_organisation, leader_start_date, leader_end_date, leader_ongoing, '
  + 'prize_body, prize_level, prize_description, '
  + 'proc_name, proc_setting, proc_supervision, proc_count, '
  + 'refl_type, refl_clinical_context, refl_supervisor, refl_free_text, refl_framework, '
  + 'custom_free_text, deleted_at, created_at, updated_at'

const SPECIALTY_COLUMNS =
  'id, specialty_key, cycle_year, is_active, is_target, bonus_claimed, archived_at, created_at, updated_at'

const DEADLINE_COLUMNS =
  'id, title, due_date, completed, notes, details, location, source_specialty_key, is_auto, created_at'

const GOAL_COLUMNS =
  'id, category, target_count, start_date, due_date, specialty_application_id, specific, measurable, achievable, relevant, time_bound, completed_at, created_at'

const QUERIES: Record<PublicApiResource, PublicQuery> = {
  cases: async (supabase, userId) =>
    await supabase
      .from('cases')
      .select(CASE_COLUMNS)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('date', { ascending: false }),
  portfolio: async (supabase, userId) =>
    await supabase
      .from('portfolio_entries')
      .select(PORTFOLIO_COLUMNS)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('date', { ascending: false }),
  specialties: async (supabase, userId) =>
    await supabase
      .from('specialty_applications')
      .select(SPECIALTY_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  deadlines: async (supabase, userId) =>
    await supabase
      .from('deadlines')
      .select(DEADLINE_COLUMNS)
      .eq('user_id', userId)
      .order('due_date', { ascending: true }),
  goals: async (supabase, userId) =>
    await supabase
      .from('goals')
      .select(GOAL_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
}

function stripUserIds(data: unknown) {
  if (!Array.isArray(data)) return data
  return data.map(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return row
    const { user_id: _userId, ...rest } = row as Record<string, unknown>
    return rest
  })
}

export async function handlePublicApiResource(req: NextRequest, resource: PublicApiResource) {
  const auth = await authenticateApiKey(req)
  if ('response' in auth) return auth.response

  const { data, error } = await QUERIES[resource](auth.supabase, auth.key.user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: stripUserIds(data ?? []),
    meta: {
      resource,
      generated_at: new Date().toISOString(),
      key_prefix: auth.key.prefix,
    },
  })
}

export function publicApiMethodNotAllowed() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  )
}
