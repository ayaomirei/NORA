import type { Locale } from '@/i18n/config'
import { normalizeBudgetIndex } from '@/lib/daily-budget'
import type { MbtiId } from '@/lib/mbti'
import { localizePlannerPool } from '@/i18n/planner-text'
import { filterRecommendationsByAge, type BirthDateInput } from '@/lib/age-policy'
import { getDislikedPlaceIds } from '@/lib/place-preferences-storage'
import {
  buildRouteProfile,
  buildSaturatedRoute,
  effectiveStopCount,
  maxLegKmForProfile,
  rankPlacesForRoute,
} from '@/lib/route-criteria'
import {
  clampStopCount,
  filterByRouteArea,
  isRouteAreaKey,
  isRouteDayPeriod,
  isRouteVibe,
  legacyMoodToVibe,
  routeAreaLabel,
  routeAreaSeed,
  vibeToPlannerMood,
  type RouteAreaKey,
  type RouteDayPeriod,
  type RouteStopCount,
  type RouteVibe,
} from '@/lib/route-intents'
import {
  getRecommendationsForMoodAndBudget,
  normalizePlannerMood,
  PLANNER_BY_MOOD,
  type PlannerMood,
  type PlannerRecommendation,
} from '@/lib/planner-recommendations'
import { optimizeWalkingOrder } from '@/lib/optimize-route-order'
import { withPlaceCoordinates } from '@/lib/place-coordinates'
import { getPopularForMoodAndBudget } from '@/lib/venue-catalog'
import { getNoraUserProfileSync } from '@/lib/nora-users'
import {
  getRecentRouteStopStats,
  rememberRecentRouteStops,
} from '@/lib/recent-route-memory'
import type { MoodPreset } from '@/types/user'

/** @deprecated используйте dayPeriod + stopCount */
export type RouteTimeSlot = 'morning' | 'afternoon' | 'evening' | 'full'

export type DayRouteInput = {
  vibe: RouteVibe
  /** Бюджет для подбора (для группы — effective/min) */
  budgetIdx: number
  dayPeriod: RouteDayPeriod
  stopCount: number
  areaKey: RouteAreaKey
  areaCustom: string
  mbti?: MbtiId | ''
  birthDate?: BirthDateInput
  userId?: string
  /** Учитывать дизлайки всех участников */
  dislikeUserIds?: string[]
  groupSize?: number
  participantIds?: string[]
  groupBudgetAvg?: number
  organizerBudgetIdx?: number
  /** Настроение из профиля / карты — уточняет «устал» vs «энергия» */
  profileMood?: MoodPreset
  /** Пользовательское название маршрута */
  name?: string
}

export type DayRoute = {
  id: string
  /** Название, заданное пользователем */
  name?: string
  vibe: RouteVibe
  /** Для подбора мест и обратной совместимости */
  mood: PlannerMood
  dayPeriod: RouteDayPeriod
  stopCount: RouteStopCount
  areaKey: RouteAreaKey
  area: string
  /** @deprecated */
  timeSlot?: RouteTimeSlot
  stops: PlannerRecommendation[]
  totalDurationMin: number
  groupSize?: number
  participantIds?: string[]
  groupBudgetAvg?: number
  groupBudgetEffective?: number
  organizerBudgetIdx?: number
}

export function parseDurationMinutes(s: string): number {
  const h = s.match(/(\d+)\s*(?:ч|h|саат|시간)\b/i)
  const m = s.match(/(\d+)\s*(?:мин|min|мүн|분)\b/i)
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0)
}

function gatherMoodPools(
  mood: PlannerMood,
  profile: ReturnType<typeof buildRouteProfile>,
  locale: Locale,
  budgetIdx: number,
  birthDate: BirthDateInput,
  userId: string | undefined,
  mbti: MbtiId | '' | undefined,
): PlannerRecommendation[] {
  const tiredLike =
    profile.vibe === 'cozy' ||
    profile.profileMood === 'tired' ||
    profile.profileMood === 'anxious'

  const moods = new Set<PlannerMood>([mood])
  if (profile.profileMood) moods.add(profile.profileMood)
  if (profile.vibe === 'cozy' || tiredLike) {
    moods.add('tired')
    moods.add('calm')
    moods.add('anxious')
  }
  if (profile.vibe === 'romantic' || profile.vibe === 'family' || profile.vibe === 'calm') {
    moods.add('calm')
    moods.add('tired')
  }
  if (profile.vibe === 'social' || profile.vibe === 'active') {
    moods.add('energy')
    moods.add('calm')
  }
  if (!tiredLike) moods.add('energy')

  const out: PlannerRecommendation[] = []
  for (const m of moods) {
    out.push(
      ...getRecommendationsForMoodAndBudget(
        m,
        budgetIdx,
        locale,
        birthDate,
        userId,
        mbti,
      ),
      ...getPopularForMoodAndBudget(
        m,
        budgetIdx,
        locale,
        birthDate,
        userId,
        mbti,
      ),
    )
  }
  return out
}

