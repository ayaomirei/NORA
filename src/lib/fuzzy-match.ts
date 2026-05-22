function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
}

/** Частые пары RU/Latin для поиска мест (Bar 12 vs «бар»). */
const SEARCH_ALIASES: [string, string][] = [
  ['бар', 'bar'],
  ['кафе', 'cafe'],
  ['клуб', 'club'],
  ['парк', 'park'],
  ['паб', 'pub'],
  ['рынок', 'market'],
  ['кофе', 'coffee'],
  ['ресторан', 'restaurant'],
  ['отель', 'hotel'],
  ['музей', 'museum'],
  ['театр', 'theater'],
  ['пицца', 'pizza'],
  ['фуд', 'food'],
  ['молл', 'mall'],
]

function expandQueryVariants(query: string): string[] {
  const base = normalize(query)
  if (!base) return []
  const out = new Set<string>([base])
  for (const [ru, en] of SEARCH_ALIASES) {
    if (base.includes(ru)) out.add(base.replaceAll(ru, en))
    if (base.includes(en)) out.add(base.replaceAll(en, ru))
  }
  return [...out]
}

function labelParts(label: string): string[] {
  const parts = new Set<string>()
  for (const chunk of label.split(/[,/]/)) {
    const trimmed = chunk.trim()
    if (trimmed) parts.add(trimmed)
    for (const word of trimmed.split(/\s+/)) {
      const w = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
      if (w.length >= 2) parts.add(w)
    }
  }
  return [...parts]
}

function scoreAgainstLabel(query: string, label: string): number {
  const variants = expandQueryVariants(query)
  const parts = labelParts(label)
  let best = 0
  for (const q of variants) {
    best = Math.max(best, fuzzyScore(q, label))
    for (const part of parts) {
      best = Math.max(best, fuzzyScore(q, part))
    }
  }
  return best
}

/** Расстояние Левенштейна. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = i
    for (let j = 1; j <= b.length; j++) {
      const val =
        a[i - 1] === b[j - 1]
          ? row[j - 1]
          : Math.min(row[j - 1], row[j], prev) + 1
      row[j - 1] = prev
      prev = val
    }
    row[b.length] = prev
  }
  return row[b.length]
}

/** Чем выше score, тем лучше совпадение (0 = нет). */
export function fuzzyScore(query: string, target: string): number {
  const q = normalize(query)
  const t = normalize(target)
  if (!q) return 1
  if (!t) return 0
  if (t === q) return 100
  if (t.startsWith(q)) return 90 - (t.length - q.length)
  if (t.includes(q)) return 75 - (t.length - q.length)
  const dist = levenshtein(q, t)
  const maxLen = Math.max(q.length, t.length)
  const similarity = 1 - dist / maxLen
  if (similarity < 0.45) return 0
  return Math.round(similarity * 70)
}

export function fuzzySearch<T>(
  items: T[],
  query: string,
  getLabel: (item: T) => string,
  options?: { limit?: number; minScore?: number },
): T[] {
  const limit = options?.limit ?? 8
  const minScore = options?.minScore ?? 28
  const q = query.trim()
  if (!q) return items.slice(0, limit)

  return items
    .map((item) => ({
      item,
      score: scoreAgainstLabel(q, getLabel(item)),
    }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item)
}
