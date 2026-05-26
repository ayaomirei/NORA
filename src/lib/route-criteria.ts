import {
  getAgeFromBirthDate,
  type BirthDateInput,
  type VenueTag,
} from '@/lib/age-policy'
import { haversineKm } from '@/lib/route-area-bounds'
import {
  filterPlacesForRoute,
  isVenueSuitableForRoute,
  isWorkVenue,
} from '@/lib/route-venue-fit'
import { placePreferenceWeight } from '@/lib/place-preferences-storage'
import type { MbtiId } from '@/lib/mbti'
import {
  vibeToPlannerMood,
  type RouteDayPeriod,
  type RouteVibe,
} from '@/lib/route-intents'
import type {
  PlannerMood,
  PlannerRecommendation,
} from '@/lib/planner-recommendations'
import type { MoodPreset } from '@/types/user'

export type RouteBuildProfile = {
  vibe: RouteVibe
  primaryMood: PlannerMood
  dayPeriod: RouteDayPeriod
  stopCount: number
  profileMood: PlannerMood | null
}

/** Тип впечатления — чтобы не собирать «два ужина подряд». */
export type ExperienceCategory =
  | 'cafe'
  | 'meal'
  | 'park'
  | 'culture'
  | 'market'
  | 'night'
  | 'wellness'
  | 'family'
  | 'other'

const VIBE_MOOD_WEIGHTS: Record<
  RouteVibe,
  Partial<Record<PlannerMood, number>>
> = {
  calm: { calm: 3, anxious: 2, tired: 1 },
  cozy: { tired: 3, calm: 2, anxious: 2 },
  romantic: { calm: 2, tired: 1, energy: 1 },
  family: { calm: 2, energy: 2, tired: 1 },
  social: { energy: 3, calm: 1 },
  active: { energy: 3, calm: 1 },
}

const VIBE_PREFERRED_TAGS: Record<RouteVibe, VenueTag[]> = {
  calm: ['park', 'cafe', 'wellness', 'culture'],
  cozy: ['cafe', 'wellness', 'park', 'culture'],
  romantic: ['cafe', 'culture', 'park', 'food'],
  family: ['park', 'family', 'culture', 'food'],
  social: ['market', 'culture', 'food', 'park', 'bar', 'nightlife'],
  active: ['park', 'market', 'culture', 'food', 'wellness'],
}

const VIBE_AVOID_TAGS: Record<RouteVibe, VenueTag[]> = {
  calm: ['nightlife', 'bar'],
  cozy: ['nightlife', 'bar'],
  romantic: ['nightlife', 'market'],
  family: ['nightlife', 'bar'],
  social: [],
  active: [],
}

const PERIOD_TAG_BOOST: Record<
  RouteDayPeriod,
  { boost: VenueTag[]; avoid: VenueTag[] }
> = {
  morning: {
    boost: ['cafe', 'park', 'wellness'],
    avoid: ['nightlife', 'bar'],
  },
  afternoon: { boost: ['park', 'culture', 'market'], avoid: ['nightlife'] },
  evening: { boost: ['culture', 'food', 'cafe'], avoid: [] },
  night: { boost: ['bar', 'nightlife', 'culture'], avoid: ['wellness'] },
}

const PROFILE_MOOD_NUDGE: Partial<
  Record<PlannerMood, { moodBoost: PlannerMood[] }>
> = {
  tired: { moodBoost: ['tired', 'calm', 'anxious'] },
  anxious: { moodBoost: ['anxious', 'calm', 'tired'] },
  energy: { moodBoost: ['energy'] },
  calm: { moodBoost: ['calm', 'anxious'] },
}

