import { redirect } from 'next/navigation'

// Retired (F-027): share-link management is now consolidated onto the single
// canonical surface — Import & export -> Share, which carries the full action
// set (Copy / Preview / Renew / Revoke). This route used to diverge (Preview but
// no Renew). Kept as a permanent redirect so old bookmarks, in-app links and the
// weekly-digest email still resolve to the one share manager.
export default function SharedLinksPage() {
  redirect('/export?tab=share')
}
