'use client'

import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/config'
import { useI18n } from '@/hooks/useI18n'
import { cn } from '@/lib/utils'

export function LanguagePicker() {
  const { locale, setLocale } = useI18n()

  return (
    <div className="grid grid-cols-2 gap-2">
      {LOCALES.map((code) => {
        const active = locale === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code as Locale)}
            className={cn(
              'rounded-xl px-3 py-2.5 text-left transition-all',
              active
                ? 'nora-choice-active text-[var(--nora-text)]'
                : 'nora-choice text-[var(--nora-text-muted)] hover:text-[var(--nora-text)]',
            )}
          >
            <span className="block text-sm font-medium">
              {LOCALE_LABELS[code].native}
            </span>
            <span className="mt-0.5 block text-[10px] opacity-80">
              {LOCALE_LABELS[code].label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
