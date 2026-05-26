'use client'

import Link from 'next/link'
import { Check, MessageCircle, UserMinus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/hooks/useI18n'
import { useSocialRefresh } from '@/hooks/useSocialRefresh'
import { findDemoUser } from '@/lib/demoUsers'
import {
  acceptIncomingRequest,
  cancelOutgoingRequest,
  getFriendIds,
  getIncomingRequestIds,
  getOutgoingRequestIds,
  rejectIncomingRequest,
  removeFriend,
} from '@/lib/social-storage'
import { cn } from '@/lib/utils'

type Tab = 'friends' | 'incoming' | 'outgoing'

export function ProfileSocialSection() {
  useSocialRefresh()
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('friends')

  const friends = getFriendIds()
  const incoming = getIncomingRequestIds()
  const outgoing = getOutgoingRequestIds()

  const tabs = useMemo(
    (): { id: Tab; label: string; count: number }[] => [
      { id: 'friends', label: t('social.tabFriends'), count: friends.length },
      { id: 'incoming', label: t('social.tabIncoming'), count: incoming.length },
      { id: 'outgoing', label: t('social.tabOutgoing'), count: outgoing.length },
    ],
    [t, friends.length, incoming.length, outgoing.length],
  )

  const list =
    tab === 'friends' ? friends : tab === 'incoming' ? incoming : outgoing

  return (
    <section className="mb-6 rounded-2xl glass-panel p-4">
      <h2 className="text-sm font-semibold text-[var(--nora-text)]">
        {t('social.title')}
      </h2>
      <p className="mt-1 text-xs text-[var(--nora-text-muted)]">
        {t('social.desc')}
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors',
              tab === item.id
                ? 'nora-choice-active'
                : 'nora-choice text-[var(--nora-text-muted)]',
            )}
          >
            {item.label}
            {item.count > 0 ? (
              <span className="ml-1.5 rounded-full bg-sky-400/25 px-1.5 text-[11px]">
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="mt-4 text-center text-sm text-[var(--nora-text-muted)]">
          {tab === 'friends'
            ? t('social.noFriends')
            : tab === 'incoming'
              ? t('social.noIncoming')
              : t('social.noOutgoing')}
          {tab === 'friends' ? (
            <>
              {' '}
              <Link href="/?search=open" className="text-sky-400 hover:underline">
                {t('social.findPeople')}
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {list.map((peerId) => {
            const peer = findDemoUser(peerId)
            if (!peer) return null
            return (
              <li
                key={peerId}
                className="flex items-center gap-3 rounded-glass glass-chip p-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-400/10 text-lg">
                  {peer.avatarEmoji}
                </span>
                <Link href={`/user/${peerId}`} className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--nora-text)] hover:text-sky-300">
                    @{peer.nickname}
                  </p>
                  <p className="truncate text-xs text-[var(--nora-text-muted)]">
                    {peer.bio}
                  </p>
                </Link>
                <div className="flex shrink-0 gap-1">
                  {tab === 'friends' ? (
                    <>
                      <Button size="icon" variant="secondary" asChild>
                        <Link href={`/chat?peer=${peerId}`} aria-label={t('social.chat')}>
                          <MessageCircle className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={t('social.removeFriend')}
                        onClick={() => removeFriend(peerId)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </>
                  ) : tab === 'incoming' ? (
                    <>
                      <Button
                        size="icon"
                        aria-label={t('search.accept')}
                        onClick={() => acceptIncomingRequest(peerId)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={t('search.reject')}
                        onClick={() => rejectIncomingRequest(peerId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => cancelOutgoingRequest(peerId)}
                    >
                      {t('social.cancel')}
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
