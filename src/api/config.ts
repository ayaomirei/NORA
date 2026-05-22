/** API на том же домене (Vercel): /api/* → Fastify. */
export function isSameOriginApi(): boolean {
  return process.env.NEXT_PUBLIC_API_SAME_ORIGIN === '1'
}

/** Бэкенд включён: отдельный URL или same-origin /api на Vercel. */
export function isApiEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL?.trim()) || isSameOriginApi()
}
