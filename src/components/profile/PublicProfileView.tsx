'use client'

import { ArrowLeft, MapPin, MessageCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { FriendActionButton } from '@/components/profile/FriendActionButton'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/PageShell'
import { useAuth } from '@/contexts/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { useSocialRefresh } from '@/hooks/useSocialRefresh'
import { getMbtiTypes } from '@/i18n/content/mbti-types'
import { scorePeerMatch, type MatchReasonKey } from '@/lib/people-matching'
import { getPublicProfile } from '@/lib/public-profile'
import type { PublicProfile } from '@/types/public-profile'
import {
  hasIncomingRequest,
  hasOutgoingRequest,
  isFriend,
} from '@/lib/social-storage'
import { cn } from '@/lib/utils'

type PublicProfileViewProps = {
  peerId: string
}

export function PublicProfileView({ peerId }: PublicProfileViewProps) {
  const { user } = useAuth()
  const { locale, t } = useI18n()
  useSocialRefresh()

  const [profile, setProfile] = useState<PublicProfile | null>(null)

  useEffect(() => {
    void getPublicProfile(peerId).then(setProfile)
  }, [peerId])
  const friend = isFriend(peerId)
  const outgoing = hasOutgoingRequest(peerId)
  const incoming = hasIncomingRequest(peerId)

  const match = useMemo(() => {
    if (!user || !profile) return null
    return scorePeerMatch(user, profile)
  }, [user, profile])

  const mbtiSubtitle = useMemo(() => {
    if (!profile?.mbti) return null
    return getMbtiTypes(locale).find((m) => m.id === profile.mbti)?.subtitle
  }, [profile?.mbti, locale])

  if (!profile) {
    return (
      <PageShell>
        <p className="text-sm text-[var(--nora-text-muted)]">
          {t('userProfile.notFound')}
        </p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/?search=open">{t('userProfile.backToSearch')}</Link>
        </Button>
      </PageShell>
    )
  }

  const display = `@${profile.nickname}`

  return (
    <PageShell>
      <header className="mb-6 flex items-start gap-3">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={t('userProfile.back')}
        >
          <Link href="/?search=open">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-[var(--nora-text)]">
            {display}
          </h1>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-[var(--nora-text-muted)]">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {profile.city}
          </p>
        </div>
      </header>

      <section className="mb-6 rounded-2xl glass-panel p-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex shrink-0 flex-col items-center gap-2 sm:items-start">
            <ProfileAvatar
              avatarUrl={profile.avatarUrl}
              avatarEmoji={profile.avatarEmoji}
              displayName={profile.nickname}
              size={112}
              avatarPrivacy={profile.avatarPrivacy}
              isOwner={user?.id === profile.id}
            />
            {profile.avatarUrl &&
            profile.avatarPrivacy === 'preview' &&
            user?.id !== profile.id ? (
              <p className="max-w-[7rem] text-center text-[10px] leading-snug text-[var(--nora-text-muted)] sm:max-w-none sm:text-left">
                {t('avatar.previewOnlyHint')}
              </p>
            ) : null}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            {profile.mbti ? (
              <p className="text-sm font-semibold text-sky-400">
                {profile.mbti}
                {mbtiSubtitle ? (
                  <span className="font-normal text-[var(--nora-text-muted)]">
                    {' '}
                    · {mbtiSubtitle}
                  </span>
                ) : null}
              </p>
            ) : null}
            <p className="mt-3 text-sm leading-relaxed text-[var(--nora-text)]">
              {profile.bio}
            </p>
            {profile.interests.length > 0 ? (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                {profile.interests.map((tag: string) => (
                  <span
                    key={tag}
                    className="glass-chip rounded-full px-2.5 py-0.5 text-[11px] text-[var(--nora-text-muted)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {match && match.score > 0 ? (
        <section className="mb-6 rounded-2xl border border-sky-400/25 glass-panel p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--nora-text)]">
            <Sparkles className="h-4 w-4 text-sky-400" aria-hidden />
            {t('userProfile.matchTitle', {
              percent: String(Math.min(99, match.score)),
            })}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {match.reasons.map((key) => (
              <li key={key}>
                <MatchReasonPill reasonKey={key} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mb-6 rounded-2xl glass-panel p-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {profile.userStatus ? (
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--nora-text-muted)]">
                {t('userProfile.status')}
              </dt>
              <dd className="mt-0.5 text-[var(--nora-text)]">
                {t(`status.${profile.userStatus}` as 'status.student')}
              </dd>
            </div>
          ) : null}
          {profile.usualMood ? (
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--nora-text-muted)]">
                {t('userProfile.usualMood')}
              </dt>
              <dd className="mt-0.5 text-[var(--nora-text)]">
                {t(`moods.${profile.usualMood}.label` as 'moods.calm.label')}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <div className="flex flex-wrap gap-2">
        <FriendActionButton
          peerId={peerId}
          friend={friend}
          outgoing={outgoing}
          incoming={incoming}
          size="default"
        />
        {friend ? (
          <Button asChild variant="secondary" className="gap-2">
            <Link href={`/chat?peer=${peerId}`}>
              <MessageCircle className="h-4 w-4" />
              {t('userProfile.write')}
            </Link>
          </Button>
        ) : null}
      </div>
    </PageShell>
  )
}

function MatchReasonPill({ reasonKey }: { reasonKey: MatchReasonKey }) {
  const { t } = useI18n()
  return (
    <span
      className={cn(
        'rounded-full bg-sky-400/12 px-2.5 py-0.5 text-[11px] text-sky-200',
      )}
    >
      {t(`match.${reasonKey}` as 'match.mbtiSame')}
    </span>
  )
}
