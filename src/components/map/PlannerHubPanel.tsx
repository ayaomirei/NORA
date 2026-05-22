'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Coins, Route, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MbtiHelpDialog } from '@/components/MbtiHelpDialog'
import { SavedRoutesList } from '@/components/map/SavedRoutesList'
import { PlannerRecommendationsList } from '@/components/planner/PlannerRecommendationsList'
import type { SavedDayRoute } from '@/lib/saved-routes-storage'
import { DailyBudgetLabel } from '@/components/DailyBudgetLabel'
import { BudgetStepSlider } from '@/components/BudgetStepSlider'
import { MAP_MOODS } from '@/components/map/map-moods'
import { useI18n } from '@/hooks/useI18n'
import { getDailyBudgetLabels } from '@/lib/daily-budget'
import { getMbtiAccentHex, mbtiTitleColor } from '@/lib/mbti-colors'
import {
  getPlannerMoodMeta,
  normalizePlannerMood,
  type PlannerMood,
  type PlannerRecommendation,
} from '@/lib/planner-recommendations'
import type { MbtiId } from '@/lib/mbti'
import type { MoodPreset } from '@/types/user'
import { motionGpuClass, tween } from '@/lib/motion'
import { cn } from '@/lib/utils'

type PlannerHubPanelProps = {
  mood: MoodPreset
  onMoodChange: (mood: MoodPreset) => void
  budgetIdx: number
  onBudgetChange: (idx: number) => void
  mbti: MbtiId | ''
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onSelectPlace?: (place: PlannerRecommendation) => void
  savedRoutes?: SavedDayRoute[]
  activeRouteId?: string | null
  onSelectSavedRoute?: (route: SavedDayRoute) => void
  onDeleteSavedRoute?: (routeId: string) => void
  onOpenRouteBuilder?: () => void
}

/** Кнопка — нижняя часть верхней половины; панель тянется до навбара */
const PLANNER_TOP =
  'top-[max(4.5rem,calc(env(safe-area-inset-top)+20vh))]' as const
const PLANNER_PANEL_BOTTOM =
  'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]' as const

