const RECENT_ROUTE_KEY = 'nora_recent_route_stops_v1'
const MAX_ENTRIES = 32
const RECENT_WINDOW_MS = 1000 * 60 * 60 * 36

type RecentRouteEntry = {
  at: number
  ids: string[]
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function readEntries(): RecentRouteEntry[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(RECENT_ROUTE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((row) => {
        if (!row || typeof row !== 'object') return null
        const at = Number((row as { at?: unknown }).at)
        const idsRaw = (row as { ids?: unknown }).ids
        if (!Number.isFinite(at) || !Array.isArray(idsRaw)) return null
        const ids = idsRaw.filter((id): id is string => typeof id === 'string')
        return ids.length ? { at, ids } : null
      })
      .filter((entry): entry is RecentRouteEntry => entry !== null)
  } catch {
    return []
  }
}

function writeEntries(entries: RecentRouteEntry[]) {
  if (!canUseStorage()) return
  try {
    localStorage.setItem(RECENT_ROUTE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    /* noop */
  }
}

export function rememberRecentRouteStops(ids: string[]) {
  const normalized = [...new Set(ids)].filter(Boolean)
  if (!normalized.length) return
  const now = Date.now()
  const kept = readEntries().filter((entry) => now - entry.at <= RECENT_WINDOW_MS)
  kept.unshift({ at: now, ids: normalized })
  writeEntries(kept)
}

export function getRecentRouteStopStats(): Map<string, number> {
  const now = Date.now()
  const stats = new Map<string, number>()
  for (const entry of readEntries()) {
    if (now - entry.at > RECENT_WINDOW_MS) continue
    for (const id of entry.ids) {
      stats.set(id, (stats.get(id) ?? 0) + 1)
    }
  }
  return stats
}
