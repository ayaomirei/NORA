'use client'

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { useI18n } from '@/hooks/useI18n'

type AvatarLightboxProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  displayName: string
}

export function AvatarLightbox({
  open,
  onOpenChange,
  src,
  displayName,
}: AvatarLightboxProps) {
  const { t } = useI18n()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-0 bg-[var(--nora-surface)] p-2 shadow-glass-lg sm:max-w-lg">
        <DialogTitle className="sr-only">
          {t('avatar.viewTitle', { name: displayName })}
        </DialogTitle>
        <div className="relative mx-auto aspect-square w-full max-h-[min(70vh,28rem)] overflow-hidden rounded-xl bg-[var(--nora-surface-strong)]">
          <img
            src={src}
            alt={displayName}
            className="h-full w-full object-contain"
          />
        </div>
        <p className="mt-2 text-center text-xs text-[var(--nora-text-muted)]">
          {displayName}
        </p>
      </DialogContent>
    </Dialog>
  )
}
