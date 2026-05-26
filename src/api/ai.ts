import { isApiEnabled } from '@/api/config'
import { apiFetch } from '@/api/client'
import type { Locale } from '@/i18n/config'
import {
  dayIntentFromLlm,
  parseDayIntentRules,
  type DayIntentParseResult,
} from '@/lib/day-intent'

export type DayIntentFetchMeta = {
  usedFallback: boolean
}

/** Сначала Gemini (API), при ошибке или недоступности — правила в браузере. */
export async function fetchDayIntent(
  text: string,
  locale: Locale,
): Promise<DayIntentParseResult & DayIntentFetchMeta> {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ...parseDayIntentRules(text, locale), usedFallback: true }
  }

  if (isApiEnabled()) {
    try {
      const res = await apiFetch('/ai/parse-day-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, locale }),
      })
      if (res.ok) {
        const data: unknown = await res.json()
        const fromLlm = dayIntentFromLlm(data, locale)
        if (fromLlm) {
          return { ...fromLlm, usedFallback: false }
        }
      }
    } catch {
      /* сеть / API — запасной вариант ниже */
    }
  }

  return {
    ...parseDayIntentRules(trimmed, locale),
    usedFallback: true,
  }
}
