import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { PortfolioEntry } from '@/lib/types/portfolio'

// TEMP: stripped to bare minimum while bisecting React #31 on prod.
const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, padding: 48 },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 12 },
  row: { marginBottom: 6 },
})

export type ExportDocProps = {
  entries: PortfolioEntry[]
  userName: string
  specialty: string
  exportedAt: string
  templateName?: string
  templateSubtitle?: string
  templateAccent?: string
}

export default function PortfolioPDF({ entries, userName, specialty, exportedAt }: ExportDocProps) {
  return (
    <Document title={`Clerkfolio Export - ${specialty}`} author={userName}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{userName}</Text>
        <Text style={s.row}>Specialty: {specialty}</Text>
        <Text style={s.row}>Exported: {exportedAt}</Text>
        <View style={{ marginTop: 12 }}>
          {entries.map(e => (
            <Text key={e.id} style={s.row}>{e.title} - {e.date}</Text>
          ))}
        </View>
      </Page>
    </Document>
  )
}
