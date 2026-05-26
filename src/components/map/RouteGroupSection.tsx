'use client'

import { Users } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo } from 'react'
import { BudgetStepSlider } from '@/components/BudgetStepSlider'
import { DailyBudgetLabel } from '@/components/DailyBudgetLabel'
import { useI18n } from '@/hooks/useI18n'
import { useSocialRefresh } from '@/hooks/useSocialRefresh'
import { getDailyBudgetLabels } from '@/lib/daily-budget'
import { getNoraUserProfileSync } from '@/lib/nora-users'
import {
  analyzeRouteGroup,
  formatGroupBudgetSummary,
} from '@/lib/route-group-budget'
import { getFriendIds } from '@/lib/social-storage'
import type { PublicProfile } from '@/types/public-profile'
import { cn } from '@/lib/utils'

const GROUP_SIZES = [1, 2, 3, 4, 5, 6, 7, 8] as const

type RouteGroupSectionProps = {
  organizerId: string
  organizerBudgetIdx: number
  onOrganizerBudgetChange: (idx: number) => void
  groupSize: number
  onGroupSizeChange: (n: number) => void
  participantIds: string[]
  onParticipantIdsChange: (ids: string[]) => void
}

export function RouteGroupSection({
  organizerId,
  organizerBudgetIdx,
  onOrganizerBudgetChange,
  groupSize,
  onGroupSizeChange,
  participantIds,
  onParticipantIdsChange,
}: RouteGroupSectionProps) {
  const { locale, t } = useI18n()
  useSocialRefresh()
  const budgetLabels = getDailyBudgetLabels(locale)

  const friends: PublicProfile[] = getFriendIds()
    .map((id) => getNoraUserProfileSync(id))
    .filter((p): p is PublicProfile => p !== null)

  const friendIdSet = useMemo(
    () => new Set(friends.map((f) => f.id)),
    [friends],
  )

  const selectedParticipants = useMemo(
    () => participantIds.filter((id) => friendIdSet.has(id)),
    [participantIds, friendIdSet],
  )

  const analysis = useMemo(
    () =>
      analyzeRouteGroup({
        organizerId,
        organizerBudgetIdx,
        participantIds: selectedParticipants,
        groupSize,
      }),
    [organizerId, organizerBudgetIdx, selectedParticipants, groupSize],
  )

  const budgetSummary = formatGroupBudgetSummary(analysis, locale)

  useEffect(() => {
    const next = participantIds.filter((id) => friendIdSet.has(id))
    if (
      next.length !== participantIds.length ||
      next.some((id, i) => id !== participantIds[i])
    ) {
      onParticipantIdsChange(next)
    }
  }, [participantIds, friendIdSet, onParticipantIdsChange])

  function toggleParticipant(id: string) {
    if (!friendIdSet.has(id)) return
    if (selectedParticipants.includes(id)) {
      onParticipantIdsChange(selectedParticipants.filter((x) => x !== id))
    } else {
      const maxFriends = groupSize - 1
      if (selectedParticipants.length >= maxFriends) return
      onParticipantIdsChange([...selectedParticipants, id])
    }
  }

  const isGroup = groupSize > 1

  return (
    <section className="nora-surface-card mt-3 rounded-xl p-2.5">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 shrink-0 text-sky-500 dark:text-sky-400" aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
          {t('routeBuilder.groupTitle')}
        </p>
      </div>

      <p className="mt-2 text-[10px] font-medium text-[var(--nora-text-muted)]">
        {t('routeBuilder.groupSize')}
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {GROUP_SIZES.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              onGroupSizeChange(n)
              if (n === 1) onParticipantIdsChange([])
              else if (participantIds.length > n - 1) {
                onParticipantIdsChange(participantIds.slice(0, n - 1))
              }
            }}
            className={cn(
              'min-w-[2rem] rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
              groupSize === n
                ? 'nora-choice-active text-[var(--nora-text)]'
                : 'nora-choice text-[var(--nora-text-muted)]',
            )}
          >
            {n}
          </button>
        ))}
      </div>

      {isGroup ? (
        <>
          <p className="mt-3 text-[10px] font-medium text-[var(--nora-text-muted)]">
            {t('routeBuilder.addFriends', {
              count: String(
                Math.max(0, groupSize - 1 - selectedParticipants.length),
              ),
            })}
          </p>

          {friends.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {friends.map((u) => (
                <ParticipantChip
                  key={u.id}
                  emoji={u.avatarEmoji}
                  nickname={u.nickname}
                  budgetIdx={u.dailyBudgetIndex}
                  selected={selectedParticipants.includes(u.id)}
                  onToggle={() => toggleParticipant(u.id)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-[var(--nora-text-muted)]">
              {t('routeBuilder.noFriendsForRoute')}{' '}
              <Link href="/?search=open" className="text-sky-400 hover:underline">
                {t('routeBuilder.findFriends')}
              </Link>
            </p>
          )}

          <div className="mt-3 rounded-lg bg-sky-400/8 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
              {t('routeBuilder.groupBudgetTitle')}
            </p>
            <ul className="mt-2 space-y-1">
              {analysis.members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 text-[11px]"
                >
                  <span className="truncate text-[var(--nora-text)]">
                    {m.isOrganizer
                      ? t('routeBuilder.you')
                      : m.isGuest
                        ? t('routeBuilder.guestLabel', {
                            n: m.nickname.replace('guest-', ''),
                          })
                        : `@${m.nickname}`}
                  </span>
                  <span className="shrink-0 text-[var(--nora-text-muted)]">
                    {budgetLabels[m.budgetIdx]}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] font-medium text-sky-700 dark:text-sky-200">
              {budgetSummary.effectiveLabel}
            </p>
          </div>
        </>
      ) : null}

      <div className="nora-divider mt-3 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
          {isGroup
            ? t('routeBuilder.yourBudgetCap')
            : t('routeBuilder.budgetTitle')}
        </p>
        <DailyBudgetLabel
          index={organizerBudgetIdx}
          labels={budgetLabels}
          className="mt-1.5 block w-full text-xs font-medium text-[var(--nora-text)]"
        />
        <BudgetStepSlider
          className="mt-2"
          value={organizerBudgetIdx}
          onValueChange={onOrganizerBudgetChange}
        />
      </div>
    </section>
  )
}

function ParticipantChip({
  emoji,
  nickname,
  budgetIdx,
  selected,
  onToggle,
}: {
  emoji: string
  nickname: string
  budgetIdx: number
  selected: boolean
  onToggle: () => void
}) {
  const { locale, t } = useI18n()
  const labels = getDailyBudgetLabels(locale)

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex max-w-full items-center gap-1 rounded-full px-2 py-1 text-left transition-colors',
        selected
          ? 'nora-choice-active text-[var(--nora-text)]'
          : 'nora-choice text-[var(--nora-text-muted)]',
      )}
      aria-pressed={selected}
    >
      <span className="text-sm leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="truncate text-[10px] font-medium">@{nickname}</span>
      <span className="hidden text-[9px] opacity-70 sm:inline">
        · {labels[budgetIdx]}
      </span>
    </button>
  )
}
