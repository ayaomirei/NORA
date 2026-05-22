import { fetchVenueCatalog, type VenueCatalogItem } from '@/api/map'
import { isApiEnabled } from '@/api/config'
import type { Locale } from '@/i18n/config'
import { localizePlannerPool } from '@/i18n/planner-text'
import {
  filterRecommendationsByAge,
  type BirthDateInput,
  type VenueTag,
} from '@/lib/age-policy'
import { fuzzySearch } from '@/lib/fuzzy-match'
import { getPlannerEvents } from '@/lib/planner-events'
import {
  getDislikedPlaceIds,
  placePreferenceWeight,
} from '@/lib/place-preferences-storage'
import {
  findPlannerRecommendation,
  getRecommendationsForMoodAndBudget,
  PLANNER_BY_MOOD,
  type PlannerMood,
  type PlannerRecommendation,
} from '@/lib/planner-recommendations'
import { normalizeBudgetIndex } from '@/lib/daily-budget'
import type { MbtiId } from '@/lib/mbti'
import { withPlaceCoordinates } from '@/lib/place-coordinates'

const VENUE_TAG_LABELS: Partial<Record<VenueTag, string>> = {
  bar: 'бар',
  cafe: 'кафе',
  club: 'клуб',
  park: 'парк',
  food: 'еда ресторан',
  culture: 'культура музей',
  market: 'рынок',
  family: 'семья дети',
  wellness: 'спорт wellness',
  nightlife: 'ночь клуб бар',
}

function placeSearchLabel(p: PlannerRecommendation): string {
  const tagText = (p.venueTags ?? [])
    .flatMap((tag) => [tag, VENUE_TAG_LABELS[tag] ?? ''])
    .join(' ')
  return `${p.title} ${p.place} ${p.address} ${p.badge ?? ''} ${tagText}`.trim()
}

let catalog: PlannerRecommendation[] | null = null
let loadPromise: Promise<PlannerRecommendation[]> | null = null

function toRecommendation(item: VenueCatalogItem): PlannerRecommendation {
  return {
    id: item.id,
    title: item.title,
    place: item.place,
    address: item.address,
    lng: item.lng,
    lat: item.lat,
    duration: item.duration,
    budgetTier: item.budgetTier,
    badge: item.badge,
    venueTags: item.venueTags as VenueTag[],
    moods: item.moods,
    ...(item.minAge !== undefined ? { minAge: item.minAge } : {}),
  }
}

export async function loadVenueCatalog(): Promise<PlannerRecommendation[]> {
  if (!isApiEnabled()) {
    catalog = []
    return catalog
  }
  if (catalog) return catalog
  if (loadPromise) return loadPromise
  loadPromise = fetchVenueCatalog()
    .then((items) => {
      catalog = items?.map(toRecommendation) ?? []
      return catalog
    })
    .catch(() => {
      catalog = []
      return catalog
    })
  return loadPromise
}

export function getVenueCatalog(): PlannerRecommendation[] {
  return catalog ?? []
}

export function invalidateVenueCatalog() {
  catalog = null
  loadPromise = null
}

function allPlannerPlaces(locale: Locale): PlannerRecommendation[] {
  const pools = localizePlannerPool(PLANNER_BY_MOOD, locale)
  const moods = Object.keys(pools) as PlannerMood[]
  const events = moods.flatMap((m) => getPlannerEvents(m, locale))
  const base = moods.flatMap((m) => pools[m])
  const seen = new Set<string>()
  return [...base, ...events].filter((p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
}

/** Все места для поиска: планер + популярные POI. */
export function getAllSearchablePlaces(locale: Locale): PlannerRecommendation[] {
  const seen = new Set<string>()
  const out: PlannerRecommendation[] = []
  for (const p of [...allPlannerPlaces(locale), ...getVenueCatalog()]) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    out.push(withPlaceCoordinates(p))
  }
  return out
}

export function searchPlaces(
  query: string,
  locale: Locale,
  options?: { limit?: number },
): PlannerRecommendation[] {
  const pool = getAllSearchablePlaces(locale)
  const q = query.trim()
  if (!q) {
    return pool.slice(0, options?.limit ?? 8)
  }
  return fuzzySearch(pool, q, placeSearchLabel, {
    limit: options?.limit ?? 12,
    minScore: 22,
  }).map(withPlaceCoordinates)
}

export function findRecommendation(
  id: string,
  locale: Locale = 'ru',
): PlannerRecommendation | null {
  const planner = findPlannerRecommendation(id, locale)
  if (planner) return planner
  const hit = getVenueCatalog().find((p) => p.id === id)
  return hit ? withPlaceCoordinates(hit) : null
}

/** Популярные места для подбора маршрута и планера. */
/** Рекомендации планера + популярные POI (до 6 карточек). */
export function getCombinedRecommendationsForMoodAndBudget(
  mood: PlannerMood,
  budgetIndex: number,
  locale: Locale = 'ru',
  birth: BirthDateInput = null,
  userId?: string,
  mbti?: MbtiId | '',
): PlannerRecommendation[] {
  const planner = getRecommendationsForMoodAndBudget(
    mood,
    budgetIndex,
    locale,
    birth,
    userId,
    mbti,
  )
  const popular = getPopularForMoodAndBudget(
    mood,
    budgetIndex,
    locale,
    birth,
    userId,
    mbti,
  )
  const seen = new Set<string>()
  const merged: PlannerRecommendation[] = []
  for (const p of [...planner, ...popular]) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    merged.push(withPlaceCoordinates(p))
  }
  return merged.slice(0, 6)
}

export function getPopularForMoodAndBudget(
  mood: PlannerMood,
  budgetIndex: number,
  locale: Locale = 'ru',
  birth: BirthDateInput = null,
  userId?: string,
  mbti?: MbtiId | '',
): PlannerRecommendation[] {
  const budget = normalizeBudgetIndex(budgetIndex)
  const disliked = userId ? new Set(getDislikedPlaceIds(userId)) : new Set<string>()

  const pool = getVenueCatalog().filter((p) => {
    if (p.moods?.length && !p.moods.includes(mood)) return false
    return p.budgetTier <= budget && !disliked.has(p.id)
  })

  return filterRecommendationsByAge(pool, birth)
    .sort(
      (a, b) =>
        placePreferenceWeight(userId, b.id) - placePreferenceWeight(userId, a.id),
    )
    .map(withPlaceCoordinates)
}
