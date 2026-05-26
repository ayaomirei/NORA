'use client'

import { type FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/useAuth'
import { useI18n } from '@/hooks/useI18n'

export default function LoginPageClient() {
  const { login } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const search = useSearchParams()
  const next = search?.get('next') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login(email, password)
      router.replace(next.startsWith('/') ? next : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative min-h-dvh bg-[var(--nora-bg)] px-4 py-10 text-[var(--nora-text)]">
      <div className="mx-auto w-full max-w-md pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="rounded-2xl glass-panel-strong p-6 shadow-2xl">
          <h1 className="text-xl font-semibold">{t('auth.loginTitle')}</h1>
          <p className="mt-2 text-sm text-[var(--nora-text-muted)]">
            {t('auth.loginSubtitle')}
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="email">
                {t('auth.email')}
              </label>
              <input
                id="email"
                className="glass-input h-12 w-full px-3"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium"
                htmlFor="password"
              >
                {t('auth.password')}
              </label>
              <input
                id="password"
                className="glass-input h-12 w-full px-3"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
              />
            </div>
            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? t('auth.loggingIn') : t('auth.login')}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--nora-text-muted)]">
            {t('auth.noAccount')}{' '}
            <Link href="/register" className="text-sky-400 hover:underline">
              {t('auth.registerLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
