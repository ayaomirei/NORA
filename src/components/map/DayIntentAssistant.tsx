'use client'

import { Loader2, Sparkles, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { fetchDayIntent } from '@/api/ai'
import { isApiEnabled } from '@/api/config'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/useI18n'
import type { DayIntentParseResult } from '@/lib/day-intent'
import { cn } from '@/lib/utils'

type DayIntentAssistantProps = {
  onApply: (intent: DayIntentParseResult) => void
}

export function DayIntentAssistant({ onApply }: DayIntentAssistantProps) {
  const { locale, t } = useI18n()
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [preview, setPreview] = useState<DayIntentParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleParse() {
    const trimmed = text.trim()
    if (trimmed.length < 3) {
      setError(t('ai.intentTooShort'))
      return
    }
    setError(null)
    setPending(true)
    try {
      const intent = await fetchDayIntent(trimmed, locale)
      setPreview(intent)
    } catch {
      setError(t('ai.intentFailed'))
    } finally {
      setPending(false)
    }
  }

  function handleApply() {
    if (!preview) return
    onApply(preview)
    setError(null)
  }

  return (
    <section className="border-b border-[var(--nora-border-subtle)] pb-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-500 dark:text-sky-400">
          {t('ai.intentTitle')}
        </p>
      </div>
      <p className="mb-2 text-[11px] leading-snug text-[var(--nora-text-muted)]">
        {t('ai.intentHint')}
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setError(null)
        }}
        rows={3}
        placeholder={t('ai.intentPlaceholder')}
        className="glass-input min-h-[4.5rem] w-full resize-y px-3 py-2.5 text-sm"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5"
          disabled={pending}
          onClick={() => void handleParse()}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Wand2 className="h-3.5 w-3.5" aria-hidden />
          )}
          {t('ai.intentParse')}
        </Button>
        {preview ? (
          <Button type="button" size="sm" onClick={handleApply}>
            {t('ai.intentApply')}
          </Button>
        ) : null}
      </div>
      {preview ? (
        <p
          className={cn(
            'mt-2 rounded-lg border px-2.5 py-2 text-[11px] leading-snug',
            preview.source === 'llm'
              ? 'border-violet-400/35 bg-violet-400/8 text-[var(--nora-text)]'
              : 'border-sky-400/30 bg-sky-400/8 text-[var(--nora-text)]',
          )}
        >
          {preview.summary}
          <span className="mt-1 block text-[10px] text-[var(--nora-text-muted)]">
            {preview.source === 'llm'
              ? t('ai.intentSourceLlm')
              : t('ai.intentSourceRules')}
            {!isApiEnabled() ? ` · ${t('ai.intentOfflineNote')}` : null}
          </span>
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-300" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
