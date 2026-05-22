import { handleNoraApiRequest } from '@/lib/nora-api/handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type RouteCtx = { params: { path?: string[] } }

async function dispatch(request: Request, ctx: RouteCtx) {
  const path = ctx.params.path ?? []
  return handleNoraApiRequest(request, path)
}

export const GET = dispatch
export const POST = dispatch
export const PUT = dispatch
export const PATCH = dispatch
export const DELETE = dispatch
export const OPTIONS = dispatch
