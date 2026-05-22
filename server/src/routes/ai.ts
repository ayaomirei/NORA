import type { FastifyInstance } from 'fastify'
import { dayIntentBodySchema } from '../lib/day-intent-schema.js'
import {
  isLlmConfigured,
  parseDayIntentWithLlm,
} from '../lib/parse-day-intent-llm.js'

export async function aiRoutes(app: FastifyInstance) {
  app.get('/ai/status', async () => ({
    llm: isLlmConfigured(),
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  }))

  app.post('/ai/parse-day-intent', async (request, reply) => {
    const parsed = dayIntentBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        code: 'VALIDATION_ERROR',
        message: parsed.error.flatten(),
      })
    }

    const { text, locale } = parsed.data

    if (!isLlmConfigured()) {
      return reply.code(503).send({
        code: 'AI_UNAVAILABLE',
        message: 'Set OPENAI_API_KEY on the server or use client-side rules',
      })
    }

    const result = await parseDayIntentWithLlm(text, locale)
    if (!result) {
      return reply.code(502).send({
        code: 'AI_PARSE_FAILED',
        message: 'Could not parse intent',
      })
    }

    return result
  })
}
