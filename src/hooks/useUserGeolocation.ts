'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import {
  NAV_CAMERA,
  pickNavigationTarget,
  resolveNavigationBearing,
} from '@/lib/navigation-camera'
import { isGeoAllowed, subscribeGeoPermission } from '@/lib/geo-permission'

export type UserGeoSnapshot = {
  lng: number
  lat: number
  accuracy?: number
  heading?: number | null
  speed?: number | null
  updatedAt: number
}

export type GeolocationStatus =
  | 'idle'
  | 'locating'
  | 'tracking'
  | 'denied'
  | 'timeout'
  | 'position_unavailable'
  | 'insecure'
  | 'unsupported'

export type RecenterResult = 'centered' | 'pending' | 'warning'

type Options = {
  mapRef: RefObject<MapLibreMap | null>
  /** Запустить watchPosition при монтировании */
  autoStart?: boolean
  /** Один раз центрировать карту на первой геопозиции (вид сверху) */
  centerOnFirstFix?: boolean
  /** Режим навигации: вид от 3-го лица, камера следует за пользователем */
  navigationMode?: boolean
  /** Остановки маршрута — для направления камеры */
  navigationStops?: readonly { lng: number; lat: number }[]
}

const WATCH_LOW_ACCURACY: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 10_000,
  timeout: 30_000,
}

const GET_LOW_ACCURACY: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 25_000,
}

const GET_HIGH_ACCURACY: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 12_000,
}

/** Точка в центре видимой области (между верхней панелью и нижним навбаром) */
const USER_VIEW_PADDING = {
  top: 88,
  bottom: 128,
  left: 20,
  right: 20,
} as const

const ERROR_STATUSES = new Set<GeolocationStatus>([
  'denied',
  'timeout',
  'position_unavailable',
  'insecure',
  'unsupported',
])

export function isGeolocationError(
  status: GeolocationStatus,
): status is Exclude<GeolocationStatus, 'idle' | 'locating' | 'tracking'> {
  return ERROR_STATUSES.has(status)
}

function readPosition(pos: GeolocationPosition): UserGeoSnapshot {
  const { longitude, latitude, accuracy, heading, speed } = pos.coords
  return {
    lng: longitude,
    lat: latitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
    heading:
      heading != null && Number.isFinite(heading) && heading >= 0
        ? heading
        : null,
    speed: speed != null && Number.isFinite(speed) ? speed : null,
    updatedAt: pos.timestamp,
  }
}

function mapGeoError(err: GeolocationPositionError): GeolocationStatus {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'denied'
    case err.POSITION_UNAVAILABLE:
      return 'position_unavailable'
    case err.TIMEOUT:
      return 'timeout'
    default:
      return 'position_unavailable'
  }
}

