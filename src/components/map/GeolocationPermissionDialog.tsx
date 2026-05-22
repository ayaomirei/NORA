'use client'

import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useI18n } from '@/hooks/useI18n'

type GeolocationPermissionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAllow: () => void
  onDeny: () => void
}

export function GeolocationPermissionDialog({
  open,
  onOpenChange,
  onAllow,
  onDeny,
}: GeolocationPermissionDialogProps) {
  const { t } = useI18n()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/15 text-sky-500 dark:text-sky-300">
            <MapPin className="h-5 w-5" aria-hidden />
          </div>
          <DialogTitle>{t('geoPermission.title')}</DialogTitle>
          <DialogDescription className="text-left">
            {t('geoPermission.description')}
          </DialogDescription>
        </DialogHeader>
        <p className="text-[11px] leading-snug text-[var(--nora-text-muted)]">
          {t('geoPermission.hint')}
        </p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button type="button" className="w-full" onClick={onAllow}>
            {t('geoPermission.allow')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-[var(--nora-text-muted)]"
            onClick={onDeny}
          >
            {t('geoPermission.deny')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
