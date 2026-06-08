import { dayIntentResponseSchema, type DayIntentResponse } from './day-intent-schema.js'
import {
  getLlmModel,
  isLlmConfigured,
  resolveLlmProvider,
  type LlmProvider,
} from './llm-config.js'

export { isLlmConfigured, resolveLlmProvider, getLlmModel }

const SYSTEM = `You are NORA's day-route planner for Bishkek (Kyrgyzstan).
Return ONLY valid JSON with keys:
source ("llm"), vibe, dayPeriod, stopCount, groupSize (1-8 optional), areaKey, areaCustom, budgetIdx (0-3 optional), routeName (short optional), summary, reasoning, confidence (0-1).

vibe: calm | social | romantic | family | active | cozy
dayPeriod: morning | afternoon | evening | night
stopCount: 1-5
areaKey: center | osh | countryside | parks | north | south | custom
If user names a district not in the list, use areaKey "custom" and areaCustom.

Budget tiers: 0=economy, 1=moderate, 2=flexible, 3=premium.

summary: one short sentence describing the planned day (user's locale).

reasoning: 1-2 short sentences in the user's locale (max ~120 chars). Explain why these settings fit the request; mention MBTI or mood only when provided. No fluff.`

type DayIntentLlmContext = {
  mbti?: string
  groupSize?: number
  currentVibe?: string
  profileMood?: string
  budgetIdx?: number
}

function contextPrompt(
  locale: string,
  text: string,
  context?: DayIntentLlmContext,
) {
  return [
    `locale: ${locale}`,
    `user_request: ${text}`,
    `context.mbti: ${context?.mbti ?? 'unknown'}`,
    `context.groupSize: ${context?.groupSize ?? 1}`,
    `context.currentVibe: ${context?.currentVibe ?? ''}`,
    `context.profileMood: ${context?.profileMood ?? ''}`,
    `context.budgetIdx: ${context?.budgetIdx ?? ''}`,
    'Rules:',
    '- Align vibe/dayPeriod/stopCount/area/budget with the request first, then refine with MBTI and mood.',
    '- groupSize >= 4: prefer family or social vibe, 3-4 stops, public-friendly areas.',
    '- If request conflicts with MBTI, prefer the explicit request but explain the balance in reasoning.',
    '- Prefer varied plans; avoid repeating generic advice.',
  ].join('\n')
}

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
  context?: DayIntentLlmContext,
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
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: contextPrompt(locale, text, context),
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
  context?: DayIntentLlmContext,
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
          parts: [{ text: contextPrompt(locale, text, context) }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
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
  context?: DayIntentLlmContext,
): Promise<DayIntentResponse | null> {
  const provider = resolveLlmProvider()
  if (!provider) return null

  if (provider === 'gemini') {
    return parseDayIntentWithGemini(text, locale, context)
  }
  return parseDayIntentWithOpenAi(text, locale, context)
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
