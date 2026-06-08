import { isApiEnabled, shouldUseSameOriginApi } from '@/api/config'
import { translateKey } from '@/i18n/locale-storage'

export const SESSION_KEY = 'nora_session'

export function getApiBaseUrl(): string {
  if (shouldUseSameOriginApi()) return ''
  const explicit = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  return ''
}

function resolveUrl(path: string): string {
  if (path.startsWith('http')) return path
  const p = path.startsWith('/') ? path : `/${path}`
  const base = getApiBaseUrl()
  if (!base && shouldUseSameOriginApi()) return `/api${p}`
  if (!base) return p
  return `${base}${p}`
}

export class ApiNetworkError extends Error {
  readonly code = 'API_OFFLINE' as const

  constructor(message?: string) {
    super(message ?? translateKey('authErrors.apiOffline'))
    this.name = 'ApiNetworkError'
  }
}

export function isApiNetworkError(err: unknown): err is ApiNetworkError {
  return (
    err instanceof ApiNetworkError ||
    (err instanceof TypeError && err.message === 'Failed to fetch')
  )
}

/** HTTP-клиент к API NORA (отдельный :3001 или /api на Vercel). */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  if (!isApiEnabled()) {
    throw new ApiNetworkError()
  }

  const headers = new Headers(init.headers)
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { token?: string }
        if (parsed.token) {
          headers.set('Authorization', `Bearer ${parsed.token}`)
        }
      } catch {
        /* ignore */
      }
    }
  }

  try {
    const res = await fetch(resolveUrl(path), {
      ...init,
      headers,
    })
    const type = res.headers.get('content-type') ?? ''
    if (type.includes('text/html') && !path.startsWith('http')) {
      throw new ApiNetworkError(translateKey('authErrors.apiWrongPort'))
    }
    return res
  } catch (err) {
    if (err instanceof ApiNetworkError) throw err
    if (isApiNetworkError(err)) throw new ApiNetworkError()
    throw err
  }
}
