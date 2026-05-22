import type { FastifyInstance } from 'fastify'
import { isDgisConfigured } from '../lib/dgis.js'
import { readPlaceCoordsCache } from '../lib/place-coords-cache.js'
import { PLACES_GEOCODE_MANIFEST } from '../data/places-manifest.js'
import { prisma } from '../lib/prisma.js'
import { isLlmConfigured, resolveLlmProvider, getLlmModel } from '../lib/llm-config.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    const cache = await readPlaceCoordsCache()
    let db = false
    if (process.env.DATABASE_URL?.trim()) {
      try {
        await prisma.$queryRaw`SELECT 1`
        db = true
      } catch {
        db = false
      }
    }
    const llmProvider = resolveLlmProvider()
    return {
      ok: true,
      service: 'nora-api',
      time: new Date().toISOString(),
      db,
      llm: isLlmConfigured()
        ? { provider: llmProvider, model: llmProvider ? getLlmModel(llmProvider) : null }
        : false,
      map: {
        dgis: isDgisConfigured(),
        placeCoordsCached: Object.keys(cache).length,
        placeCoordsTotal: PLACES_GEOCODE_MANIFEST.length,
      },
    }
  })
}
