// Reflection-framework field definitions and (de)serialisation. Extracted from
// the entry form so the pure build/parse/detect logic can be unit-tested and
// reused. The entry form renders GIBBS/ROLFE/DRISCOLL fields and stores the
// combined text in refl_free_text; parseFrameworkText round-trips it back.

export type ReflectionField = { key: string; label: string; hint: string }

export const GIBBS_FIELDS: ReflectionField[] = [
  { key: 'description', label: 'Description', hint: 'What happened?' },
  { key: 'feelings', label: 'Feelings', hint: 'What were you thinking and feeling?' },
  { key: 'evaluation', label: 'Evaluation', hint: 'What was good and bad about the experience?' },
  { key: 'analysis', label: 'Analysis', hint: 'What sense can you make of the situation?' },
  { key: 'conclusion', label: 'Conclusion', hint: 'What else could you have done?' },
  { key: 'action_plan', label: 'Action Plan', hint: 'If it arose again, what would you do?' },
]
export const ROLFE_FIELDS: ReflectionField[] = [
  { key: 'what', label: 'What?', hint: 'Describe the event' },
  { key: 'so_what', label: 'So What?', hint: 'What does this mean for you/the patient?' },
  { key: 'now_what', label: 'Now What?', hint: 'What will you do differently?' },
]
export const DRISCOLL_FIELDS: ReflectionField[] = [
  { key: 'what', label: 'What?', hint: 'What happened?' },
  { key: 'so_what', label: 'So What?', hint: 'Why was this significant?' },
  { key: 'now_what', label: 'Now What?', hint: 'What action will you take?' },
]

function fieldsFor(framework: string): ReflectionField[] {
  return framework === 'gibbs' ? GIBBS_FIELDS : framework === 'driscoll' ? DRISCOLL_FIELDS : ROLFE_FIELDS
}

export function buildFrameworkText(framework: string, parts: Record<string, string>): string {
  return fieldsFor(framework)
    .map(f => `**${f.label}:**\n${parts[f.key] ?? ''}`)
    .join('\n\n')
}

export function parseFrameworkText(framework: string, text: string): Record<string, string> {
  const fields = fieldsFor(framework)
  const result: Record<string, string> = {}
  fields.forEach((f, i) => {
    const start = text.indexOf(`**${f.label}:**\n`)
    if (start === -1) { result[f.key] = ''; return }
    const contentStart = start + `**${f.label}:**\n`.length
    const nextField = fields[i + 1]
    const end = nextField ? text.indexOf(`\n\n**${nextField.label}:**`) : text.length
    result[f.key] = text.slice(contentStart, end === -1 ? text.length : end).trim()
  })
  return result
}

// Fallback for legacy rows saved before refl_framework was persisted. Rolfe
// and Driscoll serialize identical field labels (What? / So What? / Now
// What?), so they are indistinguishable from text alone - 'rolfe' is the
// deliberate fallback for both; the parsed fields are the same either way.
export function detectFramework(text: string): 'gibbs' | 'rolfe' | 'none' {
  if (text.includes('**Description:**') && text.includes('**Action Plan:**')) return 'gibbs'
  if (text.includes('**What?:**') && text.includes('**Now What?:**')) return 'rolfe'
  return 'none'
}
