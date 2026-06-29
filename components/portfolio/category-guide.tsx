import { CATEGORIES, type Category } from '@/lib/types/portfolio'
import { CATEGORY_GUIDES } from '@/lib/category-guides'

export default function CategoryGuide({ category }: { category: Category }) {
  const label = CATEGORIES.find(c => c.value === category)?.short ?? category
  return (
    <details className="rounded-2xl border border-white/[0.08] bg-[var(--bg-surface)] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--text-primary)]">
        What makes a strong {label.toLowerCase()} entry
      </summary>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {CATEGORY_GUIDES[category]}
      </p>
    </details>
  )
}
