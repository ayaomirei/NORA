'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RouteBuilderForm } from '@/components/map/RouteBuilderForm'
import { PeopleSearchResults } from '@/components/search/PeopleSearchResults'
import { PlacesSearchResults } from '@/components/search/PlacesSearchResults'
import type { DayRoute } from '@/lib/build-day-route'
import type { PlannerRecommendation } from '@/lib/planner-recommendations'
import { useI18n } from '@/hooks/useI18n'
import type { MbtiId } from '@/lib/mbti'
import type { MoodPreset } from '@/types/user'
import { motionGpuClass, tween } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Panel = 'search' | 'route' | null

type MapTopBarProps = {
  defaultSearchOpen?: boolean
  defaultRouteOpen?: boolean
  /** Увеличивается, чтобы открыть панель маршрута из планера */
  routeOpenTrigger?: number
  mood: MoodPreset
  budgetIdx: number
  mbti: MbtiId | ''
  onMoodChange: (mood: MoodPreset) => void
  onBudgetChange: (idx: number) => void
  onRouteBuilt: (route: DayRoute) => void
  onSelectPlace?: (place: PlannerRecommendation) => void
  /** После открытия/закрытия панелей — пересчитать размер canvas карты */
  onOverlayChange?: () => void
}

const SEARCH_TOP =
  'pt-[max(0.65rem,env(safe-area-inset-top))]' as const

const PANEL_MAX_H =
  'max-h-[min(58dvh,calc(100dvh_-_5.5rem_-_env(safe-area-inset-bottom,0px)))]' as const

const openCloseTransition = tween.medium

