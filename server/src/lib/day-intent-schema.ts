import { z } from 'zod'

export const dayIntentBodySchema = z.object({
  text: z.string().min(3).max(600),
  locale: z.enum(['ru', 'en', 'ky', 'ko']).default('ru'),
  context: z
    .object({
      mbti: z.string().max(4).optional(),
      groupSize: z.number().int().min(1).max(12).optional(),
      currentVibe: z
        .enum(['calm', 'social', 'romantic', 'family', 'active', 'cozy'])
        .optional(),
      profileMood: z.enum(['calm', 'energy', 'tired', 'anxious']).optional(),
      budgetIdx: z.number().int().min(0).max(3).optional(),
    })
    .optional(),
})

export const dayIntentResponseSchema = z.object({
  source: z.enum(['rules', 'llm']),
  vibe: z.enum(['calm', 'social', 'romantic', 'family', 'active', 'cozy']),
  dayPeriod: z.enum(['morning', 'afternoon', 'evening', 'night']),
  stopCount: z.number().int().min(1).max(5),
  groupSize: z.number().int().min(1).max(8).optional(),
  areaKey: z.enum([
    'center',
    'osh',
    'countryside',
    'parks',
    'north',
    'south',
    'custom',
  ]),
  areaCustom: z.string().max(120).optional().default(''),
  budgetIdx: z.number().int().min(0).max(3).optional(),
  routeName: z.string().max(80).optional(),
  summary: z.string().max(240),
  reasoning: z.string().max(520).optional().default(''),
  confidence: z.number().min(0).max(1).optional().default(0.8),
})

export type DayIntentResponse = z.infer<typeof dayIntentResponseSchema>
