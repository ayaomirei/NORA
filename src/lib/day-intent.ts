import type { Locale } from '@/i18n/config'
import {
  isRouteAreaKey,
  isRouteDayPeriod,
  isRouteVibe,
  ROUTE_AREA_KEYS,
  ROUTE_DAY_PERIODS,
  ROUTE_STOP_COUNTS,
  ROUTE_VIBES,
  type RouteAreaKey,
  type RouteDayPeriod,
  type RouteVibe,
} from '@/lib/route-intents'
import { normalizeBudgetIndex } from '@/lib/daily-budget'

export type DayIntentSource = 'rules' | 'llm'

export type DayIntentParseResult = {
  source: DayIntentSource
  vibe: RouteVibe
  dayPeriod: RouteDayPeriod
  stopCount: number
  areaKey: RouteAreaKey
  areaCustom: string
  budgetIdx?: number
  routeName?: string
  summary: string
  confidence: number
}

type KeywordRule<T extends string> = { id: T; words: string[] }

const VIBE_RULES: KeywordRule<RouteVibe>[] = [
  {
    id: 'cozy',
    words: [
      'уют',
      'устал',
      'устала',
      'спокойн',
      'чай',
      'кофе',
      'домаш',
      'тих',
      'cozy',
      'tired',
      'quiet',
      'chill',
      'calm down',
    ],
  },
  {
    id: 'calm',
    words: [
      'релакс',
      'медит',
      'без сует',
      'спокой',
      'calm',
      'relax',
      'peace',
      'slow',
    ],
  },
  {
    id: 'social',
    words: [
      'друз',
      'компани',
      'весел',
      'тус',
      'вечерин',
      'social',
      'friends',
      'party',
      'group',
      'together',
    ],
  },
  {
    id: 'romantic',
    words: [
      'романт',
      'свидан',
      'пара',
      'любов',
      'romantic',
      'date',
      'couple',
      'love',
    ],
  },
  {
    id: 'family',
    words: ['семь', 'дет', 'ребен', 'family', 'kids', 'children', 'parent'],
  },
  {
    id: 'active',
    words: [
      'актив',
      'спорт',
      'прогул',
      'поход',
      'энерг',
      'active',
      'sport',
      'hike',
      'walk',
      'energy',
      'move',
    ],
  },
]

const PERIOD_RULES: KeywordRule<RouteDayPeriod>[] = [
  { id: 'morning', words: ['утр', 'morning', 'breakfast', 'завтрак'] },
  { id: 'afternoon', words: ['днем', 'день', 'afternoon', 'lunch', 'обед'] },
  { id: 'evening', words: ['вечер', 'evening', 'sunset', 'закат'] },
  { id: 'night', words: ['ноч', 'night', 'club', 'бар', 'полноч'] },
]

const AREA_RULES: KeywordRule<Exclude<RouteAreaKey, 'custom'>>[] = [
  { id: 'osh', words: ['ош', 'базар', 'osh', 'bazaar', 'market'] },
  { id: 'parks', words: ['парк', 'park', 'сквер', 'алатоо', 'ala-too', 'алл'] },
  { id: 'center', words: ['центр', 'center', 'downtown', 'город', 'city'] },
  { id: 'north', words: ['север', 'north'] },
  { id: 'south', words: ['юг', 'south'] },
  {
    id: 'countryside',
    words: [
      'природ',
      'гор',
      'озер',
      'за город',
      'country',
      'mountain',
      'lake',
      'nature',
      'outdoor',
    ],
  },
]

function norm(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ')
}

function scoreRules<T extends string>(
  text: string,
  rules: KeywordRule<T>[],
): { id: T; score: number } | null {
  let best: { id: T; score: number } | null = null
  for (const rule of rules) {
    let score = 0
    for (const w of rule.words) {
      if (text.includes(w)) score += w.length >= 5 ? 2 : 1
    }
    if (!best || score > best.score) best = { id: rule.id, score }
  }
  return best?.score ? best : null
}

