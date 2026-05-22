'use client'

import { Clock, MapPin, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { RouteGroupSection } from '@/components/map/RouteGroupSection'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { buildDayRoute, type DayRoute } from '@/lib/build-day-route'
import {
  analyzeRouteGroup,
  strictestBirthDateForRouteGroup,
} from '@/lib/route-group-budget'
import type { MbtiId } from '@/lib/mbti'
import type { MoodPreset } from '@/types/user'
import {
  getRouteAreaMeta,
  getRoutePeriodMeta,
  getRouteVibeMeta,
  ROUTE_AREA_KEYS,
  ROUTE_DAY_PERIODS,
  ROUTE_STOP_COUNTS,
  ROUTE_VIBES,
  type RouteAreaKey,
  type RouteDayPeriod,
  type RouteVibe,
} from '@/lib/route-intents'
import { getFriendIds } from '@/lib/social-storage'
import { cn } from '@/lib/utils'

type RouteBuilderFormProps = {
  mbti: MbtiId | ''
  /** Текущее настроение с карты / профиля — влияет на длину и темп маршрута */
  profileMood?: MoodPreset
  onBuilt: (route: DayRoute) => void
}

export function RouteBuilderForm({
  mbti,
  profileMood,
  onBuilt,
}: RouteBuilderFormProps) {
  const { user } = useAuth()
  const { locale, t } = useI18n()

  const [vibe, setVibe] = useState<RouteVibe>('calm')
  const [organizerBudgetIdx, setOrganizerBudgetIdx] = useState(
    () => user?.dailyBudgetIndex ?? 1,
  )
  const [groupSize, setGroupSize] = useState(1)
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [dayPeriod, setDayPeriod] = useState<RouteDayPeriod>('afternoon')
  const [stopCount, setStopCount] = useState<number>(3)
  const [areaKey, setAreaKey] = useState<RouteAreaKey>('center')
  const [areaCustom, setAreaCustom] = useState('')
  const [routeName, setRouteName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const vibeMeta = getRouteVibeMeta(locale)
  const periodMeta = getRoutePeriodMeta(locale)
  const areaMeta = getRouteAreaMeta(locale)

  const presetAreas = ROUTE_AREA_KEYS.filter((k) => k !== 'custom')

  const friendParticipantIds = useMemo(() => {
    const allowed = new Set(getFriendIds())
    return participantIds.filter((id) => allowed.has(id))
  }, [participantIds])

  const groupAnalysis = useMemo(() => {
    if (!user) return null
    return analyzeRouteGroup({
      organizerId: user.id,
      organizerBudgetIdx,
      participantIds: friendParticipantIds,
      groupSize,
    })
  }, [user, organizerBudgetIdx, friendParticipantIds, groupSize])

  function handleBuild() {
    if (!user) return
    if (areaKey === 'custom' && !areaCustom.trim()) {
      setError(t('routeBuilder.areaRequired'))
      return
    }

    const analysis =
      groupAnalysis ??
      analyzeRouteGroup({
        organizerId: user.id,
        organizerBudgetIdx,
        participantIds: friendParticipantIds,
        groupSize,
      })

    const effectiveBudget =
      groupSize > 1
        ? analysis.effectiveBudgetIdx
        : organizerBudgetIdx

    const dislikeUserIds = [user.id, ...friendParticipantIds]
    const birthDate = strictestBirthDateForRouteGroup(
      {
        birthDay: user.birthDay,
        birthMonth: user.birthMonth,
        birthYear: user.birthYear,
      },
      friendParticipantIds,
    )

    const route = buildDayRoute(
      {
        vibe,
        budgetIdx: effectiveBudget,
        dayPeriod,
        stopCount,
        areaKey,
        areaCustom,
        name: routeName,
        mbti,
        birthDate,
        userId: user.id,
        dislikeUserIds,
        groupSize,
        participantIds: friendParticipantIds,
        groupBudgetAvg: analysis.avgBudgetIdx,
        organizerBudgetIdx,
        profileMood,
      },
      locale,
    )
    if (!route) {
      setError(t('routeBuilder.noStops'))
      return
    }
    setError(null)
    onBuilt(route)
  }

  if (!user) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 pt-2">
      <label className="block border-b border-[var(--nora-border-subtle)] pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-500 dark:text-sky-400">
          {t('routeBuilder.routeNameLabel')}
        </span>
        <input
          type="text"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          placeholder={t('routeBuilder.routeNamePlaceholder')}
          className="glass-input mt-1.5 w-full px-3 py-2.5 text-sm"
        />
      </label>

      <section className="mt-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
          {t('routeBuilder.vibeTitle')}
        </p>
        <ul className="grid grid-cols-2 gap-1.5">
          {ROUTE_VIBES.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  setVibe(id)
                  setError(null)
                }}
                className={cn(
                  'flex w-full flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center transition-colors',
                  vibe === id
                    ? 'border-sky-400/55 bg-sky-400/12 ring-2 ring-sky-400/25'
                    : 'border-[var(--nora-border-subtle)] bg-[var(--nora-surface-veil)] hover:border-sky-400/30',
                )}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {vibeMeta[id].emoji}
                </span>
                <span className="text-[10px] font-medium leading-tight text-[var(--nora-text)]">
                  {vibeMeta[id].label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <RouteGroupSection
        organizerId={user.id}
        organizerBudgetIdx={organizerBudgetIdx}
        onOrganizerBudgetChange={setOrganizerBudgetIdx}
        groupSize={groupSize}
        onGroupSizeChange={setGroupSize}
        participantIds={participantIds}
        onParticipantIdsChange={setParticipantIds}
      />

      <section className="mt-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
            {t('routeBuilder.whenTitle')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ROUTE_DAY_PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setDayPeriod(period)}
              className={cn(
                'rounded-xl border px-2 py-2 text-left transition-colors',
                dayPeriod === period
                  ? 'border-sky-400/55 bg-sky-400/12 text-sky-700 dark:text-sky-200'
                  : 'border-[var(--nora-border-subtle)] bg-[var(--nora-surface-veil)] text-[var(--nora-text-muted)] hover:border-sky-400/30',
              )}
            >
              <span className="block text-[11px] font-medium">
                {periodMeta[period].label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
          {t('routeBuilder.placesCount')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ROUTE_STOP_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStopCount(n)}
              className={cn(
                'min-w-[2.25rem] rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors',
                stopCount === n
                  ? 'border-sky-400/55 bg-sky-400/12 text-sky-700 dark:text-sky-200'
                  : 'border-[var(--nora-border-subtle)] text-[var(--nora-text-muted)] hover:border-sky-400/30',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
            {t('routeBuilder.areaTitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presetAreas.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setAreaKey(key)
                setError(null)
              }}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                areaKey === key
                  ? 'border-sky-400/55 bg-sky-400/12 text-sky-700 dark:text-sky-200'
                  : 'border-[var(--nora-border-subtle)] text-[var(--nora-text-muted)] hover:border-sky-400/30',
              )}
            >
              {areaMeta[key]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAreaKey('custom')}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
              areaKey === 'custom'
                ? 'border-sky-400/55 bg-sky-400/12 text-sky-700 dark:text-sky-200'
                : 'border-[var(--nora-border-subtle)] text-[var(--nora-text-muted)] hover:border-sky-400/30',
            )}
          >
            {areaMeta.custom}
          </button>
        </div>
        {areaKey === 'custom' ? (
          <input
            type="text"
            value={areaCustom}
            onChange={(e) => {
              setAreaCustom(e.target.value)
              setError(null)
            }}
            placeholder={t('routeBuilder.areaPlaceholder')}
            className="glass-input mt-2 w-full px-3 py-2.5 text-sm"
          />
        ) : null}
      </section>

      {error ? (
        <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-300">
          {error}
        </p>
      ) : null}

      <Button type="button" className="mt-4 w-full gap-2" onClick={handleBuild}>
        <Sparkles className="h-4 w-4" aria-hidden />
        {t('routeBuilder.build')}
      </Button>
    </div>
  )
}
