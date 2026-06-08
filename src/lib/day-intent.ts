import type { Locale } from '@/i18n/config'
import {
  getRouteAreaMeta,
  getRoutePeriodMeta,
  getRouteVibeMeta,
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

export type DayIntentParseContext = {
  mbti?: string
  groupSize?: number
  currentVibe?: string
  profileMood?: string
  budgetIdx?: number
}

export type DayIntentParseResult = {
  source: DayIntentSource
  vibe: RouteVibe
  dayPeriod: RouteDayPeriod
  stopCount: number
  groupSize?: number
  areaKey: RouteAreaKey
  areaCustom: string
  budgetIdx?: number
  routeName?: string
  summary: string
  /** Почему такой набор настроек подходит (ИИ или шаблон). */
  reasoning: string
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

function parseGroupSize(text: string): number | undefined {
  const digit = text.match(/\b([1-8])\s*(?:чел|человек|people|person|pax|гост|participants?)\b/)
  if (digit) return Number(digit[1])

  if (/\b(вдво[её]м|нас двое|two of us|couple)\b/.test(text)) return 2
  if (/\b(втро[её]м|нас трое|three of us)\b/.test(text)) return 3
  if (/\b(вчетвером|нас четверо|four of us)\b/.test(text)) return 4
  if (/\b(семь[её]й|family|с детьми|with kids)\b/.test(text)) return 3
  return undefined
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

/** Краткое объяснение без ИИ — для офлайн/запасного разбора. */
export function buildDayIntentReasoning(
  intent: Pick<
    DayIntentParseResult,
    | 'vibe'
    | 'dayPeriod'
    | 'stopCount'
    | 'areaKey'
    | 'areaCustom'
    | 'groupSize'
    | 'budgetIdx'
  >,
  context: DayIntentParseContext | undefined,
  locale: Locale,
): string {
  const vibeMeta = getRouteVibeMeta(locale)
  const periodMeta = getRoutePeriodMeta(locale)
  const areaMeta = getRouteAreaMeta(locale)
  const vibeLabel = vibeMeta[intent.vibe].label
  const periodLabel = periodMeta[intent.dayPeriod].label
  const areaLabel =
    intent.areaKey === 'custom' && intent.areaCustom.trim()
      ? intent.areaCustom.trim()
      : areaMeta[intent.areaKey]
  const stops = intent.stopCount
  const group = intent.groupSize ?? context?.groupSize ?? 1
  const mbti = context?.mbti?.trim()
  const mood = context?.profileMood

  if (locale === 'ru') {
    const parts = [
      `Формат «${vibeLabel}» и ${periodLabel.toLowerCase()} с ${stops} остановками в ${areaLabel} совпадает с вашим запросом.`,
    ]
    if (mbti) {
      parts.push(
        `Тип ${mbti}: темп и число остановок подобраны так, чтобы день не перегружал.`,
      )
    }
    if (mood === 'tired' || mood === 'anxious') {
      parts.push('Учли спокойное настроение — без суеты и длинных переходов.')
    } else if (mood === 'energy') {
      parts.push('Есть запас активности — можно добавить движение между точками.')
    }
    if (group > 1) {
      parts.push(
        group >= 4
          ? 'Компания из нескольких человек — формат удобен для общих мест.'
          : 'Небольшая компания — баланс между уютом и возможностью поговорить.',
      )
    }
    return parts.join(' ')
  }

  if (locale === 'ky') {
    return `${vibeLabel}, ${periodLabel}, ${stops} токтоо · ${areaLabel} — сурамыңызга ылайык.${mbti ? ` ${mbti} типи эске алынды.` : ''}`
  }

  if (locale === 'ko') {
    return `${vibeLabel}, ${periodLabel}, ${stops}곳 · ${areaLabel} — 요청에 맞춘 설정입니다.${mbti ? ` ${mbti} 성향을 반영했습니다.` : ''}`
  }

  return `${vibeLabel}, ${periodLabel}, ${stops} stops in ${areaLabel} match your request.${mbti ? ` Adjusted for ${mbti}.` : ''}${group > 1 ? ` Group of ${group} considered.` : ''}`
}

/** Правила без сети — всегда доступны в браузере. */
export function parseDayIntentRules(
  raw: string,
  locale: Locale = 'ru',
  context?: DayIntentParseContext,
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
  const groupSize = parseGroupSize(text)
  const routeName = parseRouteName(raw)
  const hits = (vibePick?.score ?? 0) + (periodPick?.score ?? 0) + (areaPick?.score ?? 0)
  const confidence = Math.min(1, 0.35 + hits * 0.12)

  const base = {
    source: 'rules' as const,
    vibe,
    dayPeriod,
    stopCount,
    ...(groupSize ? { groupSize } : {}),
    areaKey,
    areaCustom,
    budgetIdx,
    routeName,
    summary: summaryFor(locale, vibe, dayPeriod, stopCount, areaKey, areaCustom),
    confidence,
  }

  return {
    ...base,
    reasoning: buildDayIntentReasoning(base, context, locale),
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

  const groupSizeRaw = partial.groupSize ?? fallback.groupSize
  const groupSize =
    groupSizeRaw !== undefined
      ? Math.max(1, Math.min(8, Math.round(Number(groupSizeRaw))))
      : undefined

  const mergedForReasoning = {
    vibe,
    dayPeriod,
    stopCount,
    areaKey,
    areaCustom,
    groupSize,
    budgetIdx,
  }

  const reasoning =
    partial.reasoning?.trim().slice(0, 520) ||
    fallback.reasoning ||
    buildDayIntentReasoning(mergedForReasoning, undefined, locale)

  return {
    source,
    vibe,
    dayPeriod,
    stopCount,
    ...(groupSize ? { groupSize } : {}),
    areaKey,
    areaCustom,
    budgetIdx,
    routeName: partial.routeName?.trim().slice(0, 80) || fallback.routeName,
    summary:
      partial.summary?.trim().slice(0, 200) ||
      summaryFor(locale, vibe, dayPeriod, stopCount, areaKey, areaCustom),
    reasoning,
    confidence: Math.min(
      1,
      Math.max(0, partial.confidence ?? fallback.confidence),
    ),
  }
}

const LLM_NEUTRAL_DEFAULTS: Omit<DayIntentParseResult, 'summary' | 'reasoning'> = {
  source: 'llm',
  vibe: 'calm',
  dayPeriod: 'afternoon',
  stopCount: 3,
  groupSize: 1,
  areaKey: 'center',
  areaCustom: '',
  confidence: 0.85,
}

/** Ответ API (Gemini): без смешивания с правилами. */
export function dayIntentFromLlm(
  data: unknown,
  locale: Locale,
  context?: DayIntentParseContext,
): DayIntentParseResult | null {
  if (!data || typeof data !== 'object') return null

  const raw = data as Record<string, unknown>
  if (typeof raw.vibe !== 'string' || !isRouteVibe(raw.vibe)) return null
  if (typeof raw.dayPeriod !== 'string' || !isRouteDayPeriod(raw.dayPeriod)) {
    return null
  }

  const partial: Partial<DayIntentParseResult> = {
    source: 'llm',
    vibe: raw.vibe,
    dayPeriod: raw.dayPeriod,
    summary: typeof raw.summary === 'string' ? raw.summary : undefined,
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning : undefined,
    routeName: typeof raw.routeName === 'string' ? raw.routeName : undefined,
    areaCustom: typeof raw.areaCustom === 'string' ? raw.areaCustom : undefined,
    confidence:
      typeof raw.confidence === 'number' ? raw.confidence : undefined,
  }

  if (typeof raw.areaKey === 'string' && isRouteAreaKey(raw.areaKey)) {
    partial.areaKey = raw.areaKey
  }
  if (raw.stopCount !== undefined) {
    partial.stopCount = Math.round(Number(raw.stopCount))
  }
  if (raw.groupSize !== undefined) {
    partial.groupSize = Math.round(Number(raw.groupSize))
  }
  if (raw.budgetIdx !== undefined) {
    partial.budgetIdx = normalizeBudgetIndex(Number(raw.budgetIdx))
  }

  const fallbackRules = parseDayIntentRules('', locale, context)
  const fallback: DayIntentParseResult = {
    ...LLM_NEUTRAL_DEFAULTS,
    summary: summaryFor(
      locale,
      LLM_NEUTRAL_DEFAULTS.vibe,
      LLM_NEUTRAL_DEFAULTS.dayPeriod,
      LLM_NEUTRAL_DEFAULTS.stopCount,
      LLM_NEUTRAL_DEFAULTS.areaKey,
      '',
    ),
    reasoning: fallbackRules.reasoning,
  }

  const merged = clampDayIntent({ ...partial, source: 'llm' }, fallback, locale)
  merged.source = 'llm'
  if (!merged.reasoning?.trim()) {
    merged.reasoning = buildDayIntentReasoning(merged, context, locale)
  }
  return merged
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
  if (o.groupSize !== undefined) {
    const n = Number(o.groupSize)
    if (!Number.isFinite(n) || n < 1 || n > 8) return false
  }
  if (o.budgetIdx !== undefined) {
    const b = Number(o.budgetIdx)
    if (b < 0 || b > 3) return false
  }
  if (o.reasoning !== undefined && typeof o.reasoning !== 'string') return false
  return true
}

export const DAY_INTENT_VIBES = ROUTE_VIBES
export const DAY_INTENT_PERIODS = ROUTE_DAY_PERIODS