function parseStopCount(text: string): number {
  const digit = text.match(/\b([1-5])\s*(?:мест|места|stop|stops|точк)?\b/)
  if (digit) return Number(digit[1])

  if (/\b(одно|один|one|single)\b/.test(text)) return 1
  if (/\b(два|две|пару|pair|two)\b/.test(text)) return 2
  if (/\b(три|three)\b/.test(text)) return 3
  if (/\b(четыре|four)\b/.test(text)) return 4
  if (/\b(много|несколько|many|several)\b/.test(text)) return 4
  return 3
}

function parseBudget(text: string): number | undefined {
  if (/\b(дешев|эконом|cheap|budget|low)\b/.test(text)) return 0
  if (/\b(умерен|moderate|mid)\b/.test(text)) return 1
  if (/\b(гибк|flex|average)\b/.test(text)) return 2
  if (/\b(дорог|премиум|premium|7000|high|no limit)\b/.test(text)) return 3
  return undefined
}

function parseRouteName(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (trimmed.length < 4) return undefined
  if (trimmed.length <= 48) return trimmed
  return `${trimmed.slice(0, 45)}…`
}

function summaryFor(
  locale: Locale,
  vibe: RouteVibe,
  period: RouteDayPeriod,
  stops: number,
  areaKey: RouteAreaKey,
  areaCustom: string,
): string {
  const vibeLabel: Record<RouteVibe, string> =
    locale === 'ru'
      ? {
          calm: 'спокойно',
          social: 'с компанией',
          romantic: 'романтично',
          family: 'с семьёй',
          active: 'активно',
          cozy: 'уютно',
        }
      : {
          calm: 'calm',
          social: 'social',
          romantic: 'romantic',
          family: 'family',
          active: 'active',
          cozy: 'cozy',
        }

  const periodLabel: Record<RouteDayPeriod, string> =
    locale === 'ru'
      ? {
          morning: 'утром',
          afternoon: 'днём',
          evening: 'вечером',
          night: 'ночью',
        }
      : {
          morning: 'morning',
          afternoon: 'afternoon',
          evening: 'evening',
          night: 'night',
        }

  const area =
    areaKey === 'custom'
      ? areaCustom || (locale === 'ru' ? 'свой район' : 'custom area')
      : areaKey

  if (locale === 'ru') {
    return `${vibeLabel[vibe]}, ${periodLabel[period]}, ${stops} мест · ${area}`
  }
  return `${vibeLabel[vibe]}, ${periodLabel[period]}, ${stops} stops · ${area}`
}

/** Правила без сети — всегда доступны в браузере. */
export function parseDayIntentRules(
  raw: string,
  locale: Locale = 'ru',
): DayIntentParseResult {
  const text = norm(raw)
  const vibePick = scoreRules(text, VIBE_RULES)
  const periodPick = scoreRules(text, PERIOD_RULES)
  const areaPick = scoreRules(text, AREA_RULES)

  const vibe: RouteVibe = vibePick?.id ?? 'calm'
  const dayPeriod: RouteDayPeriod = periodPick?.id ?? 'afternoon'
  const stopCount = Math.min(
    5,
    Math.max(1, parseStopCount(text)),
  ) as (typeof ROUTE_STOP_COUNTS)[number]

  let areaKey: RouteAreaKey = areaPick?.id ?? 'center'
  let areaCustom = ''

  const customHints = ['джал', 'jal', 'свердлов', 'новопавлов', 'asake', 'асанбай']
  if (customHints.some((h) => text.includes(h))) {
    areaKey = 'custom'
    areaCustom = raw.trim().slice(0, 80)
  }

  const budgetIdx = parseBudget(text)
  const routeName = parseRouteName(raw)
  const hits = (vibePick?.score ?? 0) + (periodPick?.score ?? 0) + (areaPick?.score ?? 0)
  const confidence = Math.min(1, 0.35 + hits * 0.12)

  return {
    source: 'rules',
    vibe,
    dayPeriod,
    stopCount,
    areaKey,
    areaCustom,
    budgetIdx,
    routeName,
    summary: summaryFor(locale, vibe, dayPeriod, stopCount, areaKey, areaCustom),
    confidence,
  }
}

