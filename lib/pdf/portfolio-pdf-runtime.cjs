/* eslint-disable */
// Runtime PDF renderer loaded via createRequire so Node's resolver picks up
// the workspace's React 18 instead of Next.js's vendored React 19. JSX is
// avoided entirely - every node is built with React.createElement so no
// react/jsx-runtime alias is involved. Labels are inlined to keep this file
// import-free beyond react + @react-pdf/renderer (both externalised in
// next.config so Node loads them straight from node_modules). See HANDOVER
// 'Known broken / deferred' for the React 19 vendoring blocker that forced
// this layout.

const React = require('react')
// @react-pdf/renderer v4 is ESM-only. require() of it throws ERR_REQUIRE_ESM
// from a CJS context, so defer to dynamic import() and resolve lazily inside
// renderPortfolioPdf. Module bindings are captured into module-scope lets
// after the first call so the rest of the file (StyleSheet.create, component
// helpers) can read them synchronously.
let Document, Page, Text, View, StyleSheet, renderToBuffer
let _rpPromise = null
async function loadReactPdf() {
  if (!_rpPromise) {
    _rpPromise = import('@react-pdf/renderer').then(m => {
      // ESM interop: some bindings (Document/Page/Text/View) live on
      // m.default in v4 while renderToBuffer can end up on the namespace
      // object directly. Probe each binding independently with a fallback
      // chain so we pick up whichever shape Node's loader gave us.
      const pick = (k) => (m[k] != null ? m[k] : (m.default && m.default[k]))
      Document = pick('Document')
      Page = pick('Page')
      Text = pick('Text')
      View = pick('View')
      StyleSheet = pick('StyleSheet')
      renderToBuffer = pick('renderToBuffer')
      return m
    })
  }
  return _rpPromise
}
const h = React.createElement

// ── Labels (inlined from lib/types/portfolio-labels.ts) ─────────────────────
const AUDIT_TYPE_LABELS = { audit: 'Audit', qip: 'QIP' }
const AUDIT_CYCLE_STAGE_LABELS = {
  '1st_cycle': 'Round 1 (baseline)',
  re_audit: 'Round 2 (re-audit)',
  completed_loop: 'Closed loop',
}
const TEACHING_TYPE_LABELS = {
  taught_session: 'Taught session', grand_round: 'Grand round',
  poster: 'Poster', oral: 'Oral presentation',
}
const TEACHING_AUDIENCE_LABELS = {
  students: 'Students', peers: 'Peers',
  consultants: 'Consultants', public: 'Public',
}
const LEVEL_LABELS = {
  local: 'Local', regional: 'Regional',
  national: 'National', international: 'International',
}
const CONF_TYPE_LABELS = { conference: 'Conference', course: 'Course' }
const CONF_ATTENDANCE_LABELS = {
  attendee: 'Attendee', presenter: 'Presenter', organiser: 'Organiser',
}
const PUB_TYPE_LABELS = {
  original_research: 'Original research', case_report: 'Case report',
  review: 'Review', letter: 'Letter', book_chapter: 'Book chapter',
}
const PUB_STATUS_LABELS = {
  in_progress: 'In progress', submitted: 'Submitted', published: 'Published',
}
const PROC_SUPERVISION_LABELS = { supervised: 'Supervised', unsupervised: 'Unsupervised' }
const REFL_TYPE_SHORT_LABELS = {
  cbd: 'CBD', dop: 'DOP', mini_cex: 'Mini-CEX', reflection: 'Personal reflection',
}

