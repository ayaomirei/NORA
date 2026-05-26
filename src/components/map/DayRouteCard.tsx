'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDown,
  Bookmark,
  ChevronDown,
  ChevronUp,
  MapPin,
  Navigation,
  Pencil,
  Route,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { RouteEditSection } from '@/components/map/RouteEditSection'
import { formatRouteDuration, type DayRoute } from '@/lib/build-day-route'
import { routeDisplayTitle } from '@/lib/route-edit'
import { dailyBudgetLabel } from '@/lib/daily-budget'
import {
  getRoutePeriodMeta,
  getRouteVibeMeta,
} from '@/lib/route-intents'
import { useI18n } from '@/hooks/useI18n'
import { motionGpuClass, spring, tween } from '@/lib/motion'
import { cn } from '@/lib/utils'

const STOP_COLORS = ['#f59e0b', '#fb923c', '#fbbf24', '#a3e635'] as const

type DayRouteCardProps = {
  route: DayRoute
  className?: string
  onSelectStop: (stopId: string) => void
  onClear: () => void
  onSave?: () => boolean | Promise<boolean>
  onRouteChange?: (route: DayRoute) => void
  isSaved?: boolean
  hasUnsavedChanges?: boolean
  navigationActive?: boolean
  canStartNavigation?: boolean
  onStartNavigation?: () => void
  onStopNavigation?: () => void
}

