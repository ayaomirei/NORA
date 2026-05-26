'use client'

import { initialsFromDisplay } from '@/types/user'
import { useI18n } from '@/hooks/useI18n'
import { cn } from '@/lib/utils'

type AvatarFaceProps = {
  src: string | null
  displayName: string
  size?: number
  className?: string
}

export function AvatarFace({
  src,
  displayName,
  size = 40,
  className,
}: AvatarFaceProps) {
  const { t } = useI18n()
  const label = displayName.trim() || t('passport.title')
  const initials = initialsFromDisplay(label)

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--nora-surface-strong)] font-semibold text-[var(--nora-text)] shadow-[inset_0_1px_2px_rgba(42,40,38,0.08)]',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      role="img"
      aria-label={label}
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-gradient-sky" aria-hidden="true">
          {initials}
        </span>
      )}
    </span>
  )
}
