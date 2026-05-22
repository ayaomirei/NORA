import { isApiEnabled } from '@/api/config'
import { apiFetch } from '@/api/client'
import type { Locale } from '@/i18n/config'
import {
  isValidDayIntentPayload,
  mergeDayIntent,
  parseDayIntentRules,
  type DayIntentParseResult,
} from '@/lib/day-intent'

export async function fetchDayIntent(
  text: string,
  locale: Locale,
): Promise<DayIntentParseResult> {
  const local = parseDayIntentRules(text, locale)
  const trimmed = text.trim()
  if (!trimmed || !isApiEnabled()) return local

  try {
    const res = await apiFetch('/ai/parse-day-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, locale }),
    })
    if (res.status === 503 || !res.ok) return local
    const data: unknown = await res.json()
    if (!isValidDayIntentPayload(data)) return local
    return mergeDayIntent(local, data as Partial<DayIntentParseResult>, locale)
  } catch {
    return local
  }
}