export function PlannerHubPanel({
  mood,
  onMoodChange,
  budgetIdx,
  onBudgetChange,
  mbti,
  defaultOpen = false,
  onOpenChange,
  onSelectPlace,
  savedRoutes = [],
  activeRouteId = null,
  onSelectSavedRoute,
  onDeleteSavedRoute,
  onOpenRouteBuilder,
}: PlannerHubPanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const { locale, t } = useI18n()
  const plannerMoodMeta = getPlannerMoodMeta(locale)
  const budgetLabels = getDailyBudgetLabels(locale)

  const plannerMood = normalizePlannerMood(mood)
  const mbtiHex = getMbtiAccentHex(mbti)

  function setPanelOpen(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }

  useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function handleSelectPlace(rec: PlannerRecommendation) {
    onSelectPlace?.(rec)
    setPanelOpen(false)
  }

  function handleSelectSavedRoute(route: SavedDayRoute) {
    onSelectSavedRoute?.(route)
    setPanelOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? t('planner.close') : t('planner.open')}
        className={cn(
          'pointer-events-auto fixed z-20 flex items-center justify-center',
          'right-[max(0.65rem,env(safe-area-inset-right))]',
          PLANNER_TOP,
          'h-[3.35rem] w-[3.35rem] rounded-2xl border transition-smooth',
          'glass-panel shadow-glass backdrop-blur-xl',
          open
            ? 'border-sky-400/55 bg-sky-400/14 text-sky-600 dark:text-sky-300'
            : 'border-[var(--nora-border-strong)] text-[var(--nora-text)] hover:border-sky-400/35',
        )}
      >
        <CalendarDays className="h-5 w-5" strokeWidth={open ? 2.25 : 1.75} aria-hidden />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label={t('common.close')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={tween.fast}
              className="pointer-events-auto fixed inset-0 z-30 bg-[color-mix(in_srgb,var(--nora-bg-base)_45%,transparent)] backdrop-blur-md motion-gpu"
              onClick={() => setPanelOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="planner-hub-title"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={tween.panel}
              className={cn(
                'pointer-events-auto fixed z-40 flex min-h-0 w-[min(20rem,92vw)] flex-col motion-gpu',
                motionGpuClass,
                'right-0',
                PLANNER_TOP,
                PLANNER_PANEL_BOTTOM,
                'border-l border-[var(--nora-border-strong)] glass-panel-strong shadow-glass-lg',
              )}
            >
              <header className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--nora-border-subtle)] px-3 py-3">
                <div>
                  <p
                    id="planner-hub-title"
                    className="text-[10px] font-semibold uppercase tracking-wide text-sky-500 dark:text-sky-400"
                  >
                    {t('planner.title')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="rounded-lg p-1.5 text-[var(--nora-text-muted)] hover:bg-[var(--nora-surface-veil)] hover:text-[var(--nora-text)]"
                  aria-label={t('common.close')}
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <motion.div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-2.5 pr-1.5 [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--nora-accent)_40%,transparent)_transparent]">
                {onOpenRouteBuilder ? (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRouteBuilder()
                      setPanelOpen(false)
                    }}
                    className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/45 bg-sky-400/12 px-3 py-2.5 text-xs font-semibold text-sky-800 shadow-sm transition-colors hover:bg-sky-400/18 dark:text-sky-100"
                  >
                    <Route className="h-4 w-4 shrink-0" aria-hidden />
                    {t('planner.createDayRoute')}
                  </button>
                ) : null}

                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
                  {t('planner.state')}
                </p>
                <ul className="grid grid-cols-2 gap-1.5">
                  {MAP_MOODS.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => onMoodChange(m.id)}
                        className={cn(
                          'flex w-full flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center transition-all',
                          mood === m.id
                            ? cn(
                                'border-sky-400/55 bg-sky-400/12 ring-2',
                                m.ring,
                              )
                            : 'border-[var(--nora-border-subtle)] bg-[var(--nora-surface-veil)] hover:border-sky-400/30',
                        )}
                      >
                        <span className="text-xl leading-none" aria-hidden>
                          {m.emoji}
                        </span>
                        <span className="text-[10px] font-medium leading-tight text-[var(--nora-text)]">
                          {plannerMoodMeta[m.id as PlannerMood].label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                <section className="mt-3 rounded-xl border border-[var(--nora-border-subtle)] bg-[var(--nora-surface-veil)] p-2.5">
                  <div className="flex items-center gap-2">
                    <Coins
                      className="h-4 w-4 shrink-0 text-sky-500 dark:text-sky-400"
                      aria-hidden
                    />
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
                      {t('budget.title')}
                    </p>
                  </div>
                  <DailyBudgetLabel
                    index={budgetIdx}
                    labels={budgetLabels}
                    className="mt-1.5 block w-full text-xs font-medium text-[var(--nora-text)]"
                  />
                  <BudgetStepSlider
                    className="mt-2"
                    value={budgetIdx}
                    onValueChange={onBudgetChange}
                  />
                </section>

                <section className="mt-3 rounded-xl border border-[var(--nora-border-subtle)] bg-[var(--nora-surface-veil)] p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
                    {t('planner.personality')}
                  </p>
                  {mbti ? (
                    <p
                      className="mt-1.5 text-sm font-semibold"
                      style={mbtiHex ? mbtiTitleColor(mbtiHex) : undefined}
                    >
                      {mbti}
                    </p>
                  ) : (
                    <MbtiHelpDialog
                      triggerClassName="mt-1.5 text-[11px]"
                    />
                  )}
                </section>

                {onSelectSavedRoute && onDeleteSavedRoute ? (
                  <SavedRoutesList
                    routes={savedRoutes}
                    activeRouteId={activeRouteId}
                    onSelect={handleSelectSavedRoute}
                    onDelete={onDeleteSavedRoute}
                  />
                ) : null}

                <div className="mt-4 border-t border-[var(--nora-border-subtle)] pt-3 pb-1">
                  <PlannerRecommendationsList
                    mood={plannerMood}
                    budgetIdx={budgetIdx}
                    mbti={mbti}
                    onSelect={handleSelectPlace}
                    compact
                  />
                </div>
              </motion.div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
