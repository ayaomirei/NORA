'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { FriendActionButton } from '@/components/profile/FriendActionButton'
import { useAuth } from '@/contexts/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { useSocialRefresh } from '@/hooks/useSocialRefresh'
import { rankPeerMatches } from '@/lib/people-matching'
import { listPublicProfiles } from '@/lib/public-profile'
import {
  getFriendIds,
  hasIncomingRequest,
  hasOutgoingRequest,
  isFriend,
} from '@/lib/social-storage'
import type { PublicProfile } from '@/types/public-profile'
import { cn } from '@/lib/utils'

type PeopleSearchResultsProps = {
  query: string
  compact?: boolean
}

export function PeopleSearchResults({ query, compact }: PeopleSearchResultsProps) {
  const { user } = useAuth()
  const { t } = useI18n()
  useSocialRefresh()

  const [peers, setPeers] = useState<PublicProfile[]>([])

  useEffect(() => {
    if (!user) {
      setPeers([])
      return
    }
    void listPublicProfiles(user.id, query).then(setPeers)
  }, [user, query])

  const ranked = useMemo(() => {
    if (!user) return []
    return rankPeerMatches(user, peers)
  }, [peers, user])

  const suggested = useMemo(
    () => (query.trim() ? [] : ranked.filter((m) => m.score > 0).slice(0, 3)),
    [ranked, query],
  )

  const suggestedIds = useMemo(
    () => new Set(suggested.map((m) => m.peer.id)),
    [suggested],
  )

  const rest = useMemo(
    () => ranked.filter((m) => !suggestedIds.has(m.peer.id)),
    [ranked, suggestedIds],
  )

  if (!user) return null

  const friendCount = getFriendIds().length

  return (
    <div className="flex flex-col">
      <div className="nora-divider px-3 pb-2 pt-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-500 dark:text-sky-400">
          {compact ? t('search.peopleTitle') : t('search.community')}
        </p>
        {!compact ? (
          <p className="mt-0.5 text-xs text-[var(--nora-text-muted)]">
            {t('search.subtitle')}
          </p>
        ) : null}
      </div>

      {friendCount > 0 ? (
        <p className="px-3 py-2 text-xs text-[var(--nora-text-muted)]">
          {t('search.friendsCount', { count: String(friendCount) })} ·{' '}
          <Link href="/chat" className="text-sky-400 hover:underline">
            {t('search.openChat')}
          </Link>
        </p>
      ) : null}

      <ul
        className={cn(
          'space-y-3 px-2 pb-2 pt-1',
          compact ? '' : 'min-h-0 flex-1 overflow-y-auto',
        )}
      >
        {suggested.length > 0 ? (
          <li>
            <p className="mb-1.5 flex items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-sky-400">
              <Sparkles className="h-3 w-3" aria-hidden />
              {t('search.suggested')}
            </p>
            <ul className="space-y-2">
              {suggested.map((m) => (
                <SearchResultRow
                  key={m.peer.id}
                  profile={m.peer}
                  matchScore={m.score}
                />
              ))}
            </ul>
          </li>
        ) : null}

        {rest.length > 0 ? (
          <li>
            {suggested.length > 0 ? (
              <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--nora-text-muted)]">
                {t('search.allPeople')}
              </p>
            ) : null}
            <ul className="space-y-2">
              {rest.map((m) => (
                <SearchResultRow
                  key={m.peer.id}
                  profile={m.peer}
                  matchScore={m.score}
                />
              ))}
            </ul>
          </li>
        ) : null}
      </ul>

      {ranked.length === 0 ? (
        <p className="px-3 pb-3 text-center text-sm text-[var(--nora-text-muted)]">
          {t('search.empty')}
        </p>
      ) : null}
    </div>
  )
}

function SearchResultRow({
  profile,
  matchScore,
}: {
  profile: PublicProfile
  matchScore: number
}) {
  const { t } = useI18n()
  const friend = isFriend(profile.id)
  const outgoing = hasOutgoingRequest(profile.id)
  const incoming = hasIncomingRequest(profile.id)

  return (
    <li className="flex items-center gap-3 rounded-xl glass-panel p-3">
      <Link
        href={`/user/${profile.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-400/10 text-lg"
          aria-hidden
        >
          {profile.avatarEmoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--nora-text)]">
            @{profile.nickname}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--nora-text-muted)]">
            {profile.bio}
          </p>
          <p className="mt-1 text-[11px] text-sky-300/80">
            {profile.city}
            {profile.mbti ? ` · ${profile.mbti}` : ''}
            {matchScore > 0 ? (
              <span className="text-emerald-400/90">
                {' '}
                · {t('search.matchPercent', { percent: String(Math.min(99, matchScore)) })}
              </span>
            ) : null}
          </p>
        </div>
      </Link>
      <FriendActionButton
        peerId={profile.id}
        friend={friend}
        outgoing={outgoing}
        incoming={incoming}
      />
    </li>
  )
}
