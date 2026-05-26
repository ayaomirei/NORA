'use client'

import { ArrowLeft, Search, Send, X } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PageShell } from '@/components/PageShell'
import { RequireAuth } from '@/components/RequireAuth'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { findDemoUser } from '@/lib/demoUsers'
import { getNoraUserProfileSync } from '@/lib/nora-users'
import {
  getChatThreads,
  getFriendIds,
  refreshSocialFromApi,
  sendMessage,
  type ChatThread,
} from '@/lib/social-storage'
import { useSocialRefresh } from '@/hooks/useSocialRefresh'
import { cn } from '@/lib/utils'

function highlightSnippet(text: string, query: string): string {
  const i = text.toLowerCase().indexOf(query.toLowerCase())
  if (i < 0) return text
  const start = Math.max(0, i - 24)
  const end = Math.min(text.length, i + query.length + 32)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  return `${prefix}${text.slice(start, end)}${suffix}`
}

function peerMatchesQuery(
  peerId: string,
  query: string,
  threads: ChatThread[],
): { match: boolean; snippet: string | null; matchType: 'name' | 'message' | null } {
  const peer =
    getNoraUserProfileSync(peerId) ??
  findDemoUser(peerId)
  if (!peer) return { match: false, snippet: null, matchType: null }

  const q = query.toLowerCase()
  if (peer.nickname.toLowerCase().includes(q)) {
    return { match: true, snippet: null, matchType: 'name' }
  }
  if (peer.bio.toLowerCase().includes(q)) {
    return { match: true, snippet: null, matchType: 'name' }
  }
  if (peer.city.toLowerCase().includes(q)) {
    return { match: true, snippet: peer.city, matchType: 'name' }
  }

  const thread = threads.find((t) => t.peerId === peerId)
  const hit = thread?.messages.find((m) => m.text.toLowerCase().includes(q))
  if (hit) {
    return {
      match: true,
      snippet: highlightSnippet(hit.text, query),
      matchType: 'message',
    }
  }

  return { match: false, snippet: null, matchType: null }
}

export default function ChatPage() {
  return (
    <RequireAuth>
      <ChatContent />
    </RequireAuth>
  )
}

