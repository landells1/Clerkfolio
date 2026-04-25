import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { PortfolioEntry, Category } from '@/lib/types/portfolio'
import { getSpecialtyConfig } from '@/lib/specialties'

function formatTag(tag: string): string {
  const config = getSpecialtyConfig(tag)
  return config ? config.name : tag
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 52,
    backgroundColor: '#ffffff',
  },
  // Header
  header: { marginBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  brand: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1B6FD9', letterSpacing: 1 },
  exportDate: { fontSize: 8, color: '#888888' },
  headerName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 2 },
  headerSpecialty: { fontSize: 9, color: '#555555' },
  headerRule: { borderBottom: '1.5pt solid #1B6FD9', marginTop: 10 },
  // Category heading
  catHeading: { marginTop: 20, marginBottom: 8 },
  catTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1B6FD9', letterSpacing: 1.5, textTransform: 'uppercase' },
  catRule: { borderBottom: '0.5pt solid #e0e0e0', marginTop: 4 },
  // Entry
  entry: { marginBottom: 10, paddingBottom: 10, borderBottom: '0.25pt solid #efefef' },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  entryTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', flex: 1, marginRight: 8 },
  entryDate: { fontSize: 8, color: '#888888', fontFamily: 'Helvetica' },
  detail: { color: '#444444', marginBottom: 1.5, lineHeight: 1.4 },
  detailLabel: { fontFamily: 'Helvetica-Bold', color: '#222222' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 4 },
  tag: { backgroundColor: '#f0faf6', color: '#1B6FD9', fontSize: 7, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  // Footer
  footer: { position: 'absolute', bottom: 28, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#aaaaaa' },
  pageNum: { fontSize: 7, color: '#aaaaaa' },
})

// ── Category ordering + labels ───────────────────────────────────────────────

const CAT_ORDER: Category[] = [
  'audit_qip', 'teaching', 'conference', 'publication',
  'leadership', 'prize', 'procedure', 'reflection', 'custom',
]

const CAT_LABELS: Record<Category, string> = {
  audit_qip:   'Audit & QIP',
  teaching:    'Teaching & Presentations',
  conference:  'Conferences & Courses',
  publication: 'Publications & Research',
  leadership:  'Leadership & Societies',
  prize:       'Prizes & Awards',
  procedure:   'Procedures & Clinical Skills',
  reflection:  'Reflections & CBDs/DOPs',
  custom:      'Custom',
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function fmt(v: string | null | undefined) { return v ?? '' }
function cap(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <Text style={s.detail}>
      <Text style={s.detailLabel}>{label}: </Text>{value}
    </Text>
  )
}