function uniqueById(items: PlannerRecommendation[]) {
  const seen = new Set<string>()
  return items.filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })
}

/** Собирает маршрут: намерение дня, бюджет, время, число мест и район. */
export function buildDayRoute(
  input: DayRouteInput,
  locale: Locale = 'ru',
): DayRoute | null {
  const vibe = input.vibe
  const mood = vibeToPlannerMood(vibe)
  const budget = normalizeBudgetIndex(input.budgetIdx)
  const birthDate = input.birthDate ?? null
  const areaKey = input.areaKey
  const profile = buildRouteProfile({
    vibe,
    dayPeriod: input.dayPeriod,
    stopCount: input.stopCount,
    profileMood: input.profileMood,
  })
  const resolvedStopCount = effectiveStopCount(profile)
  const pools = localizePlannerPool(PLANNER_BY_MOOD, locale)
  const affordable = filterRecommendationsByAge(
    pools[mood].filter((r) => r.budgetTier <= budget),
    birthDate,
  )

  const dislikeIds = [
    ...(input.dislikeUserIds ?? []),
    ...(input.userId ? [input.userId] : []),
  ]
  const disliked = new Set<string>()
  for (const uid of [...new Set(dislikeIds)]) {
    for (const id of getDislikedPlaceIds(uid)) disliked.add(id)
  }

  let candidates = uniqueById([
    ...gatherMoodPools(
      mood,
      profile,
      locale,
      input.budgetIdx,
      birthDate,
      input.userId,
      input.mbti,
    ),
    ...affordable,
  ]).filter((r) => !disliked.has(r.id))

  candidates = filterByRouteArea(candidates, areaKey, input.areaCustom)
  if (!candidates.length) return null

  const groupMbti = [
    input.mbti,
    ...(input.participantIds ?? []).map((id) => getNoraUserProfileSync(id)?.mbti ?? ''),
  ].filter((id): id is MbtiId => Boolean(id))
  const recentStops = getRecentRouteStopStats()
  const variationSeed = `${Date.now()}:${vibe}:${input.dayPeriod}:${input.areaKey}:${input.groupSize ?? 1}`

  const ranked = rankPlacesForRoute(
    candidates,
    profile,
    input.mbti,
    input.userId,
    birthDate,
    {
      groupSize: input.groupSize,
      groupMbti,
      recentStops,
      variationSeed,
    },
  )
  const shortlist = ranked.slice(0, Math.max(resolvedStopCount * 8, 24))
  const areaCenter = routeAreaSeed(areaKey)
  const maxLegKm = maxLegKmForProfile(profile, areaKey)

  const picked = buildSaturatedRoute(
    shortlist,
    profile,
    areaCenter,
    maxLegKm,
    input.mbti,
    input.userId,
    birthDate,
    {
      groupSize: input.groupSize,
      groupMbti,
      recentStops,
      variationSeed,
    },
  ).map(withPlaceCoordinates)

  if (!picked.length) return null

  const stops =
    picked.length >= 2
      ? optimizeWalkingOrder(picked, areaCenter)
      : picked

  const groupSize = input.groupSize ?? 1
  const participantIds = input.participantIds ?? []

  const routeName = input.name?.trim()
  if (input.userId && stops.length) {
    rememberRecentRouteStops(stops.map((s) => s.id))
  }

  return {
    id: `route-${Date.now()}`,
    ...(routeName ? { name: routeName } : {}),
    vibe,
    mood,
    dayPeriod: input.dayPeriod,
    stopCount: clampStopCount(resolvedStopCount),
    areaKey,
    area: routeAreaLabel(areaKey, input.areaCustom, locale),
    stops,
    totalDurationMin: stops.reduce(
      (sum, r) => sum + parseDurationMinutes(r.duration),
      0,
    ),
    ...(groupSize > 1
      ? {
          groupSize,
          participantIds,
          groupBudgetAvg: input.groupBudgetAvg,
          groupBudgetEffective: budget,
          organizerBudgetIdx: input.organizerBudgetIdx,
        }
      : {}),
  }
}

