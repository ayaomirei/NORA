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

export class DayIntentError extends Error {
  readonly code: string

  constructor(code: string, message?: string) {
    super(message ?? code)
    this.name = 'DayIntentError'
    this.code = code
  }
}

async function readAiError(res: Response): Promise<DayIntentError> {
  try {
    const data = (await res.json()) as { code?: string; message?: string }
    if (data.code === 'AI_UNAVAILABLE') {
      return new DayIntentError('AI_UNAVAILABLE', data.message)
    }
    if (data.code === 'AI_PARSE_FAILED') {
      return new DayIntentError('AI_PARSE_FAILED', data.message)
    }
    if (data.code === 'AI_QUOTA_EXCEEDED') {
      return new DayIntentError('AI_QUOTA_EXCEEDED', data.message)
    }
    if (data.code === 'AI_RATE_LIMITED') {
      return new DayIntentError('AI_RATE_LIMITED', data.message)
    }
    if (typeof data.code === 'string') {
      return new DayIntentError(data.code, data.message)
    }
  } catch {
    /* not json */
  }
  return new DayIntentError('AI_REQUEST_FAILED')
}

/** Сначала LLM через API; запасные правила — только без бэкенда. */
export async function fetchDayIntent(
  text: string,
  locale: Locale,
  context?: DayIntentContext,
): Promise<DayIntentParseResult & DayIntentFetchMeta> {
  const trimmed = text.trim()
  if (!trimmed) {
    if (isApiEnabled()) {
      throw new DayIntentError('AI_EMPTY_REQUEST')
    }
    return { ...parseDayIntentRules(text, locale, context), usedFallback: true }
  }

  if (isApiEnabled()) {
    let res: Response
    try {
      res = await apiFetch('/ai/parse-day-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, locale, context }),
      })
    } catch {
      throw new DayIntentError('AI_NETWORK_ERROR')
    }

    if (!res.ok) {
      throw await readAiError(res)
    }

    const data: unknown = await res.json()
    const fromLlm = dayIntentFromLlm(data, locale, context)
    if (!fromLlm) {
      throw new DayIntentError('AI_INVALID_RESPONSE')
    }
    return { ...fromLlm, usedFallback: false }
  }

  return {
    ...parseDayIntentRules(trimmed, locale, context),
    usedFallback: true,
  }
}
