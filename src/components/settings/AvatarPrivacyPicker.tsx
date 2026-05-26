'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/useAuth'
import { useI18n } from '@/hooks/useI18n'
import type { AvatarPrivacy } from '@/types/avatar-privacy'
import { cn } from '@/lib/utils'

export function AvatarPrivacyPicker() {
  const { user, updateProfile } = useAuth()
  const { t } = useI18n()

  if (!user) return null

  const value = user.avatarPrivacy ?? 'open'

  function select(next: AvatarPrivacy) {
    if (next === value) return
    updateProfile({ avatarPrivacy: next })
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {(
        [
          {
            id: 'open' as const,
            label: t('settings.avatarOpen'),
            desc: t('settings.avatarOpenDesc'),
            icon: Eye,
          },
          {
            id: 'preview' as const,
            label: t('settings.avatarPreview'),
            desc: t('settings.avatarPreviewDesc'),
            icon: EyeOff,
          },
        ] as const
      ).map(({ id, label, desc, icon: Icon }) => {
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => select(id)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-xl px-3 py-3 text-left transition-all',
              active
                ? 'nora-choice-active text-[var(--nora-text)]'
                : 'nora-choice text-[var(--nora-text-muted)] hover:text-[var(--nora-text)]',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </span>
            <span className="text-xs leading-snug opacity-90">{desc}</span>
          </button>
        )
      })}
    </div>
  )
}
