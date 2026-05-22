export type LlmProvider = 'gemini' | 'openai'

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim())
}

export function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

/** Какой провайдер использовать (явный AI_PROVIDER или первый доступный ключ). */
export function resolveLlmProvider(): LlmProvider | null {
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase()
  if (forced === 'gemini' && hasGeminiKey()) return 'gemini'
  if (forced === 'openai' && hasOpenAiKey()) return 'openai'
  if (hasGeminiKey()) return 'gemini'
  if (hasOpenAiKey()) return 'openai'
  return null
}

export function isLlmConfigured(): boolean {
  return resolveLlmProvider() !== null
}

export function getLlmModel(provider: LlmProvider): string {
  if (provider === 'gemini') {
    return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'
  }
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
}