export function DayRouteCard({
  route,
  className,
  onSelectStop,
  onClear,
  onSave,
  onRouteChange,
  isSaved = false,
  hasUnsavedChanges = false,
  navigationActive = false,
  canStartNavigation = false,
  onStartNavigation,
  onStopNavigation,
}: DayRouteCardProps) {
  const { locale, t } = useI18n()
  const [saveHint, setSaveHint] = useState<'idle' | 'saved' | 'duplicate'>('idle')
  const [collapsed, setCollapsed] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setCollapsed(false)
    setEditing(false)
  }, [route.id])

  const duration = formatRouteDuration(route.totalDurationMin, locale)
  const vibeMeta = getRouteVibeMeta(locale)
  const periodMeta = getRoutePeriodMeta(locale)
  const summary = t('routeBuilder.routeSummary', {
    vibe: vibeMeta[route.vibe].label,
    period: periodMeta[route.dayPeriod].label,
    area: route.area,
  })
  const titleFallback = route.area.trim() || route.stops[0]?.title || '—'
  const displayTitle = routeDisplayTitle(route, titleFallback)
  const stopsLine = t('routeBuilder.stops', {
    count: String(route.stops.length),
    duration,
  })
  const groupLine =
    route.groupSize && route.groupSize > 1
      ? t('routeBuilder.groupInRoute', {
          count: String(route.groupSize),
          budget: dailyBudgetLabel(
            route.groupBudgetEffective ?? route.groupBudgetAvg ?? 1,
            locale,
          ),
        })
      : null

  async function handleSave() {
    if (!onSave) return
    const added = await Promise.resolve(onSave())
    setSaveHint(added ? 'saved' : 'duplicate')
    window.setTimeout(() => setSaveHint('idle'), 2200)
  }

  function handleNavigationPress() {
    if (navigationActive) {
      onStopNavigation?.()
      return
    }
    onStartNavigation?.()
    setCollapsed(true)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={spring.sheet}
      className={cn(
        'motion-gpu pointer-events-auto overflow-hidden rounded-2xl bg-[var(--nora-surface-strong)] shadow-glass-lg backdrop-blur-xl ring-1 ring-amber-400/25',
        motionGpuClass,
        collapsed ? 'p-2' : 'p-3',
        className,
      )}
    >
      <motion.div layout="position" className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => collapsed && setCollapsed(false)}
          className={cn(
            'min-w-0 flex-1 text-left',
            collapsed && 'cursor-pointer rounded-lg py-0.5 pr-1 hover:bg-[var(--nora-surface-veil)]',
          )}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('routeBuilder.expandRoute') : undefined}
        >
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
            <Route className="h-3 w-3 shrink-0" aria-hidden />
            {navigationActive
              ? t('routeBuilder.navigationActive')
              : t('routeBuilder.routePreview')}
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-snug text-[var(--nora-text)]">
            {displayTitle}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--nora-text-muted)]">{stopsLine}</p>
          {!collapsed ? (
            <>
              <p className="mt-0.5 text-[10px] text-sky-600/90 dark:text-sky-400/80">
                {summary}
              </p>
              {groupLine ? (
                <p className="mt-0.5 text-[10px] text-emerald-600/90 dark:text-emerald-400/80">
                  {groupLine}
                </p>
              ) : null}
              <p className="mt-1 text-[10px] leading-snug text-[var(--nora-text-muted)]">
                {t('routeBuilder.routePreviewHint')}
              </p>
            </>
          ) : (
            <p className="mt-0.5 truncate text-[10px] text-[var(--nora-text-muted)]">
              {summary}
            </p>
          )}
        </button>

        <motion.div layout="position" className="flex shrink-0 items-center gap-0.5">
          {onRouteChange ? (
            <button
              type="button"
              onClick={() => {
                setEditing((v) => !v)
                if (collapsed) setCollapsed(false)
              }}
              className={cn(
                'rounded-lg p-1 transition-colors',
                editing
                  ? 'bg-sky-400/15 text-sky-700 dark:text-sky-200'
                  : 'text-[var(--nora-text-muted)] hover:bg-[var(--nora-surface-veil)] hover:text-[var(--nora-text)]',
              )}
              aria-label={t('routeBuilder.editRoute')}
              aria-pressed={editing}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="rounded-lg p-1 text-[var(--nora-text-muted)] hover:bg-[var(--nora-surface-veil)] hover:text-[var(--nora-text)]"
              aria-label={t('routeBuilder.expandRoute')}
            >
              <ChevronUp className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="rounded-lg p-1 text-[var(--nora-text-muted)] hover:bg-[var(--nora-surface-veil)] hover:text-[var(--nora-text)]"
              aria-label={t('routeBuilder.collapseRoute')}
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg p-1 text-[var(--nora-text-muted)] hover:bg-[var(--nora-surface-veil)] hover:text-[var(--nora-text)]"
            aria-label={t('routeBuilder.clearRoute')}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </motion.div>
      </motion.div>

      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div
            key="route-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.layout}
            className="overflow-hidden"
          >
            {editing && onRouteChange ? (
              <RouteEditSection route={route} onChange={onRouteChange} />
            ) : (
            <ol className="relative mt-3 max-h-[11rem] space-y-0 overflow-y-auto pr-0.5">
              {canStartNavigation ? (
                <li className="relative mb-2 flex items-start gap-2 rounded-lg border border-dashed border-sky-400/35 bg-sky-400/8 px-2 py-1.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white ring-2 ring-white/90">
                    ·
                  </span>
                  <span className="text-[11px] leading-snug text-sky-800 dark:text-sky-200">
                    {t('routeBuilder.routeFromYou')}
                  </span>
                </li>
              ) : null}
              {route.stops.map((stop, i) => (
                <li key={stop.id} className="relative">
                  {i < route.stops.length - 1 ? (
                    <span
                      className="absolute left-[11px] top-7 bottom-0 w-0.5 bg-gradient-to-b from-sky-400/70 to-sky-400/15"
                      aria-hidden
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onSelectStop(stop.id)}
                    className="nora-surface-card relative flex w-full items-start gap-2 rounded-lg p-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--nora-accent)_8%,var(--nora-surface-veil))]"
                  >
                    <span
                      className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-slate-900 ring-2 ring-white/90"
                      style={{
                        backgroundColor: STOP_COLORS[i % STOP_COLORS.length],
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-[var(--nora-text)]">
                        {stop.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--nora-text-muted)]">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        {stop.place} · {stop.duration}
                      </span>
                      {i === 0 && canStartNavigation ? (
                        <span className="mt-1 flex items-center gap-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">
                          <ArrowDown className="h-3 w-3" aria-hidden />
                          {t('routeBuilder.legFromYou', { place: stop.place })}
                        </span>
                      ) : null}
                      {i < route.stops.length - 1 ? (
                        <span className="mt-1 flex items-center gap-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">
                          <ArrowDown className="h-3 w-3" aria-hidden />
                          {t('routeBuilder.legTo', {
                            place: route.stops[i + 1]!.place,
                          })}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            )}

            {onStartNavigation || onStopNavigation ? (
              <button
                type="button"
                onClick={handleNavigationPress}
                disabled={!navigationActive && !canStartNavigation}
                className={cn(
                  'mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors',
                  navigationActive
                    ? 'nora-choice-active bg-amber-400/15 text-amber-900 dark:text-amber-100'
                    : canStartNavigation
                      ? 'nora-choice-active bg-emerald-500/15 text-emerald-900 hover:bg-emerald-500/22 dark:text-emerald-100'
                      : 'nora-choice cursor-not-allowed opacity-60',
                )}
              >
                <Navigation className="h-4 w-4" aria-hidden />
                {navigationActive
                  ? t('routeBuilder.stopNavigation')
                  : t('routeBuilder.startNavigation')}
              </button>
            ) : null}

            {onSave ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaved && !hasUnsavedChanges && saveHint === 'idle'}
                className={cn(
                  'mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                  isSaved && saveHint === 'idle'
                    ? 'nora-choice bg-amber-400/10 text-amber-700 dark:text-amber-200'
                    : 'nora-choice-active bg-sky-400/10 text-[var(--nora-text)] hover:bg-sky-400/16',
                )}
              >
                <Bookmark className="h-3.5 w-3.5" aria-hidden />
                {saveHint === 'saved'
                  ? t('routeBuilder.savedRoute')
                  : saveHint === 'duplicate'
                    ? t('routeBuilder.alreadySaved')
                    : isSaved && hasUnsavedChanges
                      ? t('routeBuilder.saveChanges')
                      : isSaved
                        ? t('routeBuilder.alreadySaved')
                        : t('routeBuilder.saveRoute')}
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {collapsed && navigationActive ? (
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={tween.fast}
          onClick={() => setCollapsed(false)}
          className="nora-choice mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg bg-amber-400/10 px-2 py-1 text-[10px] font-medium text-amber-800 dark:text-amber-200"
        >
          <Navigation className="h-3 w-3" aria-hidden />
          {t('routeBuilder.tapToExpandNav')}
        </motion.button>
      ) : null}
    </motion.div>
  )
}
