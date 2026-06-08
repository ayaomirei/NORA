function explicitApiUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim()
  return raw || undefined
}

/** API на том же домене (Vercel / dev:one): /api/* → Fastify. */
export function isSameOriginApi(): boolean {
  if (process.env.NEXT_PUBLIC_API_SAME_ORIGIN === '1') return true
  /** Vercel full-stack: без отдельного NEXT_PUBLIC_API_URL ходим на /api */
  if (process.env.VERCEL === '1') return true
  /** Сборка без явного URL API — same-origin (Vercel и npm run dev:one) */
  if (!explicitApiUrl()) return true
  return false
}

/**
 * В браузере localhost:3001 из .env.local не должен перехватывать запросы
 * с nora-red.vercel.app или с next dev :3000 (dev:one) — там API на /api.
 */
export function shouldUseSameOriginApi(): boolean {
  if (!isSameOriginApi()) return false

  const explicit = explicitApiUrl()
  if (!explicit) return true

  if (typeof window === 'undefined') return true

  try {
    return new URL(explicit).origin !== window.location.origin
  } catch {
    return true
  }
}

/** Бэкенд включён: отдельный URL или same-origin /api на Vercel. */
export function isApiEnabled(): boolean {
  return Boolean(explicitApiUrl()) || isSameOriginApi()
}
