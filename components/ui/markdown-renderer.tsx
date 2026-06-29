function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderInline(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

export default function MarkdownRenderer({ value }: { value: string }) {
  const html = value
    .split(/\n{2,}/)
    .map(paragraph => `<p>${renderInline(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('')

  return (
    <div
      className="prose prose-invert max-w-none text-sm leading-relaxed text-[var(--text-secondary)] prose-p:my-3 prose-strong:text-[var(--text-primary)]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
