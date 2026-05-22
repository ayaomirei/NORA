/**
 * Ручные правки координат (проверены по 2GIS до исчерпания квоты).
 * Usage: npx tsx scripts/apply-coord-corrections.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_GEOCODE_MANIFEST } from '../src/data/geocode-manifest.js'
import type { PlaceCoordsFile } from '../src/lib/place-coords-cache.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_PATH = path.join(__dirname, '../data/place-coords.json')

/** lng, lat — проверенные точки */
const CORRECTIONS: Record<string, { lng: number; lat: number }> = {
  'calm-2': { lng: 74.607609, lat: 42.877162 },
  'calm-4': { lng: 74.603667, lat: 42.875426 },
  'energy-2': { lng: 74.603667, lat: 42.875426 },
  'energy-3': { lng: 74.60316, lat: 42.82432 },
  'tired-2': { lng: 74.60657, lat: 42.86905 },
  'anxious-1': { lng: 74.59928, lat: 42.87996 },
  'anxious-3': { lng: 74.59047, lat: 42.85899 },
  'event-calm-1': { lng: 74.52376, lat: 42.63765 },
  'event-energy-1': { lng: 74.59624, lat: 42.80645 },
  'poi-park-panfilov': { lng: 74.59928, lat: 42.87996 },
  'poi-park-pobedy': { lng: 74.60316, lat: 42.82432 },
  'poi-park-dubovy': { lng: 74.60761, lat: 42.87716 },
  'poi-park-ata-turk': { lng: 74.59575, lat: 42.83953 },
  'poi-park-botanic': { lng: 74.59047, lat: 42.85899 },
  'poi-park-molodezhny': { lng: 74.57487, lat: 42.88583 },
  'poi-park-ak-keme': { lng: 74.5825, lat: 42.83875 },
  'poi-bulvar-erkendik': { lng: 74.60657, lat: 42.86905 },
  'poi-skver-toktogul': { lng: 74.57461, lat: 42.87374 },
  'poi-ploshchad-ala-too': { lng: 74.603667, lat: 42.875426 },
  'poi-park-yuzhny': { lng: 74.63346, lat: 42.87223 },
  'poi-zoo': { lng: 74.55124, lat: 42.81456 },
  'poi-hotel-hyatt': { lng: 74.60209, lat: 42.87256 },
  'poi-hotel-orion': { lng: 74.58617, lat: 42.889 },
  'poi-hotel-ambassador': { lng: 74.64229, lat: 42.90489 },
  'poi-hotel-ak-keme': { lng: 74.5825, lat: 42.83875 },
  'poi-cafe-casa': { lng: 74.56127, lat: 42.81891 },
  'poi-rest-navigator': { lng: 74.58847, lat: 42.87488 },
  'poi-rest-navat': { lng: 74.61328, lat: 42.87526 },
  'poi-rest-old-bukhara': { lng: 74.61752, lat: 42.87793 },
  'poi-rest-ethno-complex': { lng: 74.61808, lat: 42.85467 },
  'poi-cafe-gap': { lng: 74.58721, lat: 42.87628 },
  'poi-cafe-teplo': { lng: 74.6069, lat: 42.84325 },
  'poi-bar-save-the-ales': { lng: 74.58323, lat: 42.87103 },
  'poi-bar-ipub': { lng: 74.57652, lat: 42.87587 },
  'poi-bar-metro-pub': { lng: 74.60019, lat: 42.8682 },
  'poi-bar-pinta': { lng: 74.59422, lat: 42.8793 },
  'poi-bar-garage': { lng: 74.6006, lat: 42.87507 },
  'poi-bar-klub-kvartira': { lng: 74.57652, lat: 42.87587 },
  'poi-bar-promzona': { lng: 74.61194, lat: 42.90383 },
  'poi-mall-bishkek-park': { lng: 74.59017, lat: 42.87461 },
  'poi-mall-asia-mall': { lng: 74.585, lat: 42.85558 },
  'poi-mall-tsum': { lng: 74.61453, lat: 42.87662 },
  'poi-mall-dordoi-plaza': { lng: 74.61802, lat: 42.87421 },
  'poi-mall-globus': { lng: 74.59017, lat: 42.87461 },
  'poi-mall-vesna': { lng: 74.5769, lat: 42.87379 },
  'poi-market-dordoi': { lng: 74.62151, lat: 42.93837 },
  'poi-market-ortosai': { lng: 74.59624, lat: 42.80645 },
  'poi-culture-philharmonic': { lng: 74.58752, lat: 42.8781 },
  'poi-culture-opera': { lng: 74.6125, lat: 42.87804 },
  'poi-culture-history-museum': { lng: 74.60363, lat: 42.87774 },
  'poi-culture-art-museum': { lng: 74.61074, lat: 42.87881 },
  'poi-culture-russian-theatre': { lng: 74.6027, lat: 42.87896 },
  'poi-culture-manas': { lng: 74.6366, lat: 42.8552 },
  'poi-fun-aquapark': { lng: 74.5825, lat: 42.83875 },
  'poi-fun-ice-palace': { lng: 74.62651, lat: 42.8883 },
  'poi-fun-spartak-stadium': { lng: 74.59797, lat: 42.88005 },
  'poi-fun-dordoi-ethno': { lng: 74.52376, lat: 42.63765 },

  /* Новые POI (ручная привязка в Бишкеке; уточнить через 2GIS при наличии ключа) */
  'poi-park-family': { lng: 74.592, lat: 42.862 },
  'poi-park-sverdlov': { lng: 74.60282, lat: 42.82507 },
  'poi-park-alamedin': { lng: 74.6069, lat: 42.84325 },
  'poi-park-toktogul': { lng: 74.60181, lat: 42.87246 },
  'poi-bulvar-kok-jar': { lng: 74.612, lat: 42.808 },
  'poi-bulvar-moskovskaya': { lng: 74.60507, lat: 42.86943 },
  'poi-bulvar-molodezhny': { lng: 74.55124, lat: 42.81456 },
  'poi-hotel-futuro': { lng: 74.65443, lat: 42.87642 },
  'poi-hotel-garden': { lng: 74.55963, lat: 42.83008 },
  'poi-hotel-king': { lng: 74.62156, lat: 42.86486 },
  'poi-hotel-ala-too': { lng: 74.5606, lat: 42.8832 },
  'poi-hotel-golden-dragon': { lng: 74.61291, lat: 42.8512 },
  'poi-hotel-kapital': { lng: 74.61453, lat: 42.87662 },
  'poi-hotel-umai': { lng: 74.60093, lat: 42.89449 },
  'poi-hotel-jannat': { lng: 74.62411, lat: 42.85132 },
  'poi-hotel-tehran': { lng: 74.60209, lat: 42.87256 },
  'poi-hotel-city': { lng: 74.5898, lat: 42.87264 },
  'poi-hotel-pinberry': { lng: 74.594137, lat: 42.875351 },
  'poi-guest-nomad': { lng: 74.568, lat: 42.884 },
  'poi-guest-apple': { lng: 74.565128, lat: 42.8859944 },
  'poi-guest-center': { lng: 74.5898, lat: 42.87264 },
  'poi-guest-art': { lng: 74.57652, lat: 42.87587 },
  'poi-guest-sakura': { lng: 74.61453, lat: 42.87662 },
  'poi-guest-bishkek-house': { lng: 74.57109, lat: 42.8789 },
  'poi-cafe-sierra-chui': { lng: 74.5885652, lat: 42.8745766 },
  'poi-cafe-kapuchino': { lng: 74.58721, lat: 42.87628 },
  'poi-cafe-ololo': { lng: 74.594137, lat: 42.875351 },
  'poi-cafe-latte': { lng: 74.62103, lat: 42.87559 },
  'poi-cafe-coffee-island': { lng: 74.62192, lat: 42.87555 },
  'poi-specialty-adriano': { lng: 74.62192, lat: 42.87555 },
  'poi-specialty-bon': { lng: 74.594137, lat: 42.875351 },
  'poi-specialty-twelve-horses': { lng: 74.594137, lat: 42.875351 },
  'poi-specialty-q': { lng: 74.565128, lat: 42.8859944 },
  'poi-specialty-bublik': { lng: 74.594137, lat: 42.875351 },
  'poi-specialty-sens': { lng: 74.594137, lat: 42.875351 },
  'poi-specialty-wilton': { lng: 74.594137, lat: 42.875351 },
  'poi-specialty-corretto': { lng: 74.59952, lat: 42.87572 },
  'poi-specialty-craft': { lng: 74.591213, lat: 42.874154 },
  'poi-bar-twelve': { lng: 74.57652, lat: 42.87587 },
  'poi-bar-monkey': { lng: 74.57652, lat: 42.87587 },
  'poi-bar-timeout': { lng: 74.57652, lat: 42.87587 },
  'poi-bar-old-school': { lng: 74.57652, lat: 42.87587 },
  'poi-bar-buddha': { lng: 74.58323, lat: 42.87103 },
  'poi-club-studio9': { lng: 74.61208, lat: 42.83569 },
  'poi-club-gagarin': { lng: 74.57652, lat: 42.87587 },
  'poi-club-retro': { lng: 74.57652, lat: 42.87587 },
  'poi-club-platinum': { lng: 74.58323, lat: 42.87103 },
  'poi-club-rubicon': { lng: 74.57652, lat: 42.87587 },
  'poi-club-zhara': { lng: 74.57652, lat: 42.87587 },
  'poi-club-eshak': { lng: 74.61208, lat: 42.83569 },
  'poi-mall-vefa': { lng: 74.60959, lat: 42.85751 },
  'poi-mall-frunze': { lng: 74.65471, lat: 42.88128 },
  'poi-mall-umai': { lng: 74.60093, lat: 42.89449 },
  'poi-mall-12-mega': { lng: 74.58847, lat: 42.87488 },
  'poi-park-borboruk': { lng: 74.60543, lat: 42.8782 },
  'poi-fun-circus': { lng: 74.61164, lat: 42.88017 },
  'poi-fun-happy-city': { lng: 74.59501, lat: 42.87084 },
  'poi-fun-kidburg': { lng: 74.61328, lat: 42.87526 },
  'poi-fun-galaxy': { lng: 74.61328, lat: 42.87526 },
  'poi-fun-bowling-strike': { lng: 74.59017, lat: 42.87461 },
  'poi-fun-karting': { lng: 74.59017, lat: 42.87461 },
  'poi-fun-cinema-olimp': { lng: 74.61328, lat: 42.87526 },
}

const CENTER = { lng: 74.553811, lat: 42.873155 }
const BAD708 = { lng: 74.708939, lat: 42.809652 }

function isBad(coord: { lng: number; lat: number }) {
  if (
    Math.abs(coord.lng - CENTER.lng) < 0.0003 &&
    Math.abs(coord.lat - CENTER.lat) < 0.0003
  ) {
    return true
  }
  if (Math.abs(coord.lng - BAD708.lng) < 0.0003) return true
  return false
}

const cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as PlaceCoordsFile
const manifestById = new Map(ALL_GEOCODE_MANIFEST.map((e) => [e.id, e]))
let fixed = 0

for (const [id, patch] of Object.entries(CORRECTIONS)) {
  const entry = manifestById.get(id)
  const prev = cache[id]
  cache[id] = {
    lng: patch.lng,
    lat: patch.lat,
    query: entry?.query ?? prev?.query ?? id,
    geocodedAt: new Date().toISOString(),
  }
  fixed++
}

for (const [id, rec] of Object.entries(cache)) {
  if (isBad(rec) && !CORRECTIONS[id]) {
    console.warn('Still bad (no correction):', id, rec.query)
  }
}

writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
console.log(`Applied ${fixed} corrections to ${CACHE_PATH}`)
