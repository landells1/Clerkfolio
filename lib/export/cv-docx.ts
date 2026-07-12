/**
 * CV DOCX generation - a Word-native mirror of the CV PDF export
 * (`lib/pdf/portfolio-pdf.tsx` / `portfolio-pdf-runtime.cjs`, served by
 * `POST /api/export/cv`). Same content, same section/category grouping,
 * same per-category detail fields - just a different container so it opens
 * cleanly in Word/Google Docs. Do not add sections/fields here that the PDF
 * export doesn't already show; keep the two renderers in lockstep.
 *
 * Split into pure data mapping (`buildCvDocSections`, testable without the
 * `docx` runtime) and document assembly (`renderCvDocx`, produces the actual
 * .docx buffer) so the mapping logic can be unit tested the same way
 * `sanitize-profile.test.ts` tests `lib/export/sanitize-profile.ts`.
 */
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TabStopType, TabStopPosition } from 'docx'
import type { PortfolioEntry, Category } from '@/lib/types/portfolio'
import type { CvLogSection } from '@/lib/export/cv-log-sections'
import { formatSpecialtyLabel } from '@/lib/specialties'
import {
  AUDIT_CYCLE_STAGE_LABELS,
  AUDIT_TYPE_LABELS,
  CONF_TYPE_LABELS,
  LEVEL_LABELS,
  PROC_SUPERVISION_LABELS,
  PUB_STATUS_LABELS,
  PUB_TYPE_LABELS,
  REFL_TYPE_SHORT_LABELS,
  TEACHING_AUDIENCE_LABELS,
  TEACHING_TYPE_LABELS,
  titleCase,
} from '@/lib/types/portfolio-labels'

// Same canonical order/labels as the PDF renderer (CAT_ORDER/CAT_LABELS in
// lib/pdf/portfolio-pdf.tsx) - keep both in sync if categories change.
const CAT_ORDER: Category[] = [
  'audit_qip', 'teaching', 'conference', 'publication',
  'leadership', 'prize', 'procedure', 'reflection', 'custom',
]

const CAT_LABELS: Record<Category, string> = {
  audit_qip: 'Audit & QIP',
  teaching: 'Teaching & Presentations',
  conference: 'Conferences & Courses',
  publication: 'Publications & Research',
  leadership: 'Leadership & Societies',
  prize: 'Prizes & Awards',
  procedure: 'Procedures & Clinical Skills',
  reflection: 'Reflections & CBDs/DOPs',
  custom: 'Custom',
}

