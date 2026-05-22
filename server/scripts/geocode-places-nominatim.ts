/**
 * Заполнение place-coords.json через Nominatim (если нет DGIS_API_KEY).
 * Usage: cd server && npx tsx scripts/geocode-places-nominatim.ts
 */
import { ALL_GEOCODE_MANIFEST } from '../src/data/geocode-manifest.js'
import {
  hasValidPlaceCoord,
  readPlaceCoordsCache,
  writePlaceCoordsCache,
  type PlaceCoordRecord,
} from '../src/lib/place-coords-cache.js'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const UA = 'NORA-Geocode/1.0 (local dev; contact: nora-app)'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Ориентировочная рамка Бишкека для Nominatim. */
const BISHKEK_VIEWBOX = '74.45,42.75,74.75,42.95'

async function nominatimOnce(q: string): Promise<{ lng: number; lat: number } | null> {
  const url = new URL(NOMINATIM)
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'kg')
  url.searchParams.set('viewbox', BISHKEK_VIEWBOX)
  url.searchParams.set('bounded', '1')

  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) return null
  const data = (await res.json()) as Array<{ lon?: string; lat?: string }>
  const hit = data[0]
  if (!hit?.lon || !hit?.lat) return null
  const lng = Number(hit.lon)
  const lat = Number(hit.lat)
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  return { lng, lat }
}

function queryVariants(query: string): string[] {
  const stripped = query
    .replace(/^Бишкек,\s*/i, '')
    .replace(/^Кыргызстан,\s*/i, '')
    .trim()
  const parts = stripped.split(/,\s*/).map((p) => p.trim()).filter(Boolean)
  const variants = [query, stripped, `${stripped}, Bishkek, Kyrgyzstan`]
  if (parts.length >= 2) {
    variants.push(`${parts[0]}, Bishkek`)
    variants.push(`${parts[0]}, ${parts.slice(1).join(', ')}, Bishkek`)
  } else if (parts[0]) {
    variants.push(`${parts[0]}, Bishkek, Kyrgyzstan`)
  }
  return [...new Set(variants)]
}

async function nominatimGeocode(query: string): Promise<{ lng: number; lat: number } | null> {
  for (const q of queryVariants(query)) {
    const hit = await nominatimOnce(q)
    if (hit) return hit
    await sleep(400)
  }
  return null
}

async function main() {
  const force = process.argv.includes('--force')
  const cache = await readPlaceCoordsCache()
  let ok = 0
  let miss = 0
  let skipped = 0

  for (const entry of ALL_GEOCODE_MANIFEST) {
    process.stdout.write(`${entry.id} … `)
    if (!force && hasValidPlaceCoord(cache, entry.id, entry.query)) {
      console.log('cached')
      skipped++
      continue
    }
    try {
      const coord = await nominatimGeocode(entry.query)
      if (!coord) {
        console.log('miss')
        miss++
      } else {
        cache[entry.id] = {
          lng: coord.lng,
          lat: coord.lat,
          query: entry.query,
          geocodedAt: new Date().toISOString(),
        }
        console.log(`${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`)
        ok++
      }
    } catch (e) {
      console.log('error', e)
      miss++
    }
    await sleep(1100)
  }

  await writePlaceCoordsCache(cache)
  console.log(
    `\nDone: ${ok} geocoded, ${skipped} skipped, ${miss} miss, ${Object.keys(cache).length} total`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
