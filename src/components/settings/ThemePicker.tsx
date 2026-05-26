'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { transitionTheme } from '@/lib/theme-view-transition'
import { mapAppearanceScheme } from '@/lib/map-appearance'
import { useI18n } from '@/hooks/useI18n'
import { cn } from '@/lib/utils'

export function ThemePicker() {
  const { t } = useI18n()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const scheme = mounted
    ? mapAppearanceScheme(theme, resolvedTheme)
    : 'dark'

  return (
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          { id: 'light' as const, label: t('settings.themeLight'), icon: Sun },
          { id: 'dark' as const, label: t('settings.themeDark'), icon: Moon },
        ] as const
      ).map(({ id, label, icon: Icon }) => {
        const active = scheme === id
        return (
          <button
            key={id}
            type="button"
            disabled={!mounted}
            onClick={() => transitionTheme(id, setTheme)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-all',
              active
                ? 'nora-choice-active text-[var(--nora-text)]'
                : 'nora-choice text-[var(--nora-text-muted)] hover:text-[var(--nora-text)]',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