/** Блокирует жесты карты под панелью поиска. */
function SearchPanelScroll({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'min-h-0 touch-pan-y overflow-y-auto overscroll-contain [touch-action:pan-y] [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--nora-accent)_40%,transparent)_transparent]',
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

/** Верхняя панель: поиск людей и создание маршрута на день. */
export function MapTopBar({
  defaultSearchOpen = false,
  defaultRouteOpen = false,
  routeOpenTrigger = 0,
  mood,
  budgetIdx,
  mbti,
  onMoodChange,
  onBudgetChange,
  onRouteBuilt,
  onSelectPlace,
  onOverlayChange,
}: MapTopBarProps) {
  const { t } = useI18n()
  const [panel, setPanel] = useState<Panel>(
    defaultRouteOpen ? 'route' : defaultSearchOpen ? 'search' : null,
  )
  const [query, setQuery] = useState('')
  const [searchLeaving, setSearchLeaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const searchOpen = panel === 'search'
  const routeOpen = panel === 'route'
  const overlayOpen = panel !== null
  /** Пока идёт exit-анимация поиска — держим max-height, иначе flex растягивает панель */
  const searchExpanded = searchOpen || searchLeaving
  const shellExpanded = overlayOpen || searchLeaving
  const showBackdrop = overlayOpen

  useEffect(() => {
    if (defaultSearchOpen) setPanel('search')
  }, [defaultSearchOpen])

  useEffect(() => {
    if (defaultRouteOpen) setPanel('route')
  }, [defaultRouteOpen])

  useEffect(() => {
    if (routeOpenTrigger > 0) setPanel('route')
  }, [routeOpenTrigger])

  useEffect(() => {
    if (!searchOpen) return
    const id = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [searchOpen])

  useEffect(() => {
    if (!overlayOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overlayOpen])

  function closePanel() {
    if (panel === 'search') {
      setSearchLeaving(true)
      window.setTimeout(() => setSearchLeaving(false), 320)
    }
    setPanel(null)
    setQuery('')
    onOverlayChange?.()
    window.setTimeout(() => onOverlayChange?.(), 320)
  }

  useEffect(() => {
    if (panel === null) return
    onOverlayChange?.()
    const t = window.setTimeout(() => onOverlayChange?.(), 320)
    return () => window.clearTimeout(t)
  }, [panel, onOverlayChange])

  function openSearch() {
    setSearchLeaving(false)
    setPanel('search')
  }

  function openRoute() {
    setPanel('route')
  }

  function handleRouteBuilt(route: DayRoute) {
    onRouteBuilt(route)
    closePanel()
  }

  return (
    <>
      <AnimatePresence>
        {showBackdrop ? (
          <motion.button
            type="button"
            aria-label={t('common.close')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={openCloseTransition}
            className="pointer-events-auto fixed inset-0 z-[38] bg-[color-mix(in_srgb,var(--nora-bg-base)_45%,transparent)] backdrop-blur-md"
            onClick={closePanel}
          />
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-[50] flex justify-center px-3',
          SEARCH_TOP,
        )}
      >
        <div
          className={cn(
            'pointer-events-auto flex w-full max-w-md flex-col gap-2',
            shellExpanded && 'min-h-0',
            shellExpanded && PANEL_MAX_H,
          )}
        >
          <div
            className={cn(
              'flex gap-2',
              searchExpanded && 'min-h-0 flex-1 overflow-hidden',
            )}
          >
            <div
              className={cn(
                'flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl shadow-glass backdrop-blur-xl',
                searchExpanded && 'min-h-0',
                searchOpen && 'min-h-0 flex-1',
                searchExpanded && PANEL_MAX_H,
                searchOpen
                  ? 'nora-surface-active glass-panel-strong'
                  : 'glass-panel bg-[color-mix(in_srgb,var(--nora-surface)_28%,transparent)]',
              )}
            >
              <div className="flex min-w-0 shrink-0 items-center gap-2.5 px-3.5 py-2.5">
                <Search
                  className="h-4 w-4 shrink-0 text-sky-400"
                  strokeWidth={1.75}
                  aria-hidden
                />
                {searchOpen ? (
                  <div className="min-w-0 flex-1 overflow-x-auto [-webkit-overflow-scrolling:touch]">
                    <input
                      ref={inputRef}
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t('search.placeholder')}
                      aria-label={t('nav.search')}
                      className="block w-full min-w-[8rem] bg-transparent text-sm text-[var(--nora-text)] outline-none placeholder:text-[var(--nora-text-muted)]"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={openSearch}
                    className="min-w-0 flex-1 truncate text-left text-sm text-[var(--nora-text-muted)] hover:text-[var(--nora-text)]"
                  >
                    {t('search.placeholder')}
                  </button>
                )}
                {searchOpen ? (
                  <button
                    type="button"
                    onClick={closePanel}
                    className="rounded-lg p-1 text-[var(--nora-text-muted)] hover:bg-[var(--nora-surface-veil)] hover:text-[var(--nora-text)]"
                    aria-label={t('common.close')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <AnimatePresence initial={false} mode="popLayout">
                {searchOpen ? (
                  <motion.div
                    key="search-panel"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={openCloseTransition}
                    className="nora-divider flex min-h-0 flex-1 flex-col overflow-hidden"
                  >
                    <div
                      className="min-h-0 flex-1 overflow-hidden"
                      style={{
                        maxHeight:
                          'min(48dvh, calc(100dvh - 6.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))',
                      }}
                    >
                      <SearchPanelScroll className="h-full max-h-full">
                        <PlacesSearchResults
                          query={query}
                          onSelect={(place) => {
                            onSelectPlace?.(place)
                            closePanel()
                          }}
                        />
                        <PeopleSearchResults query={query} compact />
                      </SearchPanelScroll>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => (routeOpen ? closePanel() : openRoute())}
              aria-label={t('routeBuilder.createAria')}
              aria-expanded={routeOpen}
              className={cn(
                'flex h-[2.75rem] w-[2.75rem] shrink-0 items-center justify-center rounded-2xl shadow-glass backdrop-blur-xl transition-colors',
                routeOpen
                  ? 'nora-surface-active text-[var(--nora-accent)]'
                  : 'glass-panel bg-[color-mix(in_srgb,var(--nora-surface)_28%,transparent)] text-[var(--nora-text-muted)] hover:bg-[var(--nora-surface-veil)] hover:text-[var(--nora-text)]',
              )}
            >
              {routeOpen ? (
                <X className="h-5 w-5" strokeWidth={2} aria-hidden />
              ) : (
                <Plus className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              )}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {routeOpen ? (
              <motion.div
                key="route-panel"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={openCloseTransition}
                style={{ transformOrigin: 'top center' }}
                className={cn(
                  'motion-gpu flex min-h-0 flex-col overflow-hidden rounded-2xl glass-panel-strong shadow-glass backdrop-blur-xl',
                  motionGpuClass,
                  PANEL_MAX_H,
                )}
              >
                <RouteBuilderForm
                  mbti={mbti}
                  profileMood={mood}
                  onBuilt={handleRouteBuilt}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}
