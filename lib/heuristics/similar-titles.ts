export function levenshtein(a: string, b: string) {
  const left = a.toLowerCase()
  const right = b.toLowerCase()
  const dp = Array.from({ length: left.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= right.length; j++) dp[0][j] = j
  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
      )
    }
  }
  return dp[left.length][right.length]
}

export function titleSimilarity(a: string, b: string) {
  const longest = Math.max(a.length, b.length)
  if (longest === 0) return 1
  return 1 - levenshtein(a.trim(), b.trim()) / longest
}
