// Staged-file de-duplication.
//
// BUG-007: dropping files onto the evidence dropzone staged some of them twice
// (and uploaded duplicate storage objects). The drop event fired on the
// EvidenceUpload zone AND bubbled to the surrounding form, whose add handler
// appended the same files again without de-duplication. Two files are treated
// as the same staged item when their name and byte size match.

type StagedFile = Pick<File, 'name' | 'size'>

function fileKey(file: StagedFile): string {
  return `${file.name}::${file.size}`
}

/** Append `incoming` to `existing`, skipping files already staged (by name+size). */
export function mergeUniqueFiles<T extends StagedFile>(existing: T[], incoming: T[]): T[] {
  const seen = new Set(existing.map(fileKey))
  const merged = [...existing]
  for (const file of incoming) {
    const key = fileKey(file)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(file)
  }
  return merged
}