// ── Specialty label fallback (no SPECIALTY_CONFIGS lookup; title-case +
//    acronym uppercasing covers the common slugs we see in tags) ────────────
const SPECIALTY_ACRONYMS = new Set([
  'accs', 'am', 'em', 'anaes', 'cst', 'csrh', 'gp', 'imt', 'omfs', 'og', 'ph',
  'st1', 'st3', 'st4', 'mrcp', 'cesr',
])
function formatSpecialtyLabel(key) {
  if (!key) return 'Specialty'
  return String(key)
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(part => SPECIALTY_ACRONYMS.has(part.toLowerCase())
      ? part.toUpperCase()
      : part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

// ── Styles ──────────────────────────────────────────────────────────────────
// StyleSheet.create returns its input unchanged in @react-pdf v4 - inline the
// object literal so styles can be defined at module top level before
// loadReactPdf runs.
const s = ({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#1a1a1a', paddingTop: 48, paddingBottom: 48, paddingHorizontal: 52, backgroundColor: '#ffffff' },
  header: { marginBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  brand: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1B6FD9', letterSpacing: 1 },
  exportDate: { fontSize: 8, color: '#888888' },
  headerName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 2 },
  headerSpecialty: { fontSize: 9, color: '#555555' },
  headerRule: { borderBottomWidth: 1.5, borderBottomColor: '#1B6FD9', borderBottomStyle: 'solid', marginTop: 10 },
  catHeading: { marginTop: 20, marginBottom: 8 },
  catTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1B6FD9', letterSpacing: 1.5, textTransform: 'uppercase' },
  catRule: { borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0', borderBottomStyle: 'solid', marginTop: 4 },
  entry: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 0.25, borderBottomColor: '#efefef', borderBottomStyle: 'solid' },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  entryTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', flex: 1, marginRight: 8 },
  entryDate: { fontSize: 8, color: '#888888', fontFamily: 'Helvetica' },
  detail: { color: '#444444', marginBottom: 1.5, lineHeight: 1.4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 4 },
  tag: { backgroundColor: '#f0faf6', color: '#1B6FD9', fontSize: 7, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  footer: { position: 'absolute', bottom: 28, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#aaaaaa' },
  pageNum: { fontSize: 7, color: '#aaaaaa' },
  coverTitle: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#111111', marginTop: 150, marginBottom: 12 },
  coverSubtitle: { fontSize: 12, color: '#555555', marginBottom: 36 },
  coverRule: { height: 4, width: 180, marginBottom: 30 },
  tocRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: '#eeeeee', borderBottomStyle: 'solid', paddingVertical: 5 },
  tocText: { fontSize: 9, color: '#333333' },
})

const CAT_ORDER = ['audit_qip', 'teaching', 'conference', 'publication', 'leadership', 'prize', 'procedure', 'reflection', 'custom']
const CAT_LABELS = {
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

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmt(v) { return v == null ? '' : v }
function cap(str) { return String(str).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }
function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatTag(tag) { return formatSpecialtyLabel(tag) }

function detail(key, label, value) {
  if (!value) return null
  return h(Text, { key, style: s.detail }, label + ': ' + String(value))
}

function entryDetailRows(e) {
  switch (e.category) {
    case 'audit_qip':
      return [
        detail('type', 'Type', e.audit_type ? (AUDIT_TYPE_LABELS[e.audit_type] || cap(fmt(e.audit_type))) : null),
        detail('role', 'Role', fmt(e.audit_role)),
        detail('trust', 'Trust / hospital', fmt(e.audit_trust)),
        detail('cycle', 'Cycle stage', e.audit_cycle_stage ? (AUDIT_CYCLE_STAGE_LABELS[e.audit_cycle_stage] || cap(fmt(e.audit_cycle_stage))) : null),
        detail('presented', 'Presented', e.audit_presented ? 'Yes' : null),
        detail('outcome', 'Outcome', fmt(e.audit_outcome)),
      ].filter(Boolean)
    case 'teaching':
      return [
        detail('type', 'Type', e.teaching_type ? (TEACHING_TYPE_LABELS[e.teaching_type] || cap(fmt(e.teaching_type))) : null),
        detail('audience', 'Audience', e.teaching_audience ? (TEACHING_AUDIENCE_LABELS[e.teaching_audience] || cap(fmt(e.teaching_audience))) : null),
        detail('setting', 'Setting', e.teaching_setting ? cap(fmt(e.teaching_setting)) : null),
        detail('event', 'Event / org', fmt(e.teaching_event)),
        detail('invited', 'Invited', e.teaching_invited ? 'Yes' : null),
      ].filter(Boolean)
    case 'conference':
      return [
        detail('type', 'Type', e.conf_type ? (CONF_TYPE_LABELS[e.conf_type] || cap(fmt(e.conf_type))) : null),
        detail('event', 'Event', fmt(e.conf_event_name)),
        detail('attendance', 'Attendance', e.conf_attendance ? (CONF_ATTENDANCE_LABELS[e.conf_attendance] || cap(fmt(e.conf_attendance))) : null),
        detail('level', 'Level', e.conf_level ? (LEVEL_LABELS[e.conf_level] || cap(fmt(e.conf_level))) : null),
        detail('cpd', 'CPD hours', e.conf_cpd_hours != null ? String(e.conf_cpd_hours) : null),
        detail('cert', 'Certificate', e.conf_certificate ? 'Yes' : null),
      ].filter(Boolean)
    case 'publication':
      return [
        detail('type', 'Type', e.pub_type ? (PUB_TYPE_LABELS[e.pub_type] || cap(fmt(e.pub_type))) : null),
        detail('status', 'Status', e.pub_status ? (PUB_STATUS_LABELS[e.pub_status] || cap(fmt(e.pub_status))) : null),
        detail('journal', 'Journal', fmt(e.pub_journal)),
        detail('authors', 'Authors', fmt(e.pub_authors)),
        detail('doi', 'DOI / link', fmt(e.pub_doi)),
      ].filter(Boolean)
    case 'leadership':
      return [
        detail('role', 'Role', fmt(e.leader_role)),
        detail('org', 'Organisation', fmt(e.leader_organisation)),
        detail('start', 'Start date', e.leader_start_date ? formatDate(e.leader_start_date) : null),
        detail('end', 'End date', e.leader_ongoing ? 'Ongoing' : (e.leader_end_date ? formatDate(e.leader_end_date) : null)),
      ].filter(Boolean)
    case 'prize':
      return [
        detail('body', 'Awarding body', fmt(e.prize_body)),
        detail('level', 'Level', e.prize_level ? (LEVEL_LABELS[e.prize_level] || cap(fmt(e.prize_level))) : null),
        detail('description', 'Description', fmt(e.prize_description)),
      ].filter(Boolean)
    case 'procedure':
      return [
        detail('proc', 'Procedure', fmt(e.proc_name)),
        detail('setting', 'Setting', fmt(e.proc_setting)),
        detail('supervision', 'Supervision', e.proc_supervision ? (PROC_SUPERVISION_LABELS[e.proc_supervision] || cap(fmt(e.proc_supervision))) : null),
        detail('count', 'Count', e.proc_count != null ? String(e.proc_count) : null),
      ].filter(Boolean)
    case 'reflection':
      return [
        detail('type', 'Type', e.refl_type ? (REFL_TYPE_SHORT_LABELS[e.refl_type] || e.refl_type.replace('_', '-').toUpperCase()) : null),
        detail('context', 'Clinical context', fmt(e.refl_clinical_context)),
        detail('supervisor', 'Supervisor', fmt(e.refl_supervisor)),
        detail('reflection', 'Reflection', fmt(e.refl_free_text)),
      ].filter(Boolean)
    case 'custom':
      return [detail('description', 'Description', fmt(e.custom_free_text))].filter(Boolean)
    default:
      return []
  }
}

function buildDocument(props) {
  const entries = props.entries || []
  const userName = props.userName || 'Clerkfolio User'
  const specialty = props.specialty || ''
  const exportedAt = props.exportedAt || ''
  const templateName = props.templateName
  const templateSubtitle = props.templateSubtitle
  const templateAccent = props.templateAccent || '#1B6FD9'
  // personal_log-sourced sections (Courses & Certifications, Examinations),
  // pre-built as pure data by lib/export/cv-log-sections.ts and passed in so
  // this import-free runtime stays free of the field-mapping logic.
  const logSections = props.logSections || []

  const grouped = {}
  for (const e of entries) {
    if (!grouped[e.category]) grouped[e.category] = []
    grouped[e.category].push(e)
  }
  const sections = CAT_ORDER.filter(c => grouped[c] && grouped[c].length > 0)
  const coverTitle = templateName || 'Portfolio export'
  const coverSubtitle = templateSubtitle || 'Professional portfolio summary generated by Clerkfolio.'

  const coverPage = h(Page, { size: 'A4', style: s.page, key: 'cover' },
    h(Text, { key: 'brand', style: s.brand }, 'CLERKFOLIO'),
    h(Text, { key: 'title', style: s.coverTitle }, coverTitle),
    h(View, { key: 'rule', style: [s.coverRule, { backgroundColor: templateAccent }] }),
    h(Text, { key: 'subtitle', style: s.coverSubtitle }, coverSubtitle),
    h(Text, { key: 'name', style: s.headerName }, userName),
    h(Text, { key: 'meta', style: s.headerSpecialty }, specialty + ' · Exported ' + exportedAt),
    h(View, { key: 'toc', style: { marginTop: 52 } },
      h(Text, { key: 't', style: s.catTitle }, 'Contents'),
      ...sections.map(cat => h(View, { key: cat, style: s.tocRow },
        h(Text, { key: 'label', style: s.tocText }, CAT_LABELS[cat]),
        h(Text, { key: 'count', style: s.tocText }, String(grouped[cat].length)),
      )),
      ...logSections.map(section => h(View, { key: 'log-' + section.key, style: s.tocRow },
        h(Text, { key: 'label', style: s.tocText }, section.title),
        h(Text, { key: 'count', style: s.tocText }, String(section.entries.length)),
      )),
    ),
  )

  const headerView = h(View, { key: 'h', style: s.header, fixed: true },
    h(View, { key: 'top', style: s.headerTop },
      h(Text, { key: 'b', style: s.brand }, 'CLERKFOLIO'),
      h(Text, { key: 'd', style: s.exportDate }, 'Exported ' + exportedAt),
    ),
    h(Text, { key: 'n', style: s.headerName }, userName),
    h(Text, { key: 'sp', style: s.headerSpecialty }, specialty + ' · ' + entries.length + ' ' + (entries.length === 1 ? 'entry' : 'entries')),
    h(View, { key: 'r', style: s.headerRule }),
  )

  function entryView(e) {
    const children = [
      h(View, { key: 'row', style: s.entryRow },
        h(Text, { key: 't', style: s.entryTitle }, e.title || ''),
        h(Text, { key: 'd', style: s.entryDate }, formatDate(e.date)),
      ),
      ...entryDetailRows(e),
    ]
    if (e.specialty_tags && e.specialty_tags.length > 0) {
      children.push(h(View, { key: 'tags', style: s.tags },
        ...e.specialty_tags.map(t => h(Text, { key: t, style: s.tag }, formatTag(t))),
      ))
    }
    if (e.notes) {
      const notesDetail = detail('notes', 'Notes', e.notes)
      if (notesDetail) children.push(notesDetail)
    }
    return h(View, { key: e.id, style: s.entry, wrap: false }, ...children)
  }

  function sectionView(cat) {
    return h(View, { key: cat },
      h(View, { key: 'h', style: s.catHeading },
        h(Text, { key: 't', style: s.catTitle }, CAT_LABELS[cat]),
        h(View, { key: 'r', style: s.catRule }),
      ),
      ...grouped[cat].map(entryView),
    )
  }

  function logEntryView(entry) {
    return h(View, { key: entry.id, style: s.entry, wrap: false },
      h(View, { key: 'row', style: s.entryRow },
        h(Text, { key: 't', style: s.entryTitle }, entry.title || ''),
        h(Text, { key: 'd', style: s.entryDate }, entry.dateLabel || ''),
      ),
      ...(entry.details || []).map((d, i) => detail('d' + i, d.label, d.value)).filter(Boolean),
    )
  }

  function logSectionView(section) {
    return h(View, { key: 'log-' + section.key },
      h(View, { key: 'h', style: s.catHeading },
        h(Text, { key: 't', style: s.catTitle }, section.title),
        h(View, { key: 'r', style: s.catRule }),
      ),
      ...section.entries.map(logEntryView),
    )
  }

  const mainPage = h(Page, { size: 'A4', style: s.page, key: 'main' },
    headerView,
    ...sections.map(sectionView),
    ...logSections.map(logSectionView),
    h(View, { key: 'f', style: s.footer, fixed: true },
      h(Text, { key: 'l', style: s.footerText }, 'clerkfolio.co.uk · Confidential'),
      h(Text, { key: 'p', style: s.pageNum, render: ({ pageNumber, totalPages }) => pageNumber + ' / ' + totalPages }),
    ),
  )

  return h(Document, {
    title: 'Clerkfolio Export - ' + specialty,
    author: userName,
  }, coverPage, mainPage)
}

async function renderPortfolioPdf(props) {
  await loadReactPdf()
  return renderToBuffer(buildDocument(props))
}

module.exports = { renderPortfolioPdf }