/** Желаемый «сценарий» дня: разные типы активности по слотам. */
const VIBE_DAY_ARC: Record<RouteVibe, ExperienceCategory[]> = {
  calm: ['cafe', 'park', 'culture', 'wellness', 'park'],
  cozy: ['cafe', 'park', 'wellness', 'culture', 'cafe'],
  romantic: ['cafe', 'culture', 'park', 'meal', 'culture'],
  family: ['park', 'culture', 'meal', 'family', 'park'],
  social: ['market', 'culture', 'cafe', 'meal', 'night'],
  active: ['park', 'market', 'culture', 'meal', 'park'],
}

const CATEGORY_LIMITS: Record<
  RouteVibe,
  Partial<Record<ExperienceCategory, number>>
> = {
  calm: { meal: 1, cafe: 1, night: 0 },
  cozy: { meal: 1, cafe: 1, night: 0 },
  romantic: { meal: 1, cafe: 1, night: 0 },
  family: { meal: 1, night: 0 },
  social: { meal: 1, cafe: 1, night: 1 },
  active: { meal: 1, cafe: 1, night: 0 },
}

export function normalizeProfileMood(
  mood: MoodPreset | undefined,
): PlannerMood | null {
  if (
    mood === 'energy' ||
    mood === 'tired' ||
    mood === 'anxious' ||
    mood === 'calm'
  ) {
    return mood
  }
  return null
}

export function buildRouteProfile(input: {
  vibe: RouteVibe
  dayPeriod: RouteDayPeriod
  stopCount: number
  profileMood?: MoodPreset
}): RouteBuildProfile {
  return {
    vibe: input.vibe,
    primaryMood: vibeToPlannerMood(input.vibe),
    dayPeriod: input.dayPeriod,
    stopCount: input.stopCount,
    profileMood: normalizeProfileMood(input.profileMood),
  }
}

function isTiredLike(profile: RouteBuildProfile) {
  return (
    profile.vibe === 'cozy' ||
    profile.profileMood === 'tired' ||
    profile.profileMood === 'anxious'
  )
}

export function effectiveStopCount(profile: RouteBuildProfile): number {
  const requested = Math.max(1, Math.min(5, Math.round(profile.stopCount)))

  if (isTiredLike(profile)) return Math.min(requested, 3)
  if (profile.vibe === 'romantic') return Math.max(2, Math.min(requested, 4))
  if (profile.vibe === 'social' || profile.vibe === 'active') {
    return Math.max(requested, 3)
  }
  return Math.max(requested, 2)
}

export function maxRouteDurationMin(profile: RouteBuildProfile): number {
  const stops = effectiveStopCount(profile)
  const tired = isTiredLike(profile)

  let base: number
  if (tired) base = 150 + stops * 40
  else if (profile.vibe === 'romantic') base = 180 + stops * 45
  else if (profile.vibe === 'calm') base = 200 + stops * 48
  else if (profile.vibe === 'family') base = 220 + stops * 50
  else if (profile.vibe === 'active') base = 260 + stops * 55
  else base = 240 + stops * 52

  if (profile.dayPeriod === 'morning') base = Math.min(base, tired ? 180 : 240)
  if (
    profile.dayPeriod === 'night' &&
    (profile.vibe === 'social' || profile.vibe === 'active')
  ) {
    base += 50
  }
  if (profile.dayPeriod === 'night' && tired) base = Math.min(base, 150)

  return base
}

export function maxLegKmForProfile(
  profile: RouteBuildProfile,
  areaKey: string,
): number {
  const tired = isTiredLike(profile)
  if (areaKey === 'countryside') return tired ? 10 : 14
  if (tired) return areaKey === 'center' ? 2.2 : 3
  if (profile.vibe === 'active' || profile.vibe === 'social') {
    return areaKey === 'center' ? 3.8 : 4.5
  }
  return areaKey === 'center' ? 3 : 3.8
}

