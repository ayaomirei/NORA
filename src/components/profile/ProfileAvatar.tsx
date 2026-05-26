'use client'

import { ZoomIn } from 'lucide-react'
import { useState } from 'react'
import { AvatarFace } from '@/components/AvatarFace'
import { AvatarLightbox } from '@/components/profile/AvatarLightbox'
import { useI18n } from '@/hooks/useI18n'
import {
  canOpenProfileAvatar,
  type AvatarPrivacy,
} from '@/types/avatar-privacy'
import { cn } from '@/lib/utils'

type ProfileAvatarProps = {
  avatarUrl: string | null
  avatarEmoji: string
  displayName: string
  size?: number
  avatarPrivacy?: AvatarPrivacy
  isOwner?: boolean
  className?: string
}

export function ProfileAvatar({
  avatarUrl,
  avatarEmoji,
  displayName,
  size = 96,
  avatarPrivacy = 'open',
  isOwner = false,
  className,
}: ProfileAvatarProps) {
  const { t } = useI18n()
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const canOpen = canOpenProfileAvatar(
    Boolean(avatarUrl),
    avatarPrivacy,
    isOwner,
  )

  const face = avatarUrl ? (
    <AvatarFace src={avatarUrl} displayName={displayName} size={size} />
  ) : (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-sky-400/10 text-[var(--nora-text)] shadow-[inset_0_1px_0_var(--nora-glass-highlight)]',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      {avatarEmoji}
    </span>
  )

  if (!canOpen || !avatarUrl) {
    return <div className={cn('relative shrink-0', className)}>{face}</div>
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className={cn(
          'group relative shrink-0 rounded-full transition-transform active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60',
          className,
        )}
        aria-label={t('avatar.openPhoto', { name: displayName })}
      >
        {face}
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/25"
          aria-hidden
        >
          <ZoomIn className="h-6 w-6 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
        </span>
      </button>
      <AvatarLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        src={avatarUrl}
        displayName={displayName}
      />
    </>
  )
}
