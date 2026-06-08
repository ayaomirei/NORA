'use client'

import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { MapLoadingFallback } from '@/components/map/MapLoadingFallback'
import { DayRouteCard } from '@/components/map/DayRouteCard'
import { MapGeolocateButton } from '@/components/map/MapGeolocateButton'
import { MapTopBar } from '@/components/map/MapTopBar'
import { PlannerHubPanel } from '@/components/map/PlannerHubPanel'
import { PlaceMapDialog } from '@/components/planner/PlaceMapDialog'
import { PlaceFeedbackPanel } from '@/components/planner/PlaceFeedbackPanel'
import type { DayRoute } from '@/lib/build-day-route'
import {
  getSavedRoutesLocalized,
  isDayRouteSaved,
  rehydrateDayRoute,
  removeSavedRoute,
  saveDayRoute,
  updateSavedRoute,
  type SavedDayRoute,
} from '@/lib/saved-routes-storage'
import type { MapSurfaceMarker } from '@/lib/map-marker'
import {
  applyPlaceCoordsToRoute,
  loadPlaceCoordinates,
} from '@/lib/place-coordinates'
import { useMapRoutePath } from '@/hooks/useMapRoutePath'
import { useUserGeolocation } from '@/hooks/useUserGeolocation'
import { GeolocationPermissionDialog } from '@/components/map/GeolocationPermissionDialog'
import {
  getGeoPermission,
  isGeoAllowed,
  setGeoPermission,
} from '@/lib/geo-permission'
import { useAuth } from '@/contexts/useAuth'
import { useI18n } from '@/hooks/useI18n'
import type { PlannerRecommendation } from '@/lib/planner-recommendations'
import { nudgeMapResize } from '@/lib/nudge-map-resize'
import { findRecommendation, loadVenueCatalog } from '@/lib/venue-catalog'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { motionGpuClass, spring, tween } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { MoodPreset } from '@/types/user'
import type { NoraMapHandle } from './map-types'

const ROUTE_MARKER_COLORS = ['#f59e0b', '#fb923c', '#fbbf24', '#a3e635'] as const

const MapCanvas = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
})