function fmt(v: string | null | undefined) { return v ?? '' }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Mirrors EntryDetails() in lib/pdf/portfolio-pdf.tsx field-for-field. */
function entryDetailLines(e: PortfolioEntry): { label: string; value: string }[] {
  const lines: { label: string; value: string | null | undefined }[] = []
  switch (e.category) {
    case 'audit_qip':
      lines.push(
        { label: 'Type', value: e.audit_type ? AUDIT_TYPE_LABELS[e.audit_type] ?? titleCase(fmt(e.audit_type)) : null },
        { label: 'Role', value: fmt(e.audit_role) },
        { label: 'Trust / hospital', value: fmt(e.audit_trust) },
        { label: 'Cycle stage', value: e.audit_cycle_stage ? AUDIT_CYCLE_STAGE_LABELS[e.audit_cycle_stage] ?? titleCase(fmt(e.audit_cycle_stage)) : null },
        { label: 'Presented', value: e.audit_presented ? 'Yes' : null },
        { label: 'Outcome', value: fmt(e.audit_outcome) },
      )
      break
    case 'teaching':
      lines.push(
        { label: 'Type', value: e.teaching_type ? TEACHING_TYPE_LABELS[e.teaching_type] ?? titleCase(fmt(e.teaching_type)) : null },
        { label: 'Audience', value: e.teaching_audience ? TEACHING_AUDIENCE_LABELS[e.teaching_audience] ?? titleCase(fmt(e.teaching_audience)) : null },
        { label: 'Setting', value: e.teaching_setting ? titleCase(fmt(e.teaching_setting)) : null },
        { label: 'Event / org', value: fmt(e.teaching_event) },
        { label: 'Invited', value: e.teaching_invited ? 'Yes' : null },
      )
      break
    case 'conference':
      lines.push(
        { label: 'Type', value: e.conf_type ? CONF_TYPE_LABELS[e.conf_type] ?? titleCase(fmt(e.conf_type)) : null },
        { label: 'Event', value: fmt(e.conf_event_name) },
        { label: 'Level', value: e.conf_level ? LEVEL_LABELS[e.conf_level] ?? titleCase(fmt(e.conf_level)) : null },
        { label: 'CPD hours', value: e.conf_cpd_hours?.toString() ?? null },
        { label: 'Certificate', value: e.conf_certificate ? 'Yes' : null },
      )
      break
    case 'publication':
      lines.push(
        { label: 'Type', value: e.pub_type ? PUB_TYPE_LABELS[e.pub_type] ?? titleCase(fmt(e.pub_type)) : null },
        { label: 'Status', value: e.pub_status ? PUB_STATUS_LABELS[e.pub_status] ?? titleCase(fmt(e.pub_status)) : null },
        { label: 'Journal', value: fmt(e.pub_journal) },
        { label: 'Authors', value: fmt(e.pub_authors) },
        { label: 'DOI / link', value: fmt(e.pub_doi) },
      )
      break
    case 'leadership':
      lines.push(
        { label: 'Role', value: fmt(e.leader_role) },
        { label: 'Organisation', value: fmt(e.leader_organisation) },
        { label: 'Start date', value: e.leader_start_date ? formatDate(e.leader_start_date) : null },
        { label: 'End date', value: e.leader_ongoing ? 'Ongoing' : (e.leader_end_date ? formatDate(e.leader_end_date) : null) },
      )
      break
    case 'prize':
      lines.push(
        { label: 'Awarding body', value: fmt(e.prize_body) },
        { label: 'Level', value: e.prize_level ? LEVEL_LABELS[e.prize_level] ?? titleCase(fmt(e.prize_level)) : null },
        { label: 'Description', value: fmt(e.prize_description) },
      )
      break
    case 'procedure':
      lines.push(
        { label: 'Procedure', value: fmt(e.proc_name) },
        { label: 'Setting', value: fmt(e.proc_setting) },
        { label: 'Supervision', value: e.proc_supervision ? PROC_SUPERVISION_LABELS[e.proc_supervision] ?? titleCase(fmt(e.proc_supervision)) : null },
        { label: 'Count', value: e.proc_count?.toString() ?? null },
      )
      break
    case 'reflection':
      lines.push(
        { label: 'Type', value: e.refl_type ? REFL_TYPE_SHORT_LABELS[e.refl_type] ?? e.refl_type.replace('_', '-').toUpperCase() : null },
        { label: 'Clinical context', value: fmt(e.refl_clinical_context) },
        { label: 'Supervisor', value: fmt(e.refl_supervisor) },
        { label: 'Reflection', value: fmt(e.refl_free_text) },
      )
      break
    case 'custom':
      lines.push({ label: 'Description', value: fmt(e.custom_free_text) })
      break
  }
  if (e.notes) lines.push({ label: 'Notes', value: e.notes })
  return lines.filter((l): l is { label: string; value: string } => Boolean(l.value))
}

export type CvDocEntrySection = {
  category: Category
  categoryLabel: string
  entries: {
    id: string
    title: string
    dateLabel: string
    details: { label: string; value: string }[]
    tags: string[]
  }[]
}

export type CvDocData = {
  userName: string
  specialty: string
  exportedAt: string
  templateName: string
  templateSubtitle: string
  sections: CvDocEntrySection[]
  // personal_log-sourced sections (Courses & Certifications, Examinations),
  // built by lib/export/cv-log-sections.ts and shared with the PDF + preview.
  logSections: CvLogSection[]
  totalEntries: number
}

/**
 * Pure data-mapping layer: groups/orders/formats entries exactly like the PDF
 * renderer, without touching the `docx` document-building API. Kept separate
 * so it can be unit tested cheaply (no XML/zip assembly in the test path).
 */
