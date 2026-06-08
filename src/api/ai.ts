import { isApiEnabled } from '@/api/config'
import { apiFetch } from '@/api/client'
import type { Locale } from '@/i18n/config'
import {
  dayIntentFromLlm,
  parseDayIntentRules,
  type DayIntentParseContext,
  type DayIntentParseResult,
} from '@/lib/day-intent'

export type DayIntentFetchMeta = {
  usedFallback: boolean
}

export type DayIntentContext = DayIntentParseContext

/** Сначала Gemini (API), при ошибке или недоступности — правила в браузере. */
export async function fetchDayIntent(
  text: string,
  locale: Locale,
  context?: DayIntentContext,
): Promise<DayIntentParseResult & DayIntentFetchMeta> {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ...parseDayIntentRules(text, locale, context), usedFallback: true }
  }

  if (isApiEnabled()) {
    try {
      const res = await apiFetch('/ai/parse-day-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, locale, context }),
      })
      if (res.ok) {
        const data: unknown = await res.json()
        const fromLlm = dayIntentFromLlm(data, locale, context)
        if (fromLlm) {
          return { ...fromLlm, usedFallback: false }
        }
      }
    } catch {
      /* сеть / API — запасной вариант ниже */
    }
  }

  return {
    ...parseDayIntentRules(trimmed, locale, context),
    usedFallback: true,
  }
}
