import { dayIntentResponseSchema, type DayIntentResponse } from './day-intent-schema.js'

const SYSTEM = `You extract a day-route plan for the NORA city app (Bishkek area).
Return ONLY valid JSON with keys:
source ("llm"), vibe, dayPeriod, stopCount, areaKey, areaCustom, budgetIdx (0-3 optional), routeName (short optional), summary (one sentence in user's locale), confidence (0-1).

vibe: calm | social | romantic | family | active | cozy
dayPeriod: morning | afternoon | evening | night
stopCount: 1-5
areaKey: center | osh | countryside | parks | north | south | custom
If user names a district not in the list, use areaKey "custom" and areaCustom.

Budget tiers: 0=economy, 1=moderate, 2=flexible, 3=premium.`

export function isLlmConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export async function parseDayIntentWithLlm(
  text: string,
  locale: string,
): Promise<DayIntentResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(
    /\/$/,
    '',
  )
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

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
    console.warn('[ai] LLM parse failed', res.status, err.slice(0, 200))
    return null
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = json.choices?.[0]?.message?.content
  if (!content) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return null
  }

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
