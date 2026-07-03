import { redirect } from 'next/navigation'

// Retired: the side-by-side specialty comparison was removed. With ST1/CT1
// specialties scoring on largely disjoint criteria, a shared-dimension table
// was never a meaningful comparison. Kept as a permanent redirect so old
// bookmarks and in-app links resolve to the specialties list.
export default function SpecialtyComparePage() {
  redirect('/specialties')
}
