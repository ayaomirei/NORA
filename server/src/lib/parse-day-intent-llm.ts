import { dayIntentResponseSchema, type DayIntentResponse } from './day-intent-schema.js'
import {
  getLlmModel,
  isLlmConfigured,
  resolveLlmProvider,
  type LlmProvider,
} from './llm-config.js'

export { isLlmConfigured, resolveLlmProvider, getLlmModel }

const SYSTEM = `You extract a day-route plan for the NORA city app (Bishkek area).
Return ONLY valid JSON with keys:
source ("llm"), vibe, dayPeriod, stopCount, areaKey, areaCustom, budgetIdx (0-3 optional), routeName (short optional), summary (one sentence in user's locale), confidence (0-1).

vibe: calm | social | romantic | family | active | cozy
dayPeriod: morning | afternoon | evening | night
stopCount: 1-5
areaKey: center | osh | countryside | parks | north | south | custom
If user names a district not in the list, use areaKey "custom" and areaCustom.

Budget tiers: 0=economy, 1=moderate, 2=flexible, 3=premium.`

function normalizeLlmJson(parsed: unknown): DayIntentResponse | null {
  const withSource = {
    ...(typeof parsed === 'object' && parsed !== null ? parsed : {}),
    source: 'llm' as const,
  }

  const result = dayIntentResponseSchema.safeParse(withSource)
  if (!result.success) {
    console.warn('[ai] invalid LLM JSON', result.error.flatten())
    return null
  }

  if (result.data.areaKey !== 'custom') {
    result.data.areaCustom = ''
  }

  return result.data
}

async function parseDayIntentWithOpenAi(
  text: string,
  locale: string,
): Promise<DayIntentResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(
    /\/$/,
    '',
  )
  const model = getLlmModel('openai')

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `locale: ${locale}\nrequest: ${text}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.warn('[ai] OpenAI parse failed', res.status, err.slice(0, 200))
    return null
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = json.choices?.[0]?.message?.content
  if (!content) return null

  try {
    return normalizeLlmJson(JSON.parse(content))
  } catch {
    return null
  }
}

async function parseDayIntentWithGemini(
  text: string,
  locale: string,
): Promise<DayIntentResponse | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) return null

  const model = getLlmModel('gemini')
  const baseUrl = (
    process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta'
  ).replace(/\/$/, '')

  const url = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [
        {
          role: 'user',
          parts: [{ text: `locale: ${locale}\nrequest: ${text}` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.warn('[ai] Gemini parse failed', res.status, err.slice(0, 200))
    return null
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const content = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!content) return null

  try {
    return normalizeLlmJson(JSON.parse(content))
  } catch {
    return null
  }
}

export async function parseDayIntentWithLlm(
  text: string,
  locale: string,
): Promise<DayIntentResponse | null> {
  const provider = resolveLlmProvider()
  if (!provider) return null

  if (provider === 'gemini') {
    return parseDayIntentWithGemini(text, locale)
  }
  return parseDayIntentWithOpenAi(text, locale)
}

export function getLlmStatus(): {
  llm: boolean
  provider: LlmProvider | null
  model: string | null
} {
  const provider = resolveLlmProvider()
  return {
    llm: provider !== null,
    provider,
    model: provider ? getLlmModel(provider) : null,
  }
}
