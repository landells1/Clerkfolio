import type { Category } from '@/lib/types/portfolio'

export const CATEGORY_GUIDES: Record<Category, string> = {
  audit_qip: 'Strong audit and QIP entries state the clinical problem, your role, the standard used, what changed, and whether a second cycle is planned. Keep patient details out. Capture dates, setting, team role, baseline findings, intervention, and outcome.',
  teaching: 'Strong teaching entries record the audience, setting, topic, your role, and any feedback or reflection. Note whether you designed the session, delivered it, organised it, or evaluated it. Add certificates or feedback forms as evidence.',
  conference: 'Strong conference and course entries capture the event name, level, attendance type, CPD hours, and any presentation or poster role. Add certificates, programmes, or acceptance emails when available.',
  publication: 'Strong publication entries capture authorship order, article type, status, journal or publisher, DOI, and your contribution. Keep the entry factual and avoid claiming outputs before they are accepted or published.',
  leadership: 'Strong leadership entries explain the organisation, role, dates, responsibilities, and concrete outputs. Focus on what you organised, changed, coordinated, or delivered, with evidence such as appointment emails or event material.',
  prize: 'Strong prize entries include awarding body, level, selection basis, date, and a brief description. Add award letters or certificates. Use the description to record context rather than subjective claims.',
  procedure: 'Strong procedure entries record the procedure, setting, supervision level, count, and reflection on learning needs. Keep it anonymised and avoid patient demographics. Add course certificates or log evidence if available.',
  reflection: 'Strong reflections describe what happened, why it mattered, what you learned, and what you will do differently. Use Gibbs, Driscoll, or Rolfe if structure helps. Keep the account anonymised.',
  custom: 'Strong custom entries are concise and structured: what happened, your role, the date, why it matters to your portfolio, and what evidence supports it. Use this only when no standard category fits.',
}