const DURATION_UNITS: Record<
  Locale,
  { hour: string; minute: string }
> = {
  en: { hour: 'h', minute: 'min' },
  ru: { hour: 'ч', minute: 'мин' },
  ky: { hour: 'саат', minute: 'мүн' },
  ko: { hour: '시간', minute: '분' },
}

export function formatRouteDuration(totalMin: number, locale: Locale): string {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  const { hour, minute } = DURATION_UNITS[locale] ?? DURATION_UNITS.ru
  if (h && m) return `${h} ${hour} ${m} ${minute}`
  if (h) return `${h} ${hour}`
  return `${m} ${minute}`
}

/** Нормализация старых маршрутов из localStorage */
export function normalizeDayRouteFields(
  raw: Record<string, unknown>,
  locale: Locale,
): Pick<
  DayRoute,
  | 'vibe'
  | 'mood'
  | 'dayPeriod'
  | 'stopCount'
  | 'areaKey'
  | 'area'
  | 'timeSlot'
  | 'groupSize'
  | 'participantIds'
  | 'groupBudgetAvg'
  | 'groupBudgetEffective'
  | 'organizerBudgetIdx'
  | 'name'
> | null {
  const legacySlot = raw.timeSlot
  const legacyMood = raw.mood

  let vibe: RouteVibe =
    isRouteVibe(raw.vibe) ? raw.vibe : 'calm'
  let mood: PlannerMood = vibeToPlannerMood(vibe)

  if (!isRouteVibe(raw.vibe) && typeof legacyMood === 'string') {
    const m = normalizePlannerMood(legacyMood as '')
    mood = m
    vibe = legacyMoodToVibe(m)
  }

  let dayPeriod: RouteDayPeriod = isRouteDayPeriod(raw.dayPeriod)
    ? raw.dayPeriod
    : 'afternoon'

  if (!isRouteDayPeriod(raw.dayPeriod) && typeof legacySlot === 'string') {
    if (legacySlot === 'morning') dayPeriod = 'morning'
    else if (legacySlot === 'evening') dayPeriod = 'evening'
    else if (legacySlot === 'full') dayPeriod = 'afternoon'
    else dayPeriod = 'afternoon'
  }

  const stopCount = clampStopCount(
    Number(raw.stopCount) ||
      (legacySlot === 'morning'
        ? 2
        : legacySlot === 'evening'
          ? 3
          : legacySlot === 'full'
            ? 4
            : 3),
  )

  const areaKey: RouteAreaKey = isRouteAreaKey(raw.areaKey)
    ? raw.areaKey
    : 'custom'
  const areaCustom =
    areaKey === 'custom' && typeof raw.area === 'string' ? raw.area : ''
  const area =
    typeof raw.area === 'string' && raw.area.trim()
      ? raw.area.trim()
      : routeAreaLabel(areaKey, areaCustom, locale)

  const groupSize =
    typeof raw.groupSize === 'number' && raw.groupSize > 1
      ? Math.min(12, Math.round(raw.groupSize))
      : 1
  const participantIds = Array.isArray(raw.participantIds)
    ? raw.participantIds.filter((id): id is string => typeof id === 'string')
    : []

  const name =
    typeof raw.name === 'string' && raw.name.trim()
      ? raw.name.trim()
      : undefined

  return {
    vibe,
    mood,
    ...(name ? { name } : {}),
    dayPeriod,
    stopCount,
    areaKey,
    area,
    timeSlot:
      typeof legacySlot === 'string' &&
      ['morning', 'afternoon', 'evening', 'full'].includes(legacySlot)
        ? (legacySlot as RouteTimeSlot)
        : undefined,
    groupSize: groupSize > 1 ? groupSize : undefined,
    participantIds: groupSize > 1 ? participantIds : undefined,
    groupBudgetAvg:
      typeof raw.groupBudgetAvg === 'number' ? raw.groupBudgetAvg : undefined,
    groupBudgetEffective:
      typeof raw.groupBudgetEffective === 'number'
        ? raw.groupBudgetEffective
        : undefined,
    organizerBudgetIdx:
      typeof raw.organizerBudgetIdx === 'number'
        ? raw.organizerBudgetIdx
        : undefined,
  }
}