export function clampDayIntent(
  partial: Partial<DayIntentParseResult>,
  fallback: DayIntentParseResult,
  locale: Locale = 'ru',
): DayIntentParseResult {
  const vibe = isRouteVibe(partial.vibe) ? partial.vibe : fallback.vibe
  const dayPeriod = isRouteDayPeriod(partial.dayPeriod)
    ? partial.dayPeriod
    : fallback.dayPeriod
  const stopRaw = partial.stopCount ?? fallback.stopCount
  const stopCount = ROUTE_STOP_COUNTS.includes(
    stopRaw as (typeof ROUTE_STOP_COUNTS)[number],
  )
    ? stopRaw
    : fallback.stopCount
  let areaKey: RouteAreaKey = isRouteAreaKey(partial.areaKey)
    ? partial.areaKey
    : fallback.areaKey
  if (!ROUTE_AREA_KEYS.includes(areaKey)) areaKey = fallback.areaKey
  const areaCustom =
    areaKey === 'custom'
      ? (partial.areaCustom ?? fallback.areaCustom).trim().slice(0, 120)
      : ''

  const budgetIdx =
    partial.budgetIdx !== undefined
      ? normalizeBudgetIndex(partial.budgetIdx)
      : fallback.budgetIdx

  const source: DayIntentSource =
    partial.source === 'llm' ? 'llm' : fallback.source

  return {
    source,
    vibe,
    dayPeriod,
    stopCount,
    areaKey,
    areaCustom,
    budgetIdx,
    routeName: partial.routeName?.trim().slice(0, 80) || fallback.routeName,
    summary:
      partial.summary?.trim().slice(0, 200) ||
      summaryFor(locale, vibe, dayPeriod, stopCount, areaKey, areaCustom),
    confidence: Math.min(
      1,
      Math.max(0, partial.confidence ?? fallback.confidence),
    ),
  }
}

export function mergeDayIntent(
  local: DayIntentParseResult,
  remote: Partial<DayIntentParseResult> & { source?: DayIntentSource },
  locale: Locale,
): DayIntentParseResult {
  const merged = clampDayIntent(
    {
      ...remote,
      source: remote.source === 'llm' ? 'llm' : local.source,
      confidence: remote.source === 'llm' ? 0.85 : local.confidence,
    },
    local,
    locale,
  )
  if (!merged.summary || merged.summary === local.summary) {
    merged.summary = summaryFor(
      locale,
      merged.vibe,
      merged.dayPeriod,
      merged.stopCount,
      merged.areaKey,
      merged.areaCustom,
    )
  }
  return merged
}

export function isValidDayIntentPayload(
  data: unknown,
): data is Partial<DayIntentParseResult> {
  if (!data || typeof data !== 'object') return false
  const o = data as Record<string, unknown>
  if (o.vibe !== undefined && !isRouteVibe(o.vibe)) return false
  if (o.dayPeriod !== undefined && !isRouteDayPeriod(o.dayPeriod)) return false
  if (o.areaKey !== undefined && !isRouteAreaKey(o.areaKey)) return false
  if (o.stopCount !== undefined) {
    const n = Number(o.stopCount)
    if (!ROUTE_STOP_COUNTS.includes(n as (typeof ROUTE_STOP_COUNTS)[number]))
      return false
  }
  if (o.budgetIdx !== undefined) {
    const b = Number(o.budgetIdx)
    if (b < 0 || b > 3) return false
  }
  return true
}

export const DAY_INTENT_VIBES = ROUTE_VIBES
export const DAY_INTENT_PERIODS = ROUTE_DAY_PERIODS
