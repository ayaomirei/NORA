import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import Fastify, { type FastifyInstance } from 'fastify'
import { registerAuthenticate } from './plugins/auth.js'
import { ensureSeedData } from './lib/seed.js'
import { authRoutes } from './routes/auth.js'
import { healthRoutes } from './routes/health.js'
import { placesRoutes } from './routes/places.js'
import { savedRoutesRoutes } from './routes/saved-routes.js'
import { socialRoutes } from './routes/social.js'
import { usersRoutes } from './routes/users.js'
import { mapRoutes } from './routes/map.js'
import { aiRoutes } from './routes/ai.js'

/** Собирает Fastify-приложение без listen (для Vercel / serverless и локального API). */
export async function buildApp(): Promise<FastifyInstance> {
  const JWT_SECRET = process.env.JWT_SECRET ?? 'nora-dev-secret-change-me'
  const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const app = Fastify({
    logger: process.env.NODE_ENV === 'development',
  })

  await app.register(cors, {
    origin: CORS_ORIGINS?.length ? CORS_ORIGINS : true,
    credentials: true,
  })

  await app.register(jwt, { secret: JWT_SECRET })
  registerAuthenticate(app)

  if (process.env.DATABASE_URL?.trim()) {
    try {
      await ensureSeedData()
    } catch (err) {
      app.log.warn({ err }, 'ensureSeedData failed — API starts without demo seed')
    }
  } else {
    app.log.warn('DATABASE_URL is not set — auth and DB routes will fail')
  }

  await app.register(healthRoutes)
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(usersRoutes, { prefix: '/users' })
  await app.register(savedRoutesRoutes, { prefix: '/routes' })
  await app.register(socialRoutes, { prefix: '/social' })
  await app.register(placesRoutes, { prefix: '/places' })
  await app.register(mapRoutes)
  await app.register(aiRoutes)

  await app.ready()
  return app
}
