import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

export type PlaceCoordRecord = {
  lng: number
  lat: number
  query: string
  geocodedAt: string
}

export type PlaceCoordsFile = Record<string, PlaceCoordRecord>

/** cwd на Vercel — корень репо; локально — то же при запуске из корня. */
const CACHE_PATH =
  process.env.PLACE_COORDS_PATH ??
  path.join(process.cwd(), 'server/data/place-coords.json')

/** Запись с тем же адресом запроса (другой id). */
export function findPlaceCoordByQuery(
  cache: PlaceCoordsFile,
  query: string,
): PlaceCoordRecord | undefined {
  return Object.values(cache).find((r) => r.query === query)
}

/** Уже есть координаты в кэше (и query в manifest не менялся). */
export function hasValidPlaceCoord(
  cache: PlaceCoordsFile,
  id: string,
  query?: string,
): boolean {
  const hit = cache[id]
  if (!hit || !Number.isFinite(hit.lng) || !Number.isFinite(hit.lat)) {
    return false
  }
  if (query !== undefined && hit.query !== query) {
    return false
  }
  return true
}

export async function readPlaceCoordsCache(): Promise<PlaceCoordsFile> {
  try {
    const raw = await readFile(CACHE_PATH, 'utf8')
    return JSON.parse(raw) as PlaceCoordsFile
  } catch {
    return {}
  }
}

export async function writePlaceCoordsCache(data: PlaceCoordsFile) {
  await mkdir(path.dirname(CACHE_PATH), { recursive: true })
  await writeFile(CACHE_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

export async function upsertPlaceCoord(
  id: string,
  record: PlaceCoordRecord,
): Promise<PlaceCoordsFile> {
  const cache = await readPlaceCoordsCache()
  cache[id] = record
  await writePlaceCoordsCache(cache)
  return cache
}
