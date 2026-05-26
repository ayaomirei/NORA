'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PageShell } from '@/components/PageShell'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/useAuth'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth()
  const pathname = usePathname() ?? ''

  if (!authReady) {
    return (
      <PageShell>
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--nora-text-muted)]">
          Проверяем сессию…
        </div>
      </PageShell>
    )
  }

  if (!user) {
    const loginHref = `/login?next=${encodeURIComponent(pathname)}`
    return (
      <PageShell>
        <div className="mx-auto max-w-md rounded-2xl glass-panel p-6 text-center">
          <h1 className="text-lg font-semibold text-[var(--nora-text)]">
            Нужен вход
          </h1>
          <p className="mt-2 text-sm text-[var(--nora-text-muted)]">
            Войдите или зарегистрируйтесь, чтобы открыть этот раздел.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href={loginHref}>Войти</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/register">Регистрация</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    )
  }

  return <>{children}</>
}
