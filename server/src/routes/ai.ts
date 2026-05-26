import type { FastifyInstance } from 'fastify'
import { dayIntentBodySchema } from '../lib/day-intent-schema.js'
import {
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
      return reply.code(502).send({
        code: 'AI_PARSE_FAILED',
        message: 'Could not parse intent',
      })
    }

    return result
  })
}
