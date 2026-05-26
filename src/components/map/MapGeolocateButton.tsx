'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, LocateFixed, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import {
  isGeolocationError,
  type GeolocationStatus,
} from '@/hooks/useUserGeolocation'
import { motionGpuClass, tween } from '@/lib/motion'
import { cn } from '@/lib/utils'

const ALERT_BY_STATUS: Partial<Record<GeolocationStatus, string>> = {
  denied: 'map.geolocateDenied',
  timeout: 'map.geolocateTimeout',
  position_unavailable: 'map.geolocatePositionOff',
  insecure: 'map.geolocateInsecure',
  unsupported: 'map.geolocateUnavailable',
}

type MapGeolocateButtonProps = {
  status: GeolocationStatus
  hasLocation: boolean
  isLocating: boolean
  onRecenter: () => 'centered' | 'pending' | 'warning'
  className?: string
}

export function MapGeolocateButton({
  status,
  hasLocation,
  isLocating,
  onRecenter,
  className,
}: MapGeolocateButtonProps) {
  const { t } = useI18n()
  const [alertOpen, setAlertOpen] = useState(false)

  const dismissAlert = useCallback(() => setAlertOpen(false), [])

  useEffect(() => {
    if (!alertOpen) return
    const id = window.setTimeout(dismissAlert, 7000)
    return () => window.clearTimeout(id)
  }, [alertOpen, dismissAlert])

  const handlePress = () => {
    const result = onRecenter()
    if (result === 'warning') {
      setAlertOpen(true)
    } else {
      setAlertOpen(false)
    }
  }

  const alertBodyKey =
    (isGeolocationError(status) && ALERT_BY_STATUS[status]) ||
    'map.geolocateDenied'

  const label = hasLocation
    ? t('map.geolocateCenter')
    : isLocating
      ? t('map.geolocateLocating')
      : t('map.geolocate')

  return (
    <div
      className={cn(
        'pointer-events-none fixed z-[18] flex flex-col items-center gap-2',
        'left-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] -translate-x-1/2',
        className,
      )}
    >
      <AnimatePresence>
        {alertOpen ? (
          <motion.div
            key="geo-alert"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={tween.medium}
            className={cn(
              'pointer-events-auto w-[min(16rem,calc(100vw-2rem))]',
              motionGpuClass,
            )}
            role="alert"
          >
            <motion.div
              className={cn(
                'rounded-2xl ring-1 ring-amber-400/30',
                'bg-[color-mix(in_srgb,var(--nora-surface-strong)_92%,#451a03)]',
                'p-3 shadow-glass-lg backdrop-blur-xl',
              )}
            >
              <motion.div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-amber-100">
                  {t('map.geolocateAlertTitle')}
                </p>
                <button
                  type="button"
                  onClick={dismissAlert}
                  className="shrink-0 rounded-md p-0.5 text-amber-200/80 hover:bg-amber-500/20 hover:text-amber-50"
                  aria-label={t('map.geolocateAlertDismiss')}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </motion.div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-amber-100/90">
                {t(alertBodyKey as 'map.geolocateDenied')}
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={handlePress}
        aria-busy={isLocating && !hasLocation}
        aria-label={label}
        title={label}
        className={cn(
          'pointer-events-auto flex h-11 w-11 items-center justify-center',
          'rounded-[1.375rem] glass-panel shadow-glass-lg backdrop-blur-xl transition-smooth',
          hasLocation
            ? 'text-sky-500 dark:text-sky-300'
            : 'text-[var(--nora-text-muted)] hover:text-[var(--nora-text)]',
          isLocating && !hasLocation && 'opacity-80',
        )}
      >
        {isLocating && !hasLocation ? (
          <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden />
        ) : (
          <LocateFixed
            className={cn('h-5 w-5', hasLocation && 'drop-shadow-sm')}
            strokeWidth={hasLocation ? 2.25 : 1.75}
            aria-hidden
          />
        )}
      </button>
    </div>
  )
}