function ChatContent() {
  const { user } = useAuth()
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const peerFromUrl = searchParams?.get('peer')
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [activePeer, setActivePeer] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [listQuery, setListQuery] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useSocialRefresh()

  const refresh = () => setThreads(getChatThreads())

  useEffect(() => {
    void refreshSocialFromApi().then(refresh)
  }, [])

  useEffect(() => {
    const onSocial = () => refresh()
    window.addEventListener('nora-social-change', onSocial)
    return () => window.removeEventListener('nora-social-change', onSocial)
  }, [])

  useEffect(() => {
    if (peerFromUrl && getFriendIds().includes(peerFromUrl)) {
      setActivePeer(peerFromUrl)
    }
  }, [peerFromUrl])

  const friendIds = getFriendIds()
  const listQ = listQuery.trim()

  const filteredFriendIds = useMemo(() => {
    if (!listQ) return friendIds
    return friendIds.filter((peerId) => peerMatchesQuery(peerId, listQ, threads).match)
  }, [friendIds, listQ, threads])

  const activeThread = threads.find((t) => t.peerId === activePeer)
  const activePeerUser = activePeer
    ? getNoraUserProfileSync(activePeer) ?? findDemoUser(activePeer)
    : null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages.length, activePeer])

  if (!user) return null

  async function handleSend() {
    if (!activePeer || !draft.trim()) return
    await sendMessage(activePeer, user!.id, draft)
    setDraft('')
    refresh()
  }

  if (activePeer && activePeerUser) {
    return (
      <PageShell className="flex max-w-lg flex-col pb-0">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActivePeer(null)}
            className="rounded-lg p-2 text-[var(--nora-text-muted)] hover:bg-[var(--nora-surface-veil)] hover:text-[var(--nora-text)]"
            aria-label={t('chat.backToList')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-xl" aria-hidden>
            {activePeerUser.avatarEmoji}
          </span>
          <Link href={`/user/${activePeer}`} className="min-w-0 flex-1">
            <p className="font-semibold text-[var(--nora-text)] hover:text-sky-300">
              @{activePeerUser.nickname}
            </p>
            <p className="text-xs text-[var(--nora-text-muted)]">
              {t('common.online')} · {t('common.demoChat')}
            </p>
          </Link>
        </div>

        <div className="mb-20 flex min-h-[50vh] flex-1 flex-col gap-2 overflow-y-auto rounded-2xl glass-panel p-3">
          {(activeThread?.messages ?? []).map((m) => {
            const mine = m.fromId === user.id
            return (
              <div
                key={m.id}
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                  mine ? 'ml-auto chat-bubble-mine' : 'mr-auto chat-bubble-theirs',
                )}
              >
                {m.text}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <form
          className="nora-divider fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-20 mx-auto flex max-w-lg gap-2 glass-panel-strong px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('chat.messagePlaceholder')}
            className="glass-input min-w-0 flex-1 px-3 py-2.5 text-sm"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim()}
            aria-label={t('chat.send')}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">
          {t('chat.messages')}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{t('chat.title')}</h1>
        <p className="mt-2 text-sm text-[var(--nora-text-muted)]">
          {t('chat.subtitle')}{' '}
          {t('chat.findFriendsPrefix')}{' '}
          <Link href="/?search=open" className="text-sky-400 hover:underline">
            {t('chat.findFriends')}
          </Link>
          .
        </p>
      </header>

      {friendIds.length > 0 ? (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nora-text-muted)]" />
          <input
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            placeholder={t('chat.searchPlaceholder')}
            className="glass-input w-full py-2.5 pl-9 pr-9 text-sm"
            aria-label={t('chat.searchChats')}
          />
          {listQuery ? (
            <button
              type="button"
              onClick={() => setListQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--nora-text-muted)] hover:text-[var(--nora-text)]"
              aria-label={t('chat.clearSearch')}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      {friendIds.length === 0 ? (
        <div className="rounded-2xl glass-panel p-6 text-center text-sm text-[var(--nora-text-muted)]">
          <p>{t('chat.noFriends')}</p>
          <Button asChild className="mt-4">
            <Link href="/?search=open">{t('chat.findPeople')}</Link>
          </Button>
        </div>
      ) : filteredFriendIds.length === 0 ? (
        <div className="rounded-2xl glass-panel p-6 text-center text-sm text-[var(--nora-text-muted)]">
          <p>{t('chat.noResults', { query: listQ })}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredFriendIds.map((peerId) => {
            const peer = findDemoUser(peerId)
            if (!peer) return null
            const thread = threads.find((t) => t.peerId === peerId)
            const last = thread?.messages[thread.messages.length - 1]
            const { snippet, matchType } = listQ
              ? peerMatchesQuery(peerId, listQ, threads)
              : { snippet: null, matchType: null as 'name' | 'message' | null }

            const subtitle =
              matchType === 'message' && snippet
                ? snippet
                : last?.text ?? t('chat.firstMessage')

            return (
              <li key={peerId}>
                <button
                  type="button"
                  onClick={() => setActivePeer(peerId)}
                  className="flex w-full items-center gap-3 rounded-2xl glass-panel p-4 text-left transition-colors hover:border-sky-400/40"
                >
                  <span className="glass-chip flex h-11 w-11 items-center justify-center rounded-full text-lg">
                    {peer.avatarEmoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--nora-text)]">
                      @{peer.nickname}
                    </p>
                    <p
                      className={cn(
                        'truncate text-xs',
                        matchType === 'message'
                          ? 'text-sky-600 dark:text-sky-300'
                          : 'text-[var(--nora-text-muted)]',
                      )}
                    >
                      {matchType === 'message' ? (
                        <span>
                          <span className="text-[var(--nora-text-muted)]">
                            {t('chat.inMessage')}{' '}
                          </span>
                          {subtitle}
                        </span>
                      ) : (
                        subtitle
                      )}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </PageShell>
  )
}