export default function MapHubClient() {
  const searchParams = useSearchParams()
  const plannerOpenDefault = searchParams?.get('planner') === 'open'
  const searchOpenDefault = searchParams?.get('search') === 'open'
  const routeOpenDefault = searchParams?.get('route') === 'open'
  const { user, updateProfile } = useAuth()
  const { locale, t } = useI18n()
  const mapRef = useRef<NoraMapHandle | null>(null)

  const nudgeMap = useCallback(() => {
    nudgeMapResize(mapRef.current as MapLibreMap | null)
  }, [])
  const focusPlaceRef = useRef<PlannerRecommendation | null>(null)
  const [mood, setMood] = useState<MoodPreset>(() => {
    const m = user?.initialMood
    if (m === 'calm' || m === 'energy' || m === 'tired' || m === 'anxious')
      return m
    return 'calm'
  })
  const [budgetIdx, setBudgetIdx] = useState(user?.dailyBudgetIndex ?? 1)
  const [statePanelOpen, setStatePanelOpen] = useState(false)
  const [focusPlaceId, setFocusPlaceId] = useState<string | null>(null)
  const [dayRoute, setDayRoute] = useState<DayRoute | null>(null)
  const [savedRoutes, setSavedRoutes] = useState<SavedDayRoute[]>([])
  const [dayRouteIsSaved, setDayRouteIsSaved] = useState(false)
  const [routeDirty, setRouteDirty] = useState(false)
  const [routeOpenTrigger, setRouteOpenTrigger] = useState(0)
  const [placeDetailOpen, setPlaceDetailOpen] = useState(false)
  const [placeCoordsEpoch, setPlaceCoordsEpoch] = useState(0)
  const [routeNavActive, setRouteNavActive] = useState(false)
  const routeNavEnteredRef = useRef(false)

  useEffect(() => {
    void Promise.all([loadPlaceCoordinates(), loadVenueCatalog()]).then(() => {
      setPlaceCoordsEpoch((n) => n + 1)
    })
  }, [])

  const focusPlace = useMemo(
    () => (focusPlaceId ? findRecommendation(focusPlaceId, locale) : null),
    [focusPlaceId, locale, placeCoordsEpoch],
  )

  useEffect(() => {
    focusPlaceRef.current = focusPlace
  }, [focusPlace])

  useEffect(() => {
    setDayRoute((route) => (route ? rehydrateDayRoute(route, locale) : null))
  }, [locale])

  useEffect(() => {
    if (!placeCoordsEpoch) return
    setDayRoute((route) => (route ? applyPlaceCoordsToRoute(route) : null))
  }, [placeCoordsEpoch])

  const markers = useMemo(() => {
    const out: MapSurfaceMarker[] = []
    if (dayRoute) {
      dayRoute.stops.forEach((stop, i) => {
        out.push({
          id: `route-${stop.id}`,
          lng: stop.lng,
          lat: stop.lat,
          color: ROUTE_MARKER_COLORS[i % ROUTE_MARKER_COLORS.length],
          label: i + 1,
          popup: {
            title: stop.title,
            subtitle: stop.place,
            detail: stop.duration,
          },
        })
      })
    } else if (focusPlace) {
      out.push({
        id: `plan-${focusPlace.id}`,
        lng: focusPlace.lng,
        lat: focusPlace.lat,
        color: '#f59e0b',
        popup: {
          title: focusPlace.title,
          subtitle: focusPlace.place,
          detail: focusPlace.badge,
        },
      })
    }
    return out
  }, [focusPlace, dayRoute, placeCoordsEpoch])

  const [geoPromptOpen, setGeoPromptOpen] = useState(false)

  useEffect(() => {
    if (getGeoPermission() === 'unset') setGeoPromptOpen(true)
  }, [])

  const geo = useUserGeolocation({
    mapRef: mapRef as RefObject<MapLibreMap | null>,
    autoStart: isGeoAllowed(),
    centerOnFirstFix: !routeNavActive,
    navigationMode: routeNavActive,
    navigationStops: dayRoute?.stops,
  })

  const handleGeoRecenter = useCallback(() => {
    if (!isGeoAllowed()) {
      setGeoPromptOpen(true)
      return 'warning' as const
    }
    return geo.recenter()
  }, [geo])

  const onAllowGeo = useCallback(() => {
    setGeoPermission('granted')
    setGeoPromptOpen(false)
    geo.startTracking()
  }, [geo])

  const onDenyGeo = useCallback(() => {
    setGeoPermission('denied')
    setGeoPromptOpen(false)
    geo.stopTracking()
  }, [geo])

  const routePath = useMapRoutePath(
    dayRoute?.stops,
    dayRoute && geo.snapshot ? geo.snapshot : null,
  )
  const userLocationOnMap = useMemo(() => {
    if (!geo.snapshot) return undefined
    return {
      lng: geo.snapshot.lng,
      lat: geo.snapshot.lat,
      accuracy: geo.snapshot.accuracy,
      heading: geo.snapshot.heading,
      avatarUrl: user?.avatarUrl ?? null,
      displayName: (user?.nickname || user?.name || '').trim(),
    }
  }, [
    geo.snapshot,
    user?.avatarUrl,
    user?.nickname,
    user?.name,
  ])

  const nudgeTimerRef = useRef<number | null>(null)
  const scheduleMapNudge = useCallback(() => {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current)
    nudgeTimerRef.current = window.setTimeout(() => {
      nudgeMap()
      nudgeTimerRef.current = null
    }, 200)
  }, [nudgeMap])

  useEffect(() => {
    return () => {
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!statePanelOpen) {
      scheduleMapNudge()
    }
  }, [statePanelOpen, scheduleMapNudge])

  const activeSavedRouteId = useMemo(() => {
    if (!dayRoute || !user?.id) return null
    const match = savedRoutes.find(
      (r) =>
        r.stops.length === dayRoute.stops.length &&
        r.stops.every((s, i) => s.id === dayRoute.stops[i]?.id),
    )
    return match?.id ?? null
  }, [dayRoute, savedRoutes, user?.id])

  useEffect(() => {
    if (!user?.id || !dayRoute) {
      setDayRouteIsSaved(false)
      return
    }
    void isDayRouteSaved(user.id, dayRoute).then(setDayRouteIsSaved)
  }, [user?.id, dayRoute, savedRoutes])

  const flyToPlace = useCallback(
    (rec: PlannerRecommendation) => {
      const map = mapRef.current
      if (!map) return
      map.flyTo({
        center: [rec.lng, rec.lat],
        zoom: routeNavActive ? 17.25 : 15.5,
        pitch: routeNavActive ? 58 : 52,
        bearing: map.getBearing(),
        duration: 1200,
      })
    },
    [routeNavActive],
  )

  const flyToRoute = useCallback(
    (route: DayRoute, origin?: { lng: number; lat: number } | null) => {
    const map = mapRef.current
    if (!map || !route.stops.length) return

    const valid = route.stops.filter(
      (s) => Number.isFinite(s.lng) && Number.isFinite(s.lat),
    )
    if (!valid.length) return

    const fitPoints = origin ? [origin, ...valid] : valid

    if (fitPoints.length === 1) {
      flyToPlace(valid[0]!)
      return
    }

    const lngs = fitPoints.map((s) => s.lng)
    const lats = fitPoints.map((s) => s.lat)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)

    if (minLng === maxLng && minLat === maxLat) {
      flyToPlace(valid[0]!)
      return
    }

    try {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 88, duration: 1400, pitch: 0, bearing: 0, maxZoom: 15.5 },
      )
    } catch {
      flyToPlace(valid[0]!)
    }
  },
    [flyToPlace],
  )

  const handleStartNavigation = useCallback(() => {
    if (!geo.hasLocation) {
      void geo.recenter()
      return
    }
    setRouteNavActive(true)
  }, [geo])

  const handleStopNavigation = useCallback(() => {
    setRouteNavActive(false)
    const map = mapRef.current
    if (map && geo.snapshot) {
      map.easeTo({
        center: [geo.snapshot.lng, geo.snapshot.lat],
        zoom: 16,
        pitch: 0,
        bearing: 0,
        duration: 900,
        padding: { top: 88, bottom: 128, left: 20, right: 20 },
      })
    }
  }, [geo.snapshot])

  useEffect(() => {
    if (!routeNavActive) {
      routeNavEnteredRef.current = false
      return
    }
    if (!geo.snapshot || routeNavEnteredRef.current) return
    routeNavEnteredRef.current = true
    geo.enterNavigation()
  }, [routeNavActive, geo.snapshot, geo.enterNavigation])

  const handleSelectPlace = useCallback(
    (rec: PlannerRecommendation) => {
      setDayRoute(null)
      setFocusPlaceId(rec.id)
      flyToPlace(rec)
    },
    [flyToPlace],
  )

  const handleRouteBuilt = useCallback(
    (route: DayRoute) => {
      setRouteNavActive(false)
      setDayRoute(route)
      setRouteDirty(false)
      setDayRouteIsSaved(false)
      setFocusPlaceId(null)
      focusPlaceRef.current = null
      flyToRoute(route, geo.snapshot)
    },
    [flyToRoute, geo.snapshot],
  )

  const handleSelectRouteStop = useCallback(
    (stopId: string) => {
      const stop = dayRoute?.stops.find((s) => s.id === stopId)
      if (!stop) return
      setFocusPlaceId(stop.id)
      flyToPlace(stop)
    },
    [dayRoute, flyToPlace],
  )

  const onMap = useCallback(
    (map: NoraMapHandle) => {
      mapRef.current = map
      geo.flushInitialCenter()
      const pending = focusPlaceRef.current
      if (pending) flyToPlace(pending)
    },
    [flyToPlace, geo.flushInitialCenter],
  )

  useEffect(() => {
    if (!user?.id) return
    const m = user.initialMood
    if (m === 'calm' || m === 'energy' || m === 'tired' || m === 'anxious') {
      setMood(m)
    }
    setBudgetIdx(user.dailyBudgetIndex)
  }, [user?.id, user?.initialMood, user?.dailyBudgetIndex])

  useEffect(() => {
    if (!user?.id) return
    const handle = window.setTimeout(() => {
      updateProfile({ initialMood: mood, dailyBudgetIndex: budgetIdx })
    }, 500)
    return () => window.clearTimeout(handle)
  }, [mood, budgetIdx, user?.id, updateProfile])

  useEffect(() => {
    if (!user?.id) {
      setSavedRoutes([])
      return
    }
    void getSavedRoutesLocalized(user.id, locale).then(setSavedRoutes)
  }, [user?.id, locale])

  useEffect(() => {
    if (!user?.id) return
    const refresh = () => {
      void getSavedRoutesLocalized(user.id, locale).then(setSavedRoutes)
    }
    window.addEventListener('nora-routes-change', refresh)
    return () => window.removeEventListener('nora-routes-change', refresh)
  }, [user?.id, locale])

  const handleRouteChange = useCallback((next: DayRoute) => {
    setRouteNavActive(false)
    setDayRoute(applyPlaceCoordsToRoute(next))
    setRouteDirty(true)
  }, [])

  const handleSaveDayRoute = useCallback(async () => {
    if (!user?.id || !dayRoute) return false
    if (dayRouteIsSaved) {
      await updateSavedRoute(user.id, dayRoute)
      const list = await getSavedRoutesLocalized(user.id, locale)
      setSavedRoutes(list)
      setRouteDirty(false)
      return true
    }
    const ok = await saveDayRoute(user.id, dayRoute)
    if (ok) {
      const list = await getSavedRoutesLocalized(user.id, locale)
      setSavedRoutes(list)
      setDayRouteIsSaved(true)
      setRouteDirty(false)
    }
    return ok
  }, [user?.id, dayRoute, dayRouteIsSaved, locale])

  const handleSelectSavedRoute = useCallback(
    (saved: SavedDayRoute) => {
      setRouteNavActive(false)
      const route = applyPlaceCoordsToRoute(rehydrateDayRoute(saved, locale))
      setDayRoute(route)
      setRouteDirty(false)
      setDayRouteIsSaved(true)
      setFocusPlaceId(null)
      focusPlaceRef.current = null
      window.requestAnimationFrame(() => {
        flyToRoute(route, geo.snapshot)
      })
    },
    [flyToRoute, locale, geo.snapshot],
  )

  const handleDeleteSavedRoute = useCallback(
    (routeId: string) => {
      if (!user?.id) return
      removeSavedRoute(user.id, routeId)
      if (dayRoute?.id === routeId) setDayRoute(null)
    },
    [user?.id, dayRoute?.id],
  )

  return (
    <>
      <MapCanvas
        onMap={onMap}
        markers={markers}
        routePath={routePath}
        userLocation={userLocationOnMap}
      />

      <MapGeolocateButton
        status={geo.status}
        hasLocation={geo.hasLocation}
        isLocating={geo.isLocating}
        onRecenter={handleGeoRecenter}
      />

      <GeolocationPermissionDialog
        open={geoPromptOpen}
        onOpenChange={setGeoPromptOpen}
        onAllow={onAllowGeo}
        onDeny={onDenyGeo}
      />

      <MapTopBar
        defaultSearchOpen={searchOpenDefault}
        defaultRouteOpen={routeOpenDefault}
        routeOpenTrigger={routeOpenTrigger}
        mood={mood}
        budgetIdx={budgetIdx}
        mbti={user?.mbti ?? ''}
        onMoodChange={setMood}
        onBudgetChange={setBudgetIdx}
        onRouteBuilt={handleRouteBuilt}
        onSelectPlace={handleSelectPlace}
        onOverlayChange={scheduleMapNudge}
      />

      <PlannerHubPanel
        mood={mood}
        onMoodChange={setMood}
        budgetIdx={budgetIdx}
        onBudgetChange={setBudgetIdx}
        mbti={user?.mbti ?? ''}
        defaultOpen={plannerOpenDefault}
        onOpenChange={setStatePanelOpen}
        onSelectPlace={handleSelectPlace}
        savedRoutes={user?.id ? savedRoutes : []}
        activeRouteId={user?.id ? activeSavedRouteId : null}
        onSelectSavedRoute={user?.id ? handleSelectSavedRoute : undefined}
        onDeleteSavedRoute={user?.id ? handleDeleteSavedRoute : undefined}
        onOpenRouteBuilder={
          user?.id
            ? () => setRouteOpenTrigger((n) => n + 1)
            : undefined
        }
      />

      <AnimatePresence>
        {dayRoute ? (
          <DayRouteCard
            key={dayRoute.id}
            route={dayRoute}
            onSelectStop={handleSelectRouteStop}
            onRouteChange={handleRouteChange}
            onSave={user?.id ? handleSaveDayRoute : undefined}
            isSaved={dayRouteIsSaved}
            hasUnsavedChanges={routeDirty}
            navigationActive={routeNavActive}
            canStartNavigation={geo.hasLocation}
            onStartNavigation={handleStartNavigation}
            onStopNavigation={handleStopNavigation}
            onClear={() => {
              setRouteNavActive(false)
              setDayRoute(null)
              setRouteDirty(false)
              setDayRouteIsSaved(false)
              setFocusPlaceId(null)
              focusPlaceRef.current = null
            }}
            className={cn(
              'fixed z-[25] w-full max-w-[min(20rem,92vw)]',
              statePanelOpen
                ? 'left-[max(0.5rem,env(safe-area-inset-left))] right-[max(calc(min(20rem,92vw)+0.75rem),env(safe-area-inset-right))]'
                : 'inset-x-[max(0.5rem,env(safe-area-inset-left))] mx-auto',
              'bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]',
            )}
          />
        ) : focusPlace ? (
          <motion.div
            key={`${focusPlace.id}-${locale}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={tween.medium}
            className={cn(
              'motion-gpu',
              motionGpuClass,
              'pointer-events-auto fixed z-[25] w-full max-w-[min(18rem,88vw)]',
              statePanelOpen
                ? 'left-[max(0.5rem,env(safe-area-inset-left))] right-[max(calc(min(20rem,92vw)+0.75rem),env(safe-area-inset-right))]'
                : 'inset-x-[max(0.5rem,env(safe-area-inset-left))] mx-auto',
              'bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]',
            )}
          >
            <div className="rounded-2xl border border-amber-400/40 bg-[var(--nora-surface-strong)] p-3 shadow-glass-lg backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                {t('planner.route')}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--nora-text)]">
                {focusPlace.title}
              </p>
              <p className="text-xs text-[var(--nora-text-muted)]">{focusPlace.place}</p>
              <div className="mt-2">
                <PlaceFeedbackPanel placeId={focusPlace.id} compact />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="text-xs font-medium text-sky-400 hover:underline"
                  onClick={() => setPlaceDetailOpen(true)}
                >
                  {t('places.details')}
                </button>
                <button
                  type="button"
                  className="text-xs text-[var(--nora-text-muted)] hover:text-[var(--nora-text)]"
                  onClick={() => {
                    focusPlaceRef.current = null
                    setFocusPlaceId(null)
                  }}
                >
                  {t('planner.hideMarker')}
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <PlaceMapDialog
        open={placeDetailOpen}
        onOpenChange={setPlaceDetailOpen}
        place={focusPlace}
      />
    </>
  )
}