export function primaryExperienceCategory(
  place: PlannerRecommendation,
): ExperienceCategory {
  const tags = place.venueTags ?? []
  const hay = `${place.title} ${place.place} ${place.address}`.toLowerCase()

  if (tags.includes('bar') || tags.includes('nightlife')) return 'night'
  if (tags.includes('market')) return 'market'
  if (tags.includes('park')) return 'park'
  if (tags.includes('wellness')) return 'wellness'
  if (tags.includes('family')) return 'family'
  if (tags.includes('culture')) return 'culture'
  if (tags.includes('cafe')) return 'cafe'
  if (tags.includes('food')) return 'meal'

  if (/кофе|coffee|кафе|cafe|чай\b|tea\b/.test(hay)) return 'cafe'
  if (/парк|park|сквер|бульвар|прогул|сад\b|фонтан/.test(hay)) return 'park'
  if (/базар|рынок|market|ош/.test(hay)) return 'market'
  if (/музей|галере|театр|филармон|culture|сквер/.test(hay)) return 'culture'
  if (/бар|club|паб|night/.test(hay)) return 'night'
  if (
    /ресторан|ужин|обед|кухн|чайхан|столов|food|restaurant|dinner|lunch|supara|navat|faiza/.test(
      hay,
    )
  ) {
    return 'meal'
  }

  return 'other'
}

function placePlannerMoods(place: PlannerRecommendation): PlannerMood[] {
  if (place.moods?.length) return place.moods
  const id = place.id
  if (id.startsWith('calm-')) return ['calm']
  if (id.startsWith('energy-')) return ['energy']
  if (id.startsWith('tired-')) return ['tired']
  if (id.startsWith('anxious-')) return ['anxious']
  return []
}

function durationMinutes(place: PlannerRecommendation): number {
  const h = place.duration.match(/(\d+)\s*(?:ч|h|саат|시간)\b/i)
  const m = place.duration.match(/(\d+)\s*(?:мин|min|мүн|분)\b/i)
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0)
}

function tagScore(tags: VenueTag[], list: VenueTag[], weight: number) {
  if (!tags.length) return 0
  return tags.filter((t) => list.includes(t)).length * weight
}

export function scorePlaceForRoute(
  place: PlannerRecommendation,
  profile: RouteBuildProfile,
  mbti?: MbtiId | '',
  userId?: string,
  context?: {
    slotCategory?: ExperienceCategory | null
    categoryCounts?: Map<ExperienceCategory, number>
    groupSize?: number
    groupMbti?: MbtiId[]
    recentStops?: Map<string, number>
    variationSeed?: string
  },
): number {
  let score = 0
  const tags = place.venueTags ?? []
  const moods = placePlannerMoods(place)
  const category = primaryExperienceCategory(place)

  const vibeWeights = VIBE_MOOD_WEIGHTS[profile.vibe]
  for (const m of moods) {
    score += vibeWeights[m] ?? 0
  }
  if (!moods.length) score += 1

  if (profile.profileMood) {
    const nudge = PROFILE_MOOD_NUDGE[profile.profileMood]
    if (nudge?.moodBoost.some((m) => moods.includes(m))) score += 2
  }

  score += tagScore(tags, VIBE_PREFERRED_TAGS[profile.vibe], 2)
  score -= tagScore(tags, VIBE_AVOID_TAGS[profile.vibe], 3)

  const period = PERIOD_TAG_BOOST[profile.dayPeriod]
  score += tagScore(tags, period.boost, 1.5)
  score -= tagScore(tags, period.avoid, 2)

  if (mbti && place.mbtiFit?.includes(mbti)) score += 3.5
  else if (mbti && place.mbtiFit?.length) score -= 1.5

  if (context?.groupMbti?.length && place.mbtiFit?.length) {
    const hits = context.groupMbti.filter((id) => place.mbtiFit?.includes(id)).length
    if (hits > 0) score += Math.min(2.4, hits * 0.8)
  }

  const groupSize = context?.groupSize ?? 1
  if (groupSize >= 3) {
    if (category === 'family' || category === 'park' || category === 'culture') score += 1.8
    if (category === 'wellness' && groupSize >= 5) score -= 1.2
  }
  if (groupSize <= 2 && category === 'family') score -= 0.8

  const seenRecently = context?.recentStops?.get(place.id) ?? 0
  if (seenRecently > 0) score -= Math.min(10, seenRecently * 3.2)

  if (context?.variationSeed) {
    const n = `${place.id}:${context.variationSeed}`
      .split('')
      .reduce((acc, ch) => (acc * 33 + ch.charCodeAt(0)) >>> 0, 5381)
    const jitter = ((n % 2000) / 1000 - 1) * 0.9
    score += jitter
  }

  score += placePreferenceWeight(userId, place.id) * 2

  const dur = durationMinutes(place)
  if (isTiredLike(profile)) {
    if (dur > 0 && dur <= 60) score += 1.5
    if (dur > 90) score -= 2
  } else if (profile.vibe === 'active' && dur >= 45) {
    score += 1
  }

  if (context?.slotCategory && category === context.slotCategory) {
    score += 6
  }

  const counts = context?.categoryCounts
  if (counts) {
    const used = counts.get(category) ?? 0
    if (used > 0) score -= 5 * used
    const limit = CATEGORY_LIMITS[profile.vibe][category]
    if (limit !== undefined && used >= limit) score -= 20
  }

  if (category === 'other') score -= 1

  if (isWorkVenue(place)) score -= 25
  if (profile.vibe === 'romantic' && category === 'meal') score += 0.5

  return score
}

