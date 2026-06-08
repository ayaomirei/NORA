'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { DayIntentAssistant } from '@/components/map/DayIntentAssistant'
import { useAuth } from '@/contexts/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { buildDayRoute, type DayRoute } from '@/lib/build-day-route'
import {
  analyzeRouteGroup,
  strictestBirthDateForRouteGroup,
} from '@/lib/route-group-budget'
import type { MbtiId } from '@/lib/mbti'
import type { MoodPreset } from '@/types/user'
import type { DayIntentParseResult } from '@/lib/day-intent'

type RouteBuilderFormProps = {
  mbti: MbtiId | ''
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
  const [error, setError] = useState<string | null>(null)

  const organizerBudgetIdx = user?.dailyBudgetIndex ?? 1

  const parseContext = useMemo(
    () => ({
      mbti: mbti || undefined,
      profileMood: profileMood || undefined,
      budgetIdx: organizerBudgetIdx,
    }),
    [mbti, profileMood, organizerBudgetIdx],
  )

  function handleBuildFromIntent(intent: DayIntentParseResult) {
    if (!user) return

    const selectedAreaCustom = intent.areaCustom ?? ''
    if (intent.areaKey === 'custom' && !selectedAreaCustom.trim()) {
      setError(t('routeBuilder.areaRequired'))
      return
    }

    const groupSize = intent.groupSize ?? 1
    const analysis = analyzeRouteGroup({
      organizerId: user.id,
      organizerBudgetIdx,
      participantIds: [],
      groupSize,
    })

    const effectiveBudget =
      groupSize > 1
        ? analysis.effectiveBudgetIdx
        : (intent.budgetIdx ?? organizerBudgetIdx)

    const birthDate = strictestBirthDateForRouteGroup(
      {
        birthDay: user.birthDay,
        birthMonth: user.birthMonth,
        birthYear: user.birthYear,
      },
      [],
    )

    const route = buildDayRoute(
      {
        vibe: intent.vibe,
        budgetIdx: effectiveBudget,
        dayPeriod: intent.dayPeriod,
        stopCount: intent.stopCount,
        areaKey: intent.areaKey,
        areaCustom: selectedAreaCustom,
        name: intent.routeName,
        mbti,
        birthDate,
        userId: user.id,
        dislikeUserIds: [user.id],
        groupSize,
        participantIds: [],
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

  if (!user) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 pt-2">
        <DayIntentAssistant onBuild={() => {}} parseContext={parseContext} />
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
          onBuild={handleBuildFromIntent}
          parseContext={parseContext}
        />
      </section>
      {error ? (
        <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-300">
          {error}
        </p>
      ) : null}
    </div>
  )
}