function EntryDetails({ e }: { e: PortfolioEntry }) {
  switch (e.category) {
    case 'audit_qip':
      return <>
        <Detail label="Type" value={cap(fmt(e.audit_type))} />
        <Detail label="Role" value={fmt(e.audit_role)} />
        <Detail label="Trust / hospital" value={fmt(e.audit_trust)} />
        <Detail label="Cycle stage" value={e.audit_cycle_stage ? cap(fmt(e.audit_cycle_stage)) : null} />
        <Detail label="Presented" value={e.audit_presented ? 'Yes' : null} />
        <Detail label="Outcome" value={fmt(e.audit_outcome)} />
      </>
    case 'teaching':
      return <>
        <Detail label="Type" value={e.teaching_type ? cap(fmt(e.teaching_type)) : null} />
        <Detail label="Audience" value={e.teaching_audience ? cap(fmt(e.teaching_audience)) : null} />
        <Detail label="Setting" value={e.teaching_setting ? cap(fmt(e.teaching_setting)) : null} />
        <Detail label="Event / org" value={fmt(e.teaching_event)} />
        <Detail label="Invited" value={e.teaching_invited ? 'Yes' : null} />
      </>
    case 'conference':
      return <>
        <Detail label="Type" value={e.conf_type ? cap(fmt(e.conf_type)) : null} />
        <Detail label="Event" value={fmt(e.conf_event_name)} />
        <Detail label="Attendance" value={e.conf_attendance ? cap(fmt(e.conf_attendance)) : null} />
        <Detail label="Level" value={e.conf_level ? cap(fmt(e.conf_level)) : null} />
        <Detail label="CPD hours" value={e.conf_cpd_hours?.toString() ?? null} />
        <Detail label="Certificate" value={e.conf_certificate ? 'Yes' : null} />
      </>
    case 'publication':
      return <>
        <Detail label="Type" value={e.pub_type ? cap(fmt(e.pub_type)) : null} />
        <Detail label="Status" value={e.pub_status ? cap(fmt(e.pub_status)) : null} />
        <Detail label="Journal" value={fmt(e.pub_journal)} />
        <Detail label="Authors" value={fmt(e.pub_authors)} />
        <Detail label="DOI / link" value={fmt(e.pub_doi)} />
      </>
    case 'leadership':
      return <>
        <Detail label="Role" value={fmt(e.leader_role)} />
        <Detail label="Organisation" value={fmt(e.leader_organisation)} />
        <Detail label="Start date" value={e.leader_start_date ? formatDate(e.leader_start_date) : null} />
        <Detail label="End date" value={e.leader_ongoing ? 'Ongoing' : (e.leader_end_date ? formatDate(e.leader_end_date) : null)} />
      </>
    case 'prize':
      return <>
        <Detail label="Awarding body" value={fmt(e.prize_body)} />
        <Detail label="Level" value={e.prize_level ? cap(fmt(e.prize_level)) : null} />
        <Detail label="Description" value={fmt(e.prize_description)} />
      </>
    case 'procedure':
      return <>
        <Detail label="Procedure" value={fmt(e.proc_name)} />
        <Detail label="Setting" value={fmt(e.proc_setting)} />
        <Detail label="Supervision" value={e.proc_supervision ? cap(fmt(e.proc_supervision)) : null} />
        <Detail label="Count" value={e.proc_count?.toString() ?? null} />
      </>
    case 'reflection':
      return <>
        <Detail label="Type" value={e.refl_type ? e.refl_type.replace('_', '-').toUpperCase() : null} />
        <Detail label="Clinical context" value={fmt(e.refl_clinical_context)} />
        <Detail label="Supervisor" value={fmt(e.refl_supervisor)} />
        <Detail label="Reflection" value={fmt(e.refl_free_text)} />
      </>
    case 'custom':
      return <Detail label="Description" value={fmt(e.custom_free_text)} />
    default:
      return null
  }
}

// ── Main document ─────────────────────────────────────────────────────────────

export type ExportDocProps = {
  entries: PortfolioEntry[]
  userName: string
  specialty: string
  exportedAt: string
}

export default function PortfolioPDF({ entries, userName, specialty, exportedAt }: ExportDocProps) {
  // Group by category in canonical order
  const grouped: Partial<Record<Category, PortfolioEntry[]>> = {}
  for (const e of entries) {
    if (!grouped[e.category]) grouped[e.category] = []
    grouped[e.category]!.push(e)
  }

  const sections = CAT_ORDER.filter(c => (grouped[c]?.length ?? 0) > 0)

  return (
    <Document title={`Clinidex Export — ${specialty}`} author={userName}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header} fixed>
          <View style={s.headerTop}>
            <Text style={s.brand}>CLINIDEX</Text>
            <Text style={s.exportDate}>Exported {exportedAt}</Text>
          </View>
          <Text style={s.headerName}>{userName}</Text>
          <Text style={s.headerSpecialty}>{specialty} · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}</Text>
          <View style={s.headerRule} />
        </View>

        {/* Sections */}
        {sections.map(cat => (
          <View key={cat}>
            <View style={s.catHeading}>
              <Text style={s.catTitle}>{CAT_LABELS[cat]}</Text>
              <View style={s.catRule} />
            </View>
            {grouped[cat]!.map(e => (
              <View key={e.id} style={s.entry} wrap={false}>
                <View style={s.entryRow}>
                  <Text style={s.entryTitle}>{e.title}</Text>
                  <Text style={s.entryDate}>{formatDate(e.date)}</Text>
                </View>
                <EntryDetails e={e} />
                {e.specialty_tags?.length > 0 && (
                  <View style={s.tags}>
                    {e.specialty_tags.map(t => (
                      <Text key={t} style={s.tag}>{formatTag(t)}</Text>
                    ))}
                  </View>
                )}
                {e.notes && <Detail label="Notes" value={e.notes} />}
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>clinidex.co.uk · Confidential</Text>
          <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
