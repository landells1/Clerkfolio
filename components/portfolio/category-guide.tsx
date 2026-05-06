import type { Category } from '@/lib/types/portfolio'
import { CATEGORY_GUIDES } from '@/lib/category-guides'

export default function CategoryGuide({ category }: { category: Category }) {
  return (
    <details className="rounded-2xl border border-white/[0.08] bg-[#141416] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-[#F5F5F2]">
        What makes a strong {category.replace(/_/g, ' ')} entry
      </summary>
      <p className="mt-3 text-sm leading-6 text-[rgba(245,245,242,0.58)]">
        {CATEGORY_GUIDES[category]}
      </p>
    </details>
  )
}
