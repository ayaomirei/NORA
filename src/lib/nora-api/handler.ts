type InjectResult = {
  statusCode: number
  headers: Record<string, string | string[] | undefined>
  body: string
  rawPayload?: Buffer
}

type NoraApiApp = {
  inject: (opts: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'
    url: string
    headers: Record<string, string>
    payload?: Buffer
  }) => Promise<InjectResult>
}

const globalForApi = globalThis as unknown as {
  noraApiApp?: Promise<NoraApiApp>
}

async function getApp(): Promise<NoraApiApp> {
  if (!globalForApi.noraApiApp) {
    globalForApi.noraApiApp = import('@nora/server/app').then((m) =>
      m.buildApp(),
    ) as Promise<NoraApiApp>
  }
  return globalForApi.noraApiApp
}

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'te',
  'trailer',
])

function toResponseHeaders(
  raw: Record<string, string | string[] | undefined>,
): Headers {
  const out = new Headers()
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue
    const lower = key.toLowerCase()
    if (hopByHopHeaders.has(lower)) continue
    if (Array.isArray(value)) {
      for (const v of value) out.append(key, v)
    } else {
      out.set(key, value)
    }
  }
  return out
}

/** Проксирует запрос в Fastify (тот же API, что server/ на :3001). */
export async function handleNoraApiRequest(
  request: Request,
  pathSegments: string[],
): Promise<Response> {
  let app: NoraApiApp
  try {
    app = await getApp()
  } catch (err) {
    console.error('[nora-api] buildApp failed', err)
    return Response.json(
      {
        code: 'API_BOOT_ERROR',
        message:
          err instanceof Error ? err.message : 'API failed to start',
      },
      { status: 503 },
    )
  }

  const url = new URL(request.url)
  const pathname =
    pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '/health'
  const injectUrl = `${pathname}${url.search}`

  const hasBody = !['GET', 'HEAD'].includes(request.method)
  const payload = hasBody ? await request.arrayBuffer() : undefined

  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  let result: InjectResult
  try {
    result = await app.inject({
      method: request.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD',
      url: injectUrl,
      headers,
      payload: payload ? Buffer.from(payload) : undefined,
    })
  } catch (err) {
    console.error('[nora-api] inject failed', injectUrl, err)
    return Response.json(
      {
        code: 'API_REQUEST_ERROR',
        message: err instanceof Error ? err.message : 'Request failed',
      },
      { status: 500 },
    )
  }

  const body =
    typeof result.body === 'string'
      ? result.body
      : result.rawPayload
        ? new Uint8Array(result.rawPayload)
        : ''

  return new Response(body, {
    status: result.statusCode,
    headers: toResponseHeaders(result.headers),
  })
}