export function useUserGeolocation({
  mapRef,
  autoStart = false,
  centerOnFirstFix = false,
  navigationMode = false,
  navigationStops,
}: Options) {
  const [snapshot, setSnapshot] = useState<UserGeoSnapshot | null>(null)
  const [status, setStatus] = useState<GeolocationStatus>('idle')

  const watchIdRef = useRef<number | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triedLowAccuracyRef = useRef(false)
  const pendingRecenterRef = useRef(false)
  const initialCenterDoneRef = useRef(false)
  const pendingInitialCenterRef = useRef<UserGeoSnapshot | null>(null)
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot
  const statusRef = useRef(status)
  statusRef.current = status

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  const clearWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const centerMap = useCallback(
    (next: UserGeoSnapshot, animate = true) => {
      const map = mapRef.current
      if (!map) return

      const navTarget =
        navigationMode && navigationStops?.length
          ? pickNavigationTarget(next, navigationStops)
          : null

      const camera = navigationMode
        ? {
            center: [next.lng, next.lat] as [number, number],
            zoom: NAV_CAMERA.zoom,
            pitch: NAV_CAMERA.pitch,
            bearing: navTarget
              ? resolveNavigationBearing(
                  next,
                  navTarget,
                  map.getBearing(),
                )
              : map.getBearing(),
            padding: NAV_CAMERA.padding,
          }
        : {
            center: [next.lng, next.lat] as [number, number],
            zoom: Math.max(map.getZoom(), 18),
            pitch: map.getPitch(),
            bearing: map.getBearing(),
            padding: USER_VIEW_PADDING,
          }

      if (animate) {
        map.easeTo({ ...camera, duration: navigationMode ? 650 : 900 })
      } else {
        map.jumpTo(camera)
      }
    },
    [mapRef, navigationMode, navigationStops],
  )

  const tryInitialCenter = useCallback(
    (next: UserGeoSnapshot) => {
      if (navigationMode || !centerOnFirstFix || initialCenterDoneRef.current) {
        return false
      }
      const map = mapRef.current
      if (!map) {
        pendingInitialCenterRef.current = next
        return false
      }
      initialCenterDoneRef.current = true
      pendingInitialCenterRef.current = null
      centerMap(next, false)
      return true
    },
    [centerMap, centerOnFirstFix, mapRef, navigationMode],
  )

  const flushInitialCenter = useCallback(() => {
    if (initialCenterDoneRef.current) return
    const pending =
      pendingInitialCenterRef.current ?? snapshotRef.current ?? null
    if (pending) tryInitialCenter(pending)
  }, [tryInitialCenter])

  const applyFix = useCallback(
    (pos: GeolocationPosition, flyIfPending: boolean) => {
      const next = readPosition(pos)
      setSnapshot(next)
      setStatus('tracking')
      if (navigationMode) {
        centerMap(next, true)
      } else {
        tryInitialCenter(next)
      }
      if (flyIfPending && pendingRecenterRef.current) {
        pendingRecenterRef.current = false
        centerMap(next)
      }
    },
    [centerMap, tryInitialCenter, navigationMode],
  )

  const onPosition = useCallback(
    (pos: GeolocationPosition) => {
      applyFix(pos, true)
    },
    [applyFix],
  )

  const scheduleWatchRetry = useCallback(() => {
    clearRetry()
    retryTimerRef.current = setTimeout(() => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return
      if (statusRef.current === 'denied') return
      watchIdRef.current = navigator.geolocation.watchPosition(
        onPosition,
        (err) => {
          clearWatch()
          const code = mapGeoError(err)
          setStatus(code)
          if (code !== 'denied') scheduleWatchRetry()
        },
        WATCH_LOW_ACCURACY,
      )
    }, 4000)
  }, [clearRetry, clearWatch, onPosition])

  const beginWatch = useCallback(() => {
    clearWatch()
    watchIdRef.current = navigator.geolocation.watchPosition(
      onPosition,
      (err) => {
        clearWatch()
        const code = mapGeoError(err)
        setStatus(code)
        if (code !== 'denied') scheduleWatchRetry()
      },
      WATCH_LOW_ACCURACY,
    )
  }, [clearWatch, onPosition, scheduleWatchRetry])

  const onFirstFix = useCallback(
    (pos: GeolocationPosition) => {
      applyFix(pos, true)
      beginWatch()
    },
    [applyFix, beginWatch],
  )

  const requestPosition = useCallback(
    (options: PositionOptions) => {
      navigator.geolocation.getCurrentPosition(
        onFirstFix,
        (err) => {
          const code = mapGeoError(err)
          if (
            !triedLowAccuracyRef.current &&
            (code === 'timeout' || code === 'position_unavailable')
          ) {
            triedLowAccuracyRef.current = true
            requestPosition(GET_LOW_ACCURACY)
            return
          }
          setStatus(code)
          if (code !== 'denied') scheduleWatchRetry()
        },
        options,
      )
    },
    [onFirstFix, scheduleWatchRetry],
  )

  const stopTracking = useCallback(() => {
    clearWatch()
    clearRetry()
    triedLowAccuracyRef.current = false
    pendingRecenterRef.current = false
    setSnapshot(null)
    setStatus('idle')
  }, [clearRetry, clearWatch])

  const startTracking = useCallback(() => {
    if (!isGeoAllowed()) {
      stopTracking()
      return
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported')
      return
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setStatus('insecure')
      return
    }

    clearWatch()
    clearRetry()
    triedLowAccuracyRef.current = false
    setStatus('locating')

    requestPosition(GET_HIGH_ACCURACY)
  }, [clearRetry, clearWatch, requestPosition, stopTracking])

  const recenter = useCallback((): RecenterResult => {
    const current = snapshotRef.current
    if (current) {
      pendingRecenterRef.current = false
      centerMap(current)
      return 'centered'
    }

    if (isGeolocationError(status)) {
      return 'warning'
    }

    pendingRecenterRef.current = true
    if (status === 'idle') startTracking()
    return 'pending'
  }, [centerMap, startTracking, status])

  useEffect(() => {
    if (!autoStart || !isGeoAllowed()) return
    startTracking()
    return () => {
      clearWatch()
      clearRetry()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- один запуск при монтировании
  }, [autoStart])

  useEffect(() => {
    return subscribeGeoPermission(() => {
      if (isGeoAllowed()) {
        if (
          statusRef.current === 'idle' ||
          statusRef.current === 'denied'
        ) {
          startTracking()
        }
      } else {
        stopTracking()
      }
    })
  }, [startTracking, stopTracking])

  return {
    snapshot,
    status,
    isLocating: status === 'locating',
    hasLocation: snapshot != null,
    recenter,
    startTracking,
    stopTracking,
    flushInitialCenter,
  }
}
