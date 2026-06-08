import type { FastifyInstance } from 'fastify'
import { dayIntentBodySchema } from '../lib/day-intent-schema.js'
import {
  consumeLastAiFailure,
  getLlmStatus,
  isLlmConfigured,
  parseDayIntentWithLlm,
} from '../lib/parse-day-intent-llm.js'

export async function aiRoutes(app: FastifyInstance) {
  app.get('/ai/status', async () => getLlmStatus())

  app.post('/ai/parse-day-intent', async (request, reply) => {
    const parsed = dayIntentBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.flatten(),
      })
    }

    const { text, locale, context } = parsed.data

    if (!isLlmConfigured()) {
      return reply.code(503).send({
        code: 'AI_UNAVAILABLE',
        message:
          'Set GEMINI_API_KEY or OPENAI_API_KEY on the server, or use client-side rules',
      })
    }

    const result = await parseDayIntentWithLlm(text, locale, context)
    if (!result) {
      const code = consumeLastAiFailure()
      const message =
        code === 'AI_QUOTA_EXCEEDED'
          ? 'Gemini API quota exceeded — check billing or set OPENAI_API_KEY'
          : code === 'AI_RATE_LIMITED'
            ? 'AI is temporarily overloaded — try again shortly'
            : 'Could not parse intent'
      return reply.code(502).send({ code, message })
    }

    return result
  })
}