export function rankPlacesForRoute(
  places: PlannerRecommendation[],
  profile: RouteBuildProfile,
  mbti?: MbtiId | '',
  userId?: string,
  birth: BirthDateInput = null,
  options?: {
    groupSize?: number
    groupMbti?: MbtiId[]
    recentStops?: Map<string, number>
    variationSeed?: string
  },
): PlannerRecommendation[] {
  const eligible = filterPlacesForRoute(places, profile, birth)
  return [...eligible]
    .map((place) => ({
      place,
      score: scorePlaceForRoute(place, profile, mbti, userId, {
        groupSize: options?.groupSize,
        groupMbti: options?.groupMbti,
        recentStops: options?.recentStops,
        variationSeed: options?.variationSeed,
      }),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ place }) => place)
}

function routeArc(profile: RouteBuildProfile): ExperienceCategory[] {
  const n = effectiveStopCount(profile)
  const morningArc: ExperienceCategory[] = [
    'cafe',
    'park',
    'wellness',
    'culture',
    'market',
  ]
  const socialNightArc: ExperienceCategory[] = [
    'culture',
    'market',
    'meal',
    'night',
    'cafe',
  ]
  if (profile.dayPeriod === 'morning') {
    return morningArc.slice(0, n)
  }
  if (profile.dayPeriod === 'night' && profile.vibe === 'social') {
    return socialNightArc.slice(0, n)
  }
  return VIBE_DAY_ARC[profile.vibe].slice(0, n)
}

function canAddCategory(
  profile: RouteBuildProfile,
  category: ExperienceCategory,
  counts: Map<ExperienceCategory, number>,
  birth: BirthDateInput = null,
): boolean {
  const age = getAgeFromBirthDate(birth)
  if (category === 'night') {
    if (age !== null && age < 18) return false
    if (profile.vibe !== 'social') return false
    if (profile.dayPeriod !== 'evening' && profile.dayPeriod !== 'night') return false
  }

  const limit = CATEGORY_LIMITS[profile.vibe][category]
  const used = counts.get(category) ?? 0
  if (limit !== undefined && used >= limit) return false
  if (category === 'meal' && used >= 1) return false
  if (category === 'cafe' && used >= 1 && profile.vibe !== 'social') return false
  if (category === 'night' && used >= 1) return false
  return true
}

function fitsDuration(
  stop: PlannerRecommendation,
  selected: PlannerRecommendation[],
  maxMin: number,
): boolean {
  const dur = durationMinutes(stop) || 40
  const total = selected.reduce((s, p) => s + (durationMinutes(p) || 40), 0)
  if (selected.length === 0 && dur > maxMin * 0.9) return false
  if (selected.length > 0 && total + dur > maxMin) return false
  return true
}