export function buildCvDocSections(entries: PortfolioEntry[]): CvDocEntrySection[] {
  const grouped: Partial<Record<Category, PortfolioEntry[]>> = {}
  for (const e of entries) {
    if (!grouped[e.category]) grouped[e.category] = []
    grouped[e.category]!.push(e)
  }

  return CAT_ORDER.filter(cat => (grouped[cat]?.length ?? 0) > 0).map(cat => ({
    category: cat,
    categoryLabel: CAT_LABELS[cat],
    entries: grouped[cat]!.map(e => ({
      id: e.id,
      title: e.title,
      dateLabel: formatDate(e.date),
      details: entryDetailLines(e),
      tags: (e.specialty_tags ?? []).map(formatSpecialtyLabel),
    })),
  }))
}

export function buildCvDocData(params: {
  entries: PortfolioEntry[]
  userName: string
  specialty: string
  exportedAt: string
  templateName: string
  templateSubtitle: string
  logSections?: CvLogSection[]
}): CvDocData {
  return {
    userName: params.userName,
    specialty: params.specialty,
    exportedAt: params.exportedAt,
    templateName: params.templateName,
    templateSubtitle: params.templateSubtitle,
    sections: buildCvDocSections(params.entries),
    logSections: params.logSections ?? [],
    totalEntries: params.entries.length,
  }
}

const ACCENT_COLOR = '1B6FD9'

/** Assembles the actual .docx buffer from mapped CV data. */
export async function renderCvDocx(data: CvDocData): Promise<Buffer> {
  const children: Paragraph[] = []

  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'CLERKFOLIO', bold: true, color: ACCENT_COLOR, size: 18 })],
    }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { before: 200, after: 80 },
      children: [new TextRun({ text: data.templateName })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: data.templateSubtitle, italics: true, color: '555555' })],
    }),
    new Paragraph({
      children: [new TextRun({ text: data.userName, bold: true })],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [new TextRun({ text: `${data.specialty} · Exported ${data.exportedAt} · ${data.totalEntries} ${data.totalEntries === 1 ? 'entry' : 'entries'}`, color: '555555', size: 18 })],
    }),
  )

  for (const section of data.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 120 },
        children: [new TextRun({ text: section.categoryLabel.toUpperCase(), color: ACCENT_COLOR, bold: true })],
      }),
    )

    for (const entry of section.entries) {
      children.push(
        new Paragraph({
          spacing: { before: 160 },
          children: [
            new TextRun({ text: entry.title, bold: true }),
            new TextRun({ text: `\t${entry.dateLabel}`, color: '888888' }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        }),
      )

      for (const detail of entry.details) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: `${detail.label}: `, bold: true }),
              new TextRun({ text: detail.value }),
            ],
          }),
        )
      }

      if (entry.tags.length > 0) {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: entry.tags.join(' · '), italics: true, color: ACCENT_COLOR, size: 16 })],
          }),
        )
      }
    }
  }

  // Log-sourced sections (Courses & Certifications, Examinations) render with
  // the same heading/entry/detail structure as the portfolio sections above.
  for (const section of data.logSections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 120 },
        children: [new TextRun({ text: section.title.toUpperCase(), color: ACCENT_COLOR, bold: true })],
      }),
    )

    for (const entry of section.entries) {
      children.push(
        new Paragraph({
          spacing: { before: 160 },
          children: [
            new TextRun({ text: entry.title, bold: true }),
            new TextRun({ text: `\t${entry.dateLabel}`, color: '888888' }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        }),
      )

      for (const detail of entry.details) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({ text: `${detail.label}: `, bold: true }),
              new TextRun({ text: detail.value }),
            ],
          }),
        )
      }
    }
  }

  if (data.sections.length === 0 && data.logSections.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: 'No entries matched this template.' })] }))
  }

  children.push(
    new Paragraph({
      spacing: { before: 400 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'clerkfolio.co.uk · Confidential', color: 'AAAAAA', size: 14 })],
    }),
  )

  const doc = new Document({
    creator: 'Clerkfolio',
    title: `Clerkfolio Export - ${data.specialty}`,
    sections: [{ children }],
  })

  return Packer.toBuffer(doc)
}
