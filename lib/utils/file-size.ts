// One file-size format everywhere (entry pages, the attach picker, the Files
// tab, the storage meter). Base-ten units, matching how storage quota is
// counted (lib/entitlements/limits.ts: 1 MB = 1,000,000 bytes) - the entry
// page used 1024-based units while the Files tab used 1000-based, so the same
// PNG read 1.4 KB in one place and 1.5 KB in the other.

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes < 1000) return `${Math.round(bytes)} B`
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} KB`
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`
}

/**
 * Storage used, given in MB (as the entitlement RPC reports it). Small totals
 * are shown in KB so a few kilobytes never reads "0.0 MB".
 */
export function formatStorageUsed(mb: number): string {
  if (!Number.isFinite(mb) || mb <= 0) return '0 MB'
  if (mb < 1) return formatFileSize(mb * 1_000_000)
  if (mb < 100) return `${mb.toFixed(1)} MB`
  return `${Math.round(mb)} MB`
}
