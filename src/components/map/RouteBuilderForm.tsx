'use client'

import { Clock, MapPin, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { DayIntentAssistant } from '@/components/map/DayIntentAssistant'
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
import type { DayIntentParseResult } from '@/lib/day-intent'
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

  function buildRouteWithParams(params: {
    vibe: RouteVibe
    dayPeriod: RouteDayPeriod
    stopCount: number
    areaKey: RouteAreaKey
    areaCustom: string
    budgetIdx?: number
    routeName?: string
  }) {
    if (!user) return
    const selectedAreaCustom = params.areaCustom ?? ''
    if (params.areaKey === 'custom' && !selectedAreaCustom.trim()) {
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
        : (params.budgetIdx ?? organizerBudgetIdx)

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
        vibe: params.vibe,
        budgetIdx: effectiveBudget,
        dayPeriod: params.dayPeriod,
        stopCount: params.stopCount,
        areaKey: params.areaKey,
        areaCustom: selectedAreaCustom,
        name: params.routeName,
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

  function applyDayIntent(intent: DayIntentParseResult) {
    setVibe(intent.vibe)
    setDayPeriod(intent.dayPeriod)
    setStopCount(intent.stopCount)
    setAreaKey(intent.areaKey)
    setAreaCustom(intent.areaCustom)
    if (intent.groupSize !== undefined) {
      const nextGroup = Math.max(1, Math.min(8, intent.groupSize))
      setGroupSize(nextGroup)
      if (nextGroup === 1) setParticipantIds([])
      else setParticipantIds((prev) => prev.slice(0, nextGroup - 1))
    }
    if (intent.budgetIdx !== undefined) {
      setOrganizerBudgetIdx(intent.budgetIdx)
    }
    if (intent.routeName) {
      setRouteName(intent.routeName)
    }
    setError(null)
  }

  function handleBuild() {
    buildRouteWithParams({
      vibe,
      dayPeriod,
      stopCount,
      areaKey,
      areaCustom,
      routeName,
    })
  }

  if (!user) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 pt-2">
        <DayIntentAssistant onApply={() => {}} />
        <p className="mt-3 text-[12px] leading-snug text-[var(--nora-text-muted)]">
          {t('routeBuilder.loginToBuild')}
        </p>
        <Link
          href="/login"
          className="nora-choice-active mt-2 inline-flex w-fit rounded-xl px-3 py-2 text-sm font-medium text-[var(--nora-text)]"
        >
          {t('auth.login')}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 pt-2">
      <section className="nora-surface-card mt-2 rounded-xl p-2.5">
        <DayIntentAssistant
          onApply={applyDayIntent}
          parseContext={{
            mbti: mbti || undefined,
            groupSize,
            currentVibe: vibe,
            profileMood: profileMood || undefined,
          }}
        />
        <p className="pt-2 text-[11px] text-[var(--nora-text-muted)]">
          {t('ai.intentHint')}
        </p>
      </section>

      <div className="mt-3 space-y-3">
          <label className="nora-divider block pb-2">
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

          <section className="mt-0">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
              {t('routeBuilder.vibeTitle')}
            </p>
            <ul className="grid grid-cols-2 gap-2">
              {ROUTE_VIBES.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      setVibe(id)
                      setError(null)
                    }}
                    className={cn(
                      'nora-choice flex w-full flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-center',
                      vibe === id && 'nora-choice-active',
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

          <section className="mt-0">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
            {t('routeBuilder.whenTitle')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ROUTE_DAY_PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setDayPeriod(period)}
              className={cn(
                'nora-choice rounded-xl px-2 py-2 text-left',
                dayPeriod === period
                  ? 'nora-choice-active'
                  : 'text-[var(--nora-text-muted)]',
              )}
            >
              <span className="block text-[11px] font-medium">
                {periodMeta[period].label}
              </span>
            </button>
          ))}
        </div>
          </section>

          <section className="mt-0">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
          {t('routeBuilder.placesCount')}
        </p>
        <div className="flex flex-wrap gap-2">
          {ROUTE_STOP_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStopCount(n)}
              className={cn(
                'nora-choice min-w-[2.25rem] rounded-full px-3 py-1.5 text-[11px] font-semibold',
                stopCount === n ? 'nora-choice-active' : 'text-[var(--nora-text-muted)]',
              )}
            >
              {n}
            </button>
          ))}
        </div>
          </section>

          <section className="mt-0">
        <div className="mb-2 flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
            {t('routeBuilder.areaTitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {presetAreas.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setAreaKey(key)
                setError(null)
              }}
              className={cn(
                'nora-choice rounded-full px-2.5 py-1 text-[11px]',
                areaKey === key ? 'nora-choice-active' : 'text-[var(--nora-text-muted)]',
              )}
            >
              {areaMeta[key]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAreaKey('custom')}
            className={cn(
              'nora-choice rounded-full px-2.5 py-1 text-[11px]',
              areaKey === 'custom' ? 'nora-choice-active' : 'text-[var(--nora-text-muted)]',
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
        </div>

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
