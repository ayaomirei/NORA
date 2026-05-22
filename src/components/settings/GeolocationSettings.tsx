'use client'

import { useEffect, useState } from 'react'
import { SettingsToggleRow } from '@/components/settings/SettingsToggleRow'
import { useI18n } from '@/hooks/useI18n'
import {
  getGeoPermission,
  queryBrowserGeoPermission,
  setGeoPermission,
  subscribeGeoPermission,
  type GeoPermissionPref,
} from '@/lib/geo-permission'

export function GeolocationSettings() {
  const { t } = useI18n()
  const [pref, setPref] = useState<GeoPermissionPref>('unset')
  const [browserState, setBrowserState] = useState<
    PermissionState | 'unsupported'
  >('unsupported')

  useEffect(() => {
    setPref(getGeoPermission())
    return subscribeGeoPermission(() => setPref(getGeoPermission()))
  }, [])

  useEffect(() => {
    void queryBrowserGeoPermission().then(setBrowserState)
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      return
    }
    let cancelled = false
    void navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        status.onchange = () => {
          if (!cancelled) void queryBrowserGeoPermission().then(setBrowserState)
          setPref(getGeoPermission())
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const browserLabel =
    browserState === 'granted'
      ? t('settings.geoBrowserGranted')
      : browserState === 'denied'
        ? t('settings.geoBrowserDenied')
        : browserState === 'prompt'
          ? t('settings.geoBrowserPrompt')
          : t('settings.geoBrowserUnknown')

  return (
    <div className="space-y-1">
      <SettingsToggleRow
        label={t('settings.geoAllow')}
        description={t('settings.geoAllowDesc')}
        checked={pref === 'granted'}
        onCheckedChange={(on) => {
          setGeoPermission(on ? 'granted' : 'denied')
          setPref(getGeoPermission())
        }}
      />
      <p className="px-0.5 pt-1 text-[11px] leading-snug text-[var(--nora-text-muted)]">
        {t('settings.geoBrowserStatus')}: {browserLabel}
      </p>
      {pref === 'denied' ? (
        <p className="px-0.5 text-[11px] leading-snug text-amber-600 dark:text-amber-300">
          {t('settings.geoDeniedHint')}
        </p>
      ) : null}
    </div>
  )
}
