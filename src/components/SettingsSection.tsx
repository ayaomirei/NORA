'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

type SettingsSectionProps = {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}

export function SettingsSection({
  id,
  title,
  description,
  children,
}: SettingsSectionProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    if (window.location.hash !== `#${id}`) return
    const el = detailsRef.current
    if (!el) return
    el.open = true
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [id])

  return (
    <details
      ref={detailsRef}
      id={id}
      className={cn(
        'group scroll-mt-24 rounded-2xl glass-panel',
      )}
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5',
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        <span className="min-w-0 text-left">
          <span className="block text-sm font-semibold text-[var(--nora-text)]">
            {title}
          </span>
          {description ? (
            <span className="mt-0.5 block text-xs leading-snug text-[var(--nora-text-muted)]">
              {description}
            </span>
          ) : null}
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-sky-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="nora-divider px-4 py-4">
        {children}
      </div>
    </details>
  )
}
