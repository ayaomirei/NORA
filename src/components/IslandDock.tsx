'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, MessageCircle, UserRound } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '@/hooks/useI18n'
import { motionGpuClass, spring } from '@/lib/motion'
import { cn } from '@/lib/utils'

const tabKeys = [
  { href: '/', key: 'nav.map', icon: MapPin },
  { href: '/chat', key: 'nav.chat', icon: MessageCircle },
  { href: '/passport', key: 'nav.profile', icon: UserRound },
] as const

export function IslandDock() {
  const pathname = usePathname() ?? ''
  const reduceMotion = useReducedMotion()
  const { t } = useI18n()

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] pt-2"
      aria-label={t('nav.aria')}
    >
      <div
        className={cn(
          'pointer-events-auto flex w-full max-w-md items-stretch',
          'rounded-[1.375rem] glass-panel p-1 shadow-glass-lg backdrop-blur-xl',
        )}
      >
        {tabKeys.map(({ href, key, icon: Icon }, index) => {
          const active =
            href === '/'
              ? pathname === '/' || pathname === ''
              : href === '/passport'
                ? pathname === '/passport' ||
                  pathname.startsWith('/settings')
                : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.1rem] py-2 transition-smooth',
                index > 0 && 'shadow-[inset_1px_0_0_var(--nora-border-subtle)]',
                active
                  ? 'bg-[color-mix(in_srgb,var(--nora-accent-2)_14%,transparent)] text-[var(--nora-text)]'
                  : 'text-[var(--nora-text-muted)] hover:bg-[var(--nora-surface-veil)] hover:text-[var(--nora-text)]',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active && !reduceMotion ? (
                <motion.span
                  layoutId="island-tab-glow"
                  className={cn(
                    'absolute inset-0.5 rounded-[1rem] bg-[color-mix(in_srgb,var(--nora-accent-2)_12%,transparent)] shadow-[inset_0_1px_0_var(--nora-glass-highlight)] motion-gpu',
                    motionGpuClass,
                  )}
                  aria-hidden
                  transition={spring.layout}
                />
              ) : active ? (
                <span
                  className="absolute inset-0.5 rounded-[1rem] bg-[color-mix(in_srgb,var(--nora-accent-2)_12%,transparent)] shadow-[inset_0_1px_0_var(--nora-glass-highlight)]"
                  aria-hidden
                />
              ) : null}
              <Icon
                className={cn(
                  'relative h-5 w-5',
                  active && 'opacity-100',
                )}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span
                className={cn(
                  'relative max-w-full truncate px-0.5 text-[9px] font-medium',
                  active && 'text-[var(--nora-text)]',
                )}
              >
                {t(key)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