/**
 * Насыщенный маршрут: разные типы мест, близко по району, по всем критериям.
 */
export function buildSaturatedRoute(
  candidates: PlannerRecommendation[],
  profile: RouteBuildProfile,
  seed: { lng: number; lat: number },
  maxLegKm: number,
  mbti?: MbtiId | '',
  userId?: string,
  birth: BirthDateInput = null,
  options?: {
    groupSize?: number
    groupMbti?: MbtiId[]
    recentStops?: Map<string, number>
    variationSeed?: string
  },
): PlannerRecommendation[] {
  const pool = filterPlacesForRoute(candidates, profile, birth)
  const maxStops = effectiveStopCount(profile)
  const maxMin = maxRouteDurationMin(profile)
  const arc = routeArc(profile)
  const selected: PlannerRecommendation[] = []
  const usedIds = new Set<string>()
  const categoryCounts = new Map<ExperienceCategory, number>()

  let anchor = seed

  for (let slot = 0; slot < maxStops; slot++) {
    const slotCategory = arc[slot] ?? null
    let best: { place: PlannerRecommendation; score: number } | null = null

    for (const place of pool) {
      if (usedIds.has(place.id)) continue
      if (!isVenueSuitableForRoute(place, profile, birth)) continue

      const category = primaryExperienceCategory(place)
      if (!canAddCategory(profile, category, categoryCounts, birth)) continue
      if (!fitsDuration(place, selected, maxMin)) continue

      if (selected.length > 0) {
        const leg = haversineKm(place, selected[selected.length - 1]!)
        if (leg > maxLegKm) continue
      } else {
        const leg = haversineKm(place, anchor)
        if (leg > maxLegKm * 1.35) continue
      }

      const distPenalty =
        selected.length > 0
          ? haversineKm(place, selected[selected.length - 1]!) * 0.85
          : haversineKm(place, anchor) * 0.2

      const score =
        scorePlaceForRoute(place, profile, mbti, userId, {
          slotCategory,
          categoryCounts,
          groupSize: options?.groupSize,
          groupMbti: options?.groupMbti,
          recentStops: options?.recentStops,
          variationSeed: options?.variationSeed,
        }) - distPenalty

      if (!best || score > best.score) {
        best = { place, score }
      }
    }

    if (!best) {
      for (const place of pool) {
        if (usedIds.has(place.id)) continue
        if (!isVenueSuitableForRoute(place, profile, birth)) continue
        const category = primaryExperienceCategory(place)
        if (!canAddCategory(profile, category, categoryCounts, birth)) continue
        if ((categoryCounts.get(category) ?? 0) >= 2) continue
        if (!fitsDuration(place, selected, maxMin)) continue
        if (selected.length > 0) {
          const leg = haversineKm(place, selected[selected.length - 1]!)
          if (leg > maxLegKm * 1.15) continue
        }
        const score = scorePlaceForRoute(place, profile, mbti, userId, {
          categoryCounts,
          groupSize: options?.groupSize,
          groupMbti: options?.groupMbti,
          recentStops: options?.recentStops,
          variationSeed: options?.variationSeed,
        })
        if (!best || score > best.score) best = { place, score }
      }
    }

    if (!best) break

    selected.push(best.place)
    usedIds.add(best.place.id)
    const cat = primaryExperienceCategory(best.place)
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1)
    anchor = best.place
  }

  return selected
}

export function selectStopsForProfile(
  orderedCandidates: PlannerRecommendation[],
  profile: RouteBuildProfile,
): PlannerRecommendation[] {
  return buildSaturatedRoute(
    orderedCandidates,
    profile,
    orderedCandidates[0] ?? { lng: 0, lat: 0 },
    maxLegKmForProfile(profile, 'center'),
  )
}

export { durationMinutes as routeStopDurationMinutes }
