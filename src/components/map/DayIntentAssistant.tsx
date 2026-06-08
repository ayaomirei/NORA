'use client'

import { Loader2, Sparkles, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchDayIntent } from '@/api/ai'
import { isApiEnabled } from '@/api/config'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/useI18n'
import type { DayIntentParseContext, DayIntentParseResult } from '@/lib/day-intent'
import {
  getRouteAreaMeta,
  getRoutePeriodMeta,
  getRouteVibeMeta,
} from '@/lib/route-intents'
import { cn } from '@/lib/utils'

type DayIntentAssistantProps = {
  onBuild: (intent: DayIntentParseResult) => void
  parseContext?: DayIntentParseContext
}

function shorten(text: string, max = 140): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

export function DayIntentAssistant({ onBuild, parseContext }: DayIntentAssistantProps) {
  const { locale, t } = useI18n()
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [preview, setPreview] = useState<DayIntentParseResult | null>(null)
  const [usedLlmFallback, setUsedLlmFallback] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vibeMeta = useMemo(() => getRouteVibeMeta(locale), [locale])
  const periodMeta = useMemo(() => getRoutePeriodMeta(locale), [locale])
  const areaMeta = useMemo(() => getRouteAreaMeta(locale), [locale])

  async function handleParse() {
    const trimmed = text.trim()
    if (trimmed.length < 3) {
      setError(t('ai.intentTooShort'))
      return
    }
    setError(null)
    setPending(true)
    try {
      const { usedFallback, ...intent } = await fetchDayIntent(
        trimmed,
        locale,
        parseContext,
      )
      setPreview(intent)
      setUsedLlmFallback(usedFallback)
      if (usedFallback && isApiEnabled()) {
        setError(t('ai.intentLlmFallback'))
      } else {
        setError(null)
      }
    } catch {
      setError(t('ai.intentFailed'))
    } finally {
      setPending(false)
    }
  }

  function handleBuild() {
    if (!preview) return
    onBuild(preview)
    setError(null)
  }

  const previewAreaLabel =
    preview?.areaKey === 'custom' && preview.areaCustom.trim()
      ? preview.areaCustom.trim()
      : preview
        ? areaMeta[preview.areaKey]
        : ''

  return (
    <section className="nora-divider pb-3">
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
        rows={2}
        placeholder={t('ai.intentPlaceholder')}
        className="glass-input min-h-[3.5rem] w-full resize-y px-3 py-2 text-sm"
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
          <Button type="button" size="sm" className="gap-1.5" onClick={handleBuild}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t('ai.intentBuild')}
          </Button>
        ) : null}
      </div>
      {preview ? (
        <div
          className={cn(
            'mt-2 space-y-1.5 rounded-lg px-2.5 py-2 text-[11px] leading-snug',
            !usedLlmFallback
              ? 'bg-violet-400/10 text-[var(--nora-text)] shadow-[0_0_0_1px_color-mix(in_srgb,violet_30%,transparent)]'
              : 'bg-sky-400/8 text-[var(--nora-text)]',
          )}
        >
          <p className="font-medium">{shorten(preview.summary, 100)}</p>
          <p className="text-[11px] leading-relaxed text-[var(--nora-text-muted)]">
            {shorten(preview.reasoning, 140)}
          </p>
          <div className="flex flex-wrap gap-1 pt-0.5">
            <span className="glass-chip px-2 py-0.5 text-[10px]">
              {vibeMeta[preview.vibe].emoji} {vibeMeta[preview.vibe].label}
            </span>
            <span className="glass-chip px-2 py-0.5 text-[10px]">
              {periodMeta[preview.dayPeriod].label}
            </span>
            <span className="glass-chip px-2 py-0.5 text-[10px]">
              {preview.stopCount} {t('ai.intentStopsShort')}
            </span>
            <span className="glass-chip px-2 py-0.5 text-[10px]">
              {previewAreaLabel}
            </span>
          </div>
          {!usedLlmFallback ? (
            <p className="text-[10px] text-violet-500/80 dark:text-violet-300/80">
              {t('ai.intentSourceLlm')}
            </p>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-300" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
